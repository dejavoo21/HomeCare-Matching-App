// ============================================================================
// CARE VISIT REPOSITORY
// ============================================================================
// Data access layer for care visit operations

import { CareVisit } from '../types/index';
import { dataStore } from '../store/index';

export class CareVisitRepository {
  create(visit: CareVisit): CareVisit {
    return dataStore.createCareVisit(visit);
  }

  findById(id: string): CareVisit | undefined {
    return dataStore.getCareVisitById(id);
  }

  findByProfessional(professionalId: string): CareVisit[] {
    return dataStore.getCareVisitsByProfessional(professionalId);
  }

  findByClient(clientId: string): CareVisit[] {
    return dataStore.getCareVisitsByClient(clientId);
  }

  update(id: string, updates: Partial<CareVisit>): CareVisit | null {
    return dataStore.updateCareVisit(id, updates);
  }
}

export const careVisitRepository = new CareVisitRepository();
