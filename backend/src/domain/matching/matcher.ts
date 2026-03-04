// ============================================================================
// MATCHING ENGINE
// ============================================================================
// Orchestrates constraint checking and scoring to find best match

import { Pool } from 'pg';
import { checkConstraints } from './constraints';
import { calculateScore, ScoreBreakdown, ScoringRules, defaultRules } from './scoring';

export interface MatchCandidate {
  professionalId: string;
  name: string;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  constraintsPassed: boolean;
  constraintDetails: string[];
  reasons: string[];
}

export interface MatchResult {
  requestId: string;
  candidates: MatchCandidate[];
  topCandidate: MatchCandidate | null;
}

export async function findMatches(
  pool: Pool,
  requestId: string,
  scoringRules: ScoringRules = defaultRules
): Promise<MatchResult> {
  try {
    // Get all active healthcare professionals (exclude those who already declined)
    // Include active visit count for workload-based scoring
    const professionals = await pool.query(
      `SELECT u.id, u.name,
              COALESCE(active.active_count, 0) AS active_count
       FROM users u
       LEFT JOIN (
         SELECT professional_id, COUNT(*) AS active_count
         FROM visits
         WHERE status IN ('assigned','accepted','en_route')
         GROUP BY professional_id
       ) active ON active.professional_id = u.id
       WHERE u.role IN ('doctor', 'nurse') AND u.is_active = true
       AND u.id NOT IN (
         SELECT professional_id
         FROM visit_assignments
         WHERE request_id = $1
           AND declined_at IS NOT NULL
       )
       ORDER BY active_count ASC, u.name ASC`,
      [requestId]
    );

    if (professionals.rows.length === 0) {
      return {
        requestId,
        candidates: [],
        topCandidate: null,
      };
    }

    const candidates: MatchCandidate[] = [];

    for (const prof of professionals.rows) {
      // Check constraints
      const constraints = await checkConstraints(pool, requestId, prof.id);
      const allConstraintsPassed = constraints.every((c) => c.passed);

      if (!allConstraintsPassed) {
        // Skip if constraints not met
        continue;
      }

      // Calculate score (pass active_count for workload scoring)
      const scoreBreakdown = await calculateScore(
        pool,
        requestId,
        prof.id,
        scoringRules,
        prof.active_count
      );

      // Build reasons (include workload context)
      const reasons = buildReasons(constraints, scoreBreakdown, prof.active_count);

      candidates.push({
        professionalId: prof.id,
        name: prof.name,
        score: scoreBreakdown.total,
        scoreBreakdown,
        constraintsPassed: true,
        constraintDetails: constraints
          .filter((c) => !c.passed)
          .map((c) => c.details || c.rule),
        reasons,
      });
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    return {
      requestId,
      candidates: candidates.slice(0, 5), // Return top 5
      topCandidate: candidates.length > 0 ? candidates[0] : null,
    };
  } catch (err) {
    console.error('Error finding matches:', err);
    return {
      requestId,
      candidates: [],
      topCandidate: null,
    };
  }
}

function buildReasons(constraints: any, scoreBreakdown: ScoreBreakdown, activeCount: number = 0): string[] {
  const reasons: string[] = [];

  // Positive constraints
  constraints.forEach((c: any) => {
    if (c.passed && c.details) {
      reasons.push(`✓ ${c.details}`);
    }
  });

  // Add workload context
  if (activeCount === 0) {
    reasons.push('👤 No active visits (fastest availability)');
  } else if (activeCount === 1) {
    reasons.push('👥 Light workload (1 active visit)');
  } else if (activeCount >= 3) {
    reasons.push(`⚠️ High workload (${activeCount} active visits)`);
  }

  // Scoring contributions
  if (scoreBreakdown.distance > 0) {
    reasons.push(
      `📍 Distance: ${scoreBreakdown.distance.toFixed(1)} pts`
    );
  }
  if (scoreBreakdown.availability > 0) {
    reasons.push(
      `📅 Availability: ${scoreBreakdown.availability.toFixed(1)} pts`
    );
  }
  if (scoreBreakdown.workload > 0) {
    reasons.push(`💼 Workload score: ${scoreBreakdown.workload.toFixed(1)} pts`);
  }
  if (scoreBreakdown.urgencyBoost > 0) {
    reasons.push(`⚡ Urgency boost: ${scoreBreakdown.urgencyBoost.toFixed(1)} pts`);
  }
  if (scoreBreakdown.verification > 0) {
    reasons.push(`✔️ Verified: ${scoreBreakdown.verification.toFixed(1)} pts`);
  }

  return reasons;
}
