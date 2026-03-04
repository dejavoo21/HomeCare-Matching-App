// ============================================================================
// REQUEST SERVICE
// ============================================================================
// Business logic for care request handling

import { CareRequest, VisitStatus, CareVisit } from '../types/index';
import { careRequestRepository } from '../repositories/care-request.repository';
import { careVisitRepository } from '../repositories/care-visit.repository';
import { v4 as uuidv4 } from 'uuid';

export class RequestService {
  /**
   * Create a new care request
   */
  createRequest(
    clientId: string,
    serviceType: string,
    description: string,
    address: string,
    scheduledDateTime: Date,
    urgency: string,
    medication?: string
  ): CareRequest {
    const request: CareRequest = {
      id: uuidv4(),
      clientId,
      serviceType: serviceType as any,
      medication,
      description,
      address,
      scheduledDateTime,
      urgency: urgency as any,
      status: VisitStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return careRequestRepository.create(request);
  }

  /**
   * Get all requests for a client
   */
  getClientRequests(clientId: string): CareRequest[] {
    return careRequestRepository.findByClient(clientId);
  }

  /**
   * Get all requests
   */
  getAllRequests(): CareRequest[] {
    return careRequestRepository.findAll();
  }

  /**
   * Get request details
   */
  getRequestDetails(requestId: string): CareRequest | undefined {
    return careRequestRepository.findById(requestId);
  }

  /**
   * Assign professional to request and create visit
   */
  assignProfessional(
    requestId: string,
    professionalId: string
  ): CareRequest | null {
    const request = careRequestRepository.findById(requestId);
    if (!request) return null;

    const updatedRequest = careRequestRepository.update(requestId, {
      assignedProfessionalId: professionalId,
      status: VisitStatus.ASSIGNED,
    });

    // Create associated visit record
    if (updatedRequest) {
      const visit: CareVisit = {
        id: uuidv4(),
        requestId,
        clientId: request.clientId,
        professionalId,
        status: VisitStatus.ASSIGNED,
        scheduledDateTime: request.scheduledDateTime,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      careVisitRepository.create(visit);
    }

    return updatedRequest;
  }

  /**
   * Update request status
   */
  updateRequestStatus(
    requestId: string,
    status: VisitStatus
  ): CareRequest | null {
    return careRequestRepository.update(requestId, { status });
  }

  /**
   * Cancel a request
   */
  cancelRequest(requestId: string): CareRequest | null {
    return careRequestRepository.update(requestId, {
      status: VisitStatus.CANCELLED,
      assignedProfessionalId: undefined,
    });
  }
}

export const requestService = new RequestService();
