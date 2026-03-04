// ============================================================================
// IN-MEMORY DATA STORE
// ============================================================================
// Temporary storage solution. In production, replace with PostgreSQL/MongoDB.

import {
  User,
  CareRequest,
  CareVisit,
  AvailabilityWindow,
  HealthcareProfessional,
  Client,
  UserRole,
  ServiceType,
  UrgencyLevel,
  VisitStatus,
} from '../types/index';

class DataStore {
  private users: Map<string, User> = new Map();
  private careRequests: Map<string, CareRequest> = new Map();
  private careVisits: Map<string, CareVisit> = new Map();
  private availabilityWindows: Map<string, AvailabilityWindow> = new Map();

  constructor() {
    this.seedData();
  }

  // =========================================================================
  // USER OPERATIONS
  // =========================================================================

  createUser(user: User): User {
    this.users.set(user.id, user);
    return user;
  }

  getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  getUserByEmail(email: string): User | undefined {
    return Array.from(this.users.values()).find((u) => u.email === email);
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  getUsersByRole(role: UserRole): User[] {
    return Array.from(this.users.values()).filter((u) => u.role === role);
  }

  updateUser(id: string, updates: Partial<User>): User | null {
    const user = this.users.get(id);
    if (!user) return null;
    const updated = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }

  // =========================================================================
  // CARE REQUEST OPERATIONS
  // =========================================================================

  createCareRequest(request: CareRequest): CareRequest {
    this.careRequests.set(request.id, request);
    return request;
  }

  getCareRequestById(id: string): CareRequest | undefined {
    return this.careRequests.get(id);
  }

  getCareRequestsByClient(clientId: string): CareRequest[] {
    return Array.from(this.careRequests.values()).filter(
      (r) => r.clientId === clientId
    );
  }

  getAllCareRequests(): CareRequest[] {
    return Array.from(this.careRequests.values());
  }

  getCareRequestsByStatus(status: VisitStatus): CareRequest[] {
    return Array.from(this.careRequests.values()).filter(
      (r) => r.status === status
    );
  }

  updateCareRequest(
    id: string,
    updates: Partial<CareRequest>
  ): CareRequest | null {
    const request = this.careRequests.get(id);
    if (!request) return null;
    const updated = { ...request, ...updates, updatedAt: new Date() };
    this.careRequests.set(id, updated);
    return updated;
  }

  // =========================================================================
  // CARE VISIT OPERATIONS
  // =========================================================================

  createCareVisit(visit: CareVisit): CareVisit {
    this.careVisits.set(visit.id, visit);
    return visit;
  }

  getCareVisitById(id: string): CareVisit | undefined {
    return this.careVisits.get(id);
  }

  getCareVisitsByProfessional(professionalId: string): CareVisit[] {
    return Array.from(this.careVisits.values()).filter(
      (v) => v.professionalId === professionalId
    );
  }

  getCareVisitsByClient(clientId: string): CareVisit[] {
    return Array.from(this.careVisits.values()).filter(
      (v) => v.clientId === clientId
    );
  }

  updateCareVisit(id: string, updates: Partial<CareVisit>): CareVisit | null {
    const visit = this.careVisits.get(id);
    if (!visit) return null;
    const updated = { ...visit, ...updates, updatedAt: new Date() };
    this.careVisits.set(id, updated);
    return updated;
  }

  // =========================================================================
  // AVAILABILITY OPERATIONS
  // =========================================================================

  createAvailabilityWindow(window: AvailabilityWindow): AvailabilityWindow {
    this.availabilityWindows.set(window.id, window);
    return window;
  }

  getAvailabilityByProfessional(
    professionalId: string
  ): AvailabilityWindow[] {
    return Array.from(this.availabilityWindows.values()).filter(
      (a) => a.professionalId === professionalId
    );
  }

  // =========================================================================
  // SEED DATA
  // =========================================================================

  private seedData(): void {
    // Create Sochrist Ventures admin user
    const admin: User = {
      id: 'admin-001',
      name: 'Sochrist Ventures Admin',
      email: 'onboarding@sochristventures.com',
      password: 'V#4]eBpb)^4PJ,n?',
      role: UserRole.ADMIN,
      location: 'Sochrist Ventures',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add admin to store
    this.createUser(admin);
  }
}

// Export singleton instance
export const dataStore = new DataStore();
