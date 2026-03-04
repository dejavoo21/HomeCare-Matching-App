// ============================================================================
// FHIR R4 VALIDATION SERVICE
// ============================================================================

/**
 * FHIR R4 resource validator
 * Validates incoming FHIR resources before persisting
 * 
 * Note: Full FHIR R4 validation requires the complete FHIR StructureDefinition library.
 * This provides basic validation with common constraints.
 * For production, consider using:
 * - Validific (https://www.npmjs.com/package/validific)
 * - FHIR Validator (https://github.com/hapifhir/org.hl7.fhir.core)
 * - HL7 Validator (https://confluence.hl7.org/display/FHIR/Using+the+FHIR+Validator)
 */

export interface FhirValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface FhirValidationResult {
  valid: boolean;
  errors: FhirValidationError[];
}

/**
 * Validate Patient resource (FHIR R4)
 * https://www.hl7.org/fhir/patient.html
 */
export function validatePatient(resource: any): FhirValidationResult {
  const errors: FhirValidationError[] = [];

  if (!resource.resourceType || resource.resourceType !== 'Patient') {
    errors.push({
      path: 'resourceType',
      message: 'resourceType must be "Patient"',
      severity: 'error',
    });
  }

  if (!resource.identifier || !Array.isArray(resource.identifier) || resource.identifier.length === 0) {
    errors.push({
      path: 'identifier',
      message: 'At least one identifier is required',
      severity: 'error',
    });
  }

  if (!resource.name || !Array.isArray(resource.name)) {
    errors.push({
      path: 'name',
      message: 'Patient must have at least one name',
      severity: 'error',
    });
  } else {
    for (let i = 0; i < resource.name.length; i++) {
      const nameItem = resource.name[i];
      if (!nameItem.given && !nameItem.family) {
        errors.push({
          path: `name[${i}]`,
          message: 'Name must have either given or family',
          severity: 'error',
        });
      }
    }
  }

  if (resource.telecom && Array.isArray(resource.telecom)) {
    for (let i = 0; i < resource.telecom.length; i++) {
      const telecom = resource.telecom[i];
      if (!['phone', 'fax', 'email', 'pager', 'url', 'sms'].includes(telecom.system)) {
        errors.push({
          path: `telecom[${i}].system`,
          message: 'Invalid telecom system',
          severity: 'warning',
        });
      }
    }
  }

  if (resource.gender && !['male', 'female', 'other', 'unknown'].includes(resource.gender)) {
    errors.push({
      path: 'gender',
      message: 'Invalid gender value',
      severity: 'warning',
    });
  }

  if (resource.birthDate && !isValidDate(resource.birthDate)) {
    errors.push({
      path: 'birthDate',
      message: 'Invalid date format (expected YYYY-MM-DD)',
      severity: 'error',
    });
  }

  if (resource.address && Array.isArray(resource.address)) {
    for (const addr of resource.address) {
      if (addr.use && !['home', 'work', 'temp', 'old', 'billing'].includes(addr.use)) {
        errors.push({
          path: 'address.use',
          message: 'Invalid address use type',
          severity: 'warning',
        });
      }
    }
  }

  return {
    valid: errors.filter((e) => e.severity === 'error').length === 0,
    errors,
  };
}

/**
 * Validate ServiceRequest resource (FHIR R4)
 * https://www.hl7.org/fhir/servicerequest.html
 */
export function validateServiceRequest(resource: any): FhirValidationResult {
  const errors: FhirValidationError[] = [];

  if (!resource.resourceType || resource.resourceType !== 'ServiceRequest') {
    errors.push({
      path: 'resourceType',
      message: 'resourceType must be "ServiceRequest"',
      severity: 'error',
    });
  }

  if (!resource.status || !['draft', 'active', 'on-hold', 'revoked', 'completed', 'entered-in-error'].includes(resource.status)) {
    errors.push({
      path: 'status',
      message: 'status is required and must be a valid code',
      severity: 'error',
    });
  }

  if (!resource.intent || !['proposal', 'plan', 'directive', 'order', 'original-order', 'reflex-order'].includes(resource.intent)) {
    errors.push({
      path: 'intent',
      message: 'intent is required and must be a valid code',
      severity: 'error',
    });
  }

  if (!resource.code) {
    errors.push({
      path: 'code',
      message: 'code is required (what service is requested)',
      severity: 'error',
    });
  } else if (!resource.code.coding || resource.code.coding.length === 0) {
    errors.push({
      path: 'code.coding',
      message: 'code must have at least one coding',
      severity: 'error',
    });
  }

  if (!resource.subject) {
    errors.push({
      path: 'subject',
      message: 'subject (patient) is required',
      severity: 'error',
    });
  }

  if (!resource.authoredOn || !isValidDateTime(resource.authoredOn)) {
    errors.push({
      path: 'authoredOn',
      message: 'authoredOn must be a valid datetime',
      severity: 'error',
    });
  }

  if (resource.priority && !['routine', 'urgent', 'asap', 'stat'].includes(resource.priority)) {
    errors.push({
      path: 'priority',
      message: 'Invalid priority code',
      severity: 'warning',
    });
  }

  return {
    valid: errors.filter((e) => e.severity === 'error').length === 0,
    errors,
  };
}

/**
 * Generic FHIR resource validator
 * Routes to specific validators based on resourceType
 */
export function validateFhirResource(resource: any): FhirValidationResult {
  if (!resource || typeof resource !== 'object') {
    return {
      valid: false,
      errors: [
        {
          path: 'root',
          message: 'Resource must be a valid JSON object',
          severity: 'error',
        },
      ],
    };
  }

  const resourceType = resource.resourceType;

  switch (resourceType) {
    case 'Patient':
      return validatePatient(resource);
    case 'ServiceRequest':
      return validateServiceRequest(resource);
    default:
      return {
        valid: false,
        errors: [
          {
            path: 'resourceType',
            message: `Unknown or unsupported resourceType: ${resourceType}`,
            severity: 'error',
          },
        ],
      };
  }
}

/**
 * Helper: Validate FHIR date format (YYYY-MM-DD)
 */
function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Helper: Validate FHIR dateTime format (ISO 8601)
 */
function isValidDateTime(dateTimeString: string): boolean {
  try {
    const date = new Date(dateTimeString);
    return date instanceof Date && !isNaN(date.getTime());
  } catch {
    return false;
  }
}

/**
 * Convert validation errors to FHIR OperationOutcome response
 */
export function createOperationOutcome(errors: FhirValidationError[]): any {
  return {
    resourceType: 'OperationOutcome',
    issue: errors.map((error) => ({
      severity: error.severity,
      code: error.severity === 'error' ? 'invalid' : 'structure',
      location: [error.path],
      diagnostics: error.message,
    })),
  };
}
