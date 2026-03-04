// ============================================================================
// MATCHING SCORING ENGINE
// ============================================================================
// Calculates match scores based on weighted factors

import { Pool } from 'pg';

export interface ScoreBreakdown {
  distance: number;
  availability: number;
  workload: number;
  urgencyBoost: number;
  verification: number;
  total: number;
}

export interface ScoringRules {
  distanceWeight: number;
  availabilityWeight: number;
  workloadWeight: number;
  urgencyBoostWeight: number;
  verificationWeight: number;
}

// ============================================================================
// DEFAULT SCORING RULES
// ============================================================================

export const defaultRules: ScoringRules = {
  distanceWeight: 20,
  availabilityWeight: 25,
  workloadWeight: 20,
  urgencyBoostWeight: 15,
  verificationWeight: 10,
};

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

export async function calculateScore(
  pool: Pool,
  requestId: string,
  professionalId: string,
  rules: ScoringRules = defaultRules,
  activeCount: number = 0
): Promise<ScoreBreakdown> {
  const distances = await scoreDistance(pool, requestId, professionalId, rules);
  const availability = await scoreAvailability(pool, requestId, professionalId, rules);
  const workload = scoreWorkloadNormalized(activeCount, rules);
  const verification = await scoreVerification(pool, professionalId, rules);
  const urgencyBoost = await scoreUrgencyBoost(pool, requestId, professionalId, rules);

  return {
    distance: distances,
    availability,
    workload,
    urgencyBoost,
    verification,
    total: distances + availability + workload + urgencyBoost + verification,
  };
}

async function scoreDistance(
  pool: Pool,
  requestId: string,
  professionalId: string,
  rules: ScoringRules
): Promise<number> {
  try {
    // Fetch request location
    const request = await pool.query(
      'SELECT lat, lng FROM care_requests WHERE id = $1',
      [requestId]
    );

    // Fetch professional location
    const professional = await pool.query(
      'SELECT pp.base_lat, pp.base_lng, pp.service_radius_km FROM professional_profiles pp WHERE pp.user_id = $1',
      [professionalId]
    );

    if (request.rows.length === 0 || professional.rows.length === 0) {
      return 0;
    }

    const reqLat = request.rows[0].lat;
    const reqLng = request.rows[0].lng;
    const profLat = professional.rows[0].base_lat;
    const profLng = professional.rows[0].base_lng;
    const radius = professional.rows[0].service_radius_km;

    // If coordinates missing, neutral score
    if (!reqLat || !reqLng || !profLat || !profLng) {
      return rules.distanceWeight / 2;
    }

    // Simple distance calculation (not geodesic, but OK for MVP)
    const latDiff = Math.abs(parseFloat(reqLat) - parseFloat(profLat));
    const lngDiff = Math.abs(parseFloat(reqLng) - parseFloat(profLng));
    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

    // Convert to rough km (very rough)
    const distanceKm = distance * 111; // ~111 km per degree

    // Score: full points if within radius, then decay
    if (distanceKm <= radius) {
      return rules.distanceWeight * (1 - distanceKm / radius / 2);
    } else {
      return 0;
    }
  } catch (err) {
    console.error('Error calculating distance score:', err);
    return 0;
  }
}

async function scoreAvailability(
  pool: Pool,
  requestId: string,
  professionalId: string,
  rules: ScoringRules
): Promise<number> {
  try {
    const request = await pool.query(
      'SELECT preferred_start FROM care_requests WHERE id = $1',
      [requestId]
    );

    if (request.rows.length === 0) return 0;

    const preferredStart = new Date(request.rows[0].preferred_start);
    const dayOfWeek = preferredStart.getDay();
    const hour = preferredStart.getHours();

    // Check if professional has availability rule for this day
    const rules_result = await pool.query(
      `SELECT start_time, end_time FROM availability_rules
       WHERE user_id = $1 AND day_of_week = $2`,
      [professionalId, dayOfWeek]
    );

    if (rules_result.rows.length === 0) return 0;

    // Score based on how close to the preferred time
    const rule = rules_result.rows[0];
    const [startHour] = rule.start_time.split(':').map(Number);
    const [endHour] = rule.end_time.split(':').map(Number);

    // Full score if hour is in the middle of their work window
    const windowMid = (startHour + endHour) / 2;
    const diffFromMid = Math.abs(hour - windowMid);
    const windowWidth = endHour - startHour;

    const availabilityScore =
      rules.availabilityWeight * Math.max(0, 1 - diffFromMid / windowWidth);

    return availabilityScore;
  } catch (err) {
    console.error('Error calculating availability score:', err);
    return 0;
  }
}

// Normalize workload to 0-100 score based on active visit count
// 0 visits => 100pts, 1 => 85, 2 => 70, 3 => 55, 4+ => 40 (floor)
function scoreWorkloadNormalized(
  activeCount: number,
  rules: ScoringRules
): number {
  let normalizedScore: number;

  if (activeCount <= 0) {
    normalizedScore = 100;
  } else if (activeCount === 1) {
    normalizedScore = 85;
  } else if (activeCount === 2) {
    normalizedScore = 70;
  } else if (activeCount === 3) {
    normalizedScore = 55;
  } else {
    normalizedScore = 40;
  }

  // Convert to weighted score (0-100 → 0-weight)
  return (normalizedScore / 100) * rules.workloadWeight;
}

async function scoreWorkload(
  pool: Pool,
  professionalId: string,
  rules: ScoringRules
): Promise<number> {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) FROM visits WHERE professional_id = $1 AND status IN ('accepted', 'enroute')`,
      [professionalId]
    );

    const activeCount = parseInt(result.rows[0].count, 10);
    const maxConcurrent = 5;

    // Score: full points if 0 active, decay to 0 at max
    const workloadScore =
      rules.workloadWeight * Math.max(0, 1 - activeCount / maxConcurrent);

    return workloadScore;
  } catch (err) {
    console.error('Error calculating workload score:', err);
    return 0;
  }
}

async function scoreVerification(
  pool: Pool,
  professionalId: string,
  rules: ScoringRules
): Promise<number> {
  try {
    const result = await pool.query(
      'SELECT verified FROM professional_profiles WHERE user_id = $1',
      [professionalId]
    );

    if (result.rows.length === 0) return 0;

    const verified = result.rows[0].verified;
    return verified ? rules.verificationWeight : 0;
  } catch (err) {
    console.error('Error calculating verification score:', err);
    return 0;
  }
}

async function scoreUrgencyBoost(
  pool: Pool,
  requestId: string,
  professionalId: string,
  rules: ScoringRules
): Promise<number> {
  try {
    const request = await pool.query(
      'SELECT urgency FROM care_requests WHERE id = $1',
      [requestId]
    );

    const professional = await pool.query(
      'SELECT u.role FROM users u WHERE u.id = $1',
      [professionalId]
    );

    if (request.rows.length === 0 || professional.rows.length === 0) {
      return 0;
    }

    const urgency = request.rows[0].urgency;
    const role = professional.rows[0].role;

    // Critical/high cases prefer doctors
    if ((urgency === 'critical' || urgency === 'high') && role === 'doctor') {
      return rules.urgencyBoostWeight;
    }

    return 0;
  } catch (err) {
    console.error('Error calculating urgency boost:', err);
    return 0;
  }
}
