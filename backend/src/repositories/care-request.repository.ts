// ============================================================================
// CARE REQUEST REPOSITORY
// ============================================================================
// Data access layer for care request operations

import { CareRequest, VisitStatus } from '../types/index';
import { dataStore } from '../store/index';

export class CareRequestRepository {
  create(request: CareRequest): CareRequest {
    return dataStore.createCareRequest(request);
  }

  findById(id: string): CareRequest | undefined {
    return dataStore.getCareRequestById(id);
  }

  findByClient(clientId: string): CareRequest[] {
    return dataStore.getCareRequestsByClient(clientId);
  }

  findAll(): CareRequest[] {
    return dataStore.getAllCareRequests();
  }

  findByStatus(status: VisitStatus): CareRequest[] {
    return dataStore.getCareRequestsByStatus(status);
  }

  update(id: string, updates: Partial<CareRequest>): CareRequest | null {
    return dataStore.updateCareRequest(id, updates);
  }
}

export const careRequestRepository = new CareRequestRepository();
