// ============================================================================
// FRONTEND TYPES
// ============================================================================

export enum UserRole {
  ADMIN = 'admin',
  NURSE = 'nurse',
  DOCTOR = 'doctor',
  CLIENT = 'client',
}

export enum VisitStatus {
  PENDING = 'PENDING',
  QUEUED = 'queued',
  OFFERED = 'offered',
  ASSIGNED = 'ASSIGNED',
  ACCEPTED = 'ACCEPTED',
  EN_ROUTE = 'EN_ROUTE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ServiceType {
  MEDICATION_ADMIN = 'MEDICATION_ADMIN',
  WOUND_CARE = 'WOUND_CARE',
  VITAL_CHECKS = 'VITAL_CHECKS',
  GENERAL_CARE = 'GENERAL_CARE',
}

export enum UrgencyLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions?: string[];
  location: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CareRequest {
  id: string;
  clientId: string;
  serviceType: ServiceType;
  medication?: string;
  description: string;
  address: string;
  scheduledDateTime: Date;
  urgency: UrgencyLevel;
  status: VisitStatus;
  assignedProfessionalId?: string;
  offerExpiresAt?: string; // ISO timestamp for countdown display
  createdAt: Date;
  updatedAt: Date;
}

export interface CareVisit {
  id: string;
  requestId: string;
  clientId: string;
  professionalId: string;
  status: VisitStatus;
  scheduledDateTime: Date;
  completedDateTime?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthToken {
  token: string;
  expiresIn: number;
  userId: string;
  role: UserRole;
}

export interface MatchResult {
  professionalId: string;
  score: number;
  reasons: string[];
}
