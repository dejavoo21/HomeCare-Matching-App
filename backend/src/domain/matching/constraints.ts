// ============================================================================
// MATCHING CONSTRAINTS
// ============================================================================
// Business rules that must be satisfied for a professional to be eligible
// for a care request

import { Pool } from 'pg';

export interface ConstraintViolation {
  passed: boolean;
  rule: string;
  details?: string;
}

export async function checkConstraints(
  pool: Pool,
  requestId: string,
  professionalId: string
): Promise<ConstraintViolation[]> {
  const violations: ConstraintViolation[] = [];

  // 1. Check professional role matches service type
  const roleCheck = await checkRoleMatch(pool, requestId, professionalId);
  violations.push(roleCheck);

  // 2. Check professional is verified if urgency is high/critical
  const verificationCheck = await checkVerification(
    pool,
    requestId,
    professionalId
  );
  violations.push(verificationCheck);

  // 3. Check availability window overlap
  const availabilityCheck = await checkAvailability(
    pool,
    requestId,
    professionalId
  );
  violations.push(availabilityCheck);

  // 4. Check workload (optional soft constraint, but essential)
  const workloadCheck = await checkWorkload(pool, professionalId);
  violations.push(workloadCheck);

  return violations;
}

async function checkRoleMatch(
  pool: Pool,
  requestId: string,
  professionalId: string
): Promise<ConstraintViolation> {
  try {
    const request = await pool.query(
      'SELECT service_type FROM care_requests WHERE id = $1',
      [requestId]
    );

    const professional = await pool.query(
      'SELECT u.role FROM users u WHERE u.id = $1',
      [professionalId]
    );

    if (request.rows.length === 0 || professional.rows.length === 0) {
      return { passed: false, rule: 'ROLE_MATCH', details: 'Request or professional not found' };
    }

    const serviceType = request.rows[0].service_type;
    const role = professional.rows[0].role;

    // Simple mapping: most services can be done by nurses, but some need doctors
    const doctorOnlyServices = ['prescription_review', 'diagnosis'];
    const needsDoctor = doctorOnlyServices.includes(serviceType);

    const passed = needsDoctor ? role === 'doctor' : role === 'doctor' || role === 'nurse';

    return {
      passed,
      rule: 'ROLE_MATCH',
      details: passed ? `Role ${role} suitable for ${serviceType}` : `${role} cannot provide ${serviceType}`,
    };
  } catch (err) {
    return { passed: false, rule: 'ROLE_MATCH', details: String(err) };
  }
}

async function checkVerification(
  pool: Pool,
  requestId: string,
  professionalId: string
): Promise<ConstraintViolation> {
  try {
    const request = await pool.query(
      'SELECT urgency FROM care_requests WHERE id = $1',
      [requestId]
    );

    if (request.rows.length === 0) {
      return { passed: false, rule: 'VERIFICATION', details: 'Request not found' };
    }

    const urgency = request.rows[0].urgency;
    const needsVerification = ['high', 'critical'].includes(urgency);

    if (!needsVerification) {
      return { passed: true, rule: 'VERIFICATION', details: 'No verification required' };
    }

    const professional = await pool.query(
      'SELECT verified FROM professional_profiles WHERE user_id = $1',
      [professionalId]
    );

    if (professional.rows.length === 0) {
      return { passed: false, rule: 'VERIFICATION', details: 'Professional profile not found' };
    }

    const verified = professional.rows[0].verified;
    return {
      passed: verified,
      rule: 'VERIFICATION',
      details: verified ? 'Professional verified' : 'Professional not verified for urgent cases',
    };
  } catch (err) {
    return { passed: false, rule: 'VERIFICATION', details: String(err) };
  }
}

async function checkAvailability(
  pool: Pool,
  requestId: string,
  professionalId: string
): Promise<ConstraintViolation> {
  try {
    const request = await pool.query(
      'SELECT preferred_start, preferred_end FROM care_requests WHERE id = $1',
      [requestId]
    );

    if (request.rows.length === 0) {
      return { passed: false, rule: 'AVAILABILITY', details: 'Request not found' };
    }

    const { preferred_start, preferred_end } = request.rows[0];
    const startDate = new Date(preferred_start);
    const dayOfWeek = startDate.getDay();
    const hour = startDate.getHours();

    // Check recurring rules
    const rules = await pool.query(
      `SELECT start_time, end_time FROM availability_rules
       WHERE user_id = $1 AND day_of_week = $2`,
      [professionalId, dayOfWeek]
    );

    let hasAvailability = false;

    for (const rule of rules.rows) {
      const [startHour] = rule.start_time.split(':').map(Number);
      const [endHour] = rule.end_time.split(':').map(Number);

      if (hour >= startHour && hour < endHour) {
        hasAvailability = true;
        break;
      }
    }

    // Check exceptions
    if (!hasAvailability) {
      const exceptions = await pool.query(
        `SELECT * FROM availability_exceptions
         WHERE user_id = $1 AND exception_date = $2 AND exception_type = 'available_override'`,
        [professionalId, startDate.toISOString().split('T')[0]]
      );

      if (exceptions.rows.length > 0) {
        hasAvailability = true;
      }
    }

    return {
      passed: hasAvailability,
      rule: 'AVAILABILITY',
      details: hasAvailability ? 'Available in requested window' : 'Not available in requested window',
    };
  } catch (err) {
    return { passed: false, rule: 'AVAILABILITY', details: String(err) };
  }
}

async function checkWorkload(
  pool: Pool,
  professionalId: string
): Promise<ConstraintViolation> {
  try {
    const active = await pool.query(
      `SELECT COUNT(*) FROM visits WHERE professional_id = $1 AND status IN ('accepted', 'enroute')`,
      [professionalId]
    );

    const activeCount = parseInt(active.rows[0].count, 10);
    // Soft constraint: professional can handle up to 5 concurrent visits
    const canHandle = activeCount < 5;

    return {
      passed: canHandle,
      rule: 'WORKLOAD',
      details: `Currently assigned to ${activeCount} active visit(s)`,
    };
  } catch (err) {
    return { passed: false, rule: 'WORKLOAD', details: String(err) };
  }
}
