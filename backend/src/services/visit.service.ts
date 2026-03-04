// ============================================================================
// VISIT SERVICE
// ============================================================================
// Business logic for care visit handling

import { CareVisit, VisitStatus } from '../types/index';
import { careVisitRepository } from '../repositories/care-visit.repository';

export class VisitService {
  /**
   * Get all visits for a professional
   */
  getProfessionalVisits(professionalId: string): CareVisit[] {
    return careVisitRepository.findByProfessional(professionalId);
  }

  /**
   * Get all visits for a client
   */
  getClientVisits(clientId: string): CareVisit[] {
    return careVisitRepository.findByClient(clientId);
  }

  /**
   * Get visit details
   */
  getVisitDetails(visitId: string): CareVisit | undefined {
    return careVisitRepository.findById(visitId);
  }

  /**
   * Professional accepts a visit
   */
  acceptVisit(visitId: string): CareVisit | null {
    return careVisitRepository.update(visitId, {
      status: VisitStatus.ACCEPTED,
    });
  }

  /**
   * Mark visit as en route
   */
  markEnRoute(visitId: string): CareVisit | null {
    return careVisitRepository.update(visitId, {
      status: VisitStatus.EN_ROUTE,
    });
  }

  /**
   * Complete a visit
   */
  completeVisit(visitId: string, notes?: string): CareVisit | null {
    return careVisitRepository.update(visitId, {
      status: VisitStatus.COMPLETED,
      completedDateTime: new Date(),
      notes,
    });
  }

  /**
   * Cancel a visit
   */
  cancelVisit(visitId: string): CareVisit | null {
    return careVisitRepository.update(visitId, {
      status: VisitStatus.CANCELLED,
    });
  }
}

export const visitService = new VisitService();
