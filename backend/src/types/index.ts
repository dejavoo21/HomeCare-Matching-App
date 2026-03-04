// ============================================================================
// USER TYPES
// ============================================================================

export enum UserRole {
  ADMIN = 'ADMIN',
  NURSE = 'NURSE',
  DOCTOR = 'DOCTOR',
  CLIENT = 'CLIENT',
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // hashed in production
  role: UserRole;
  location: string; // address/city
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface HealthcareProfessional extends User {
  credentials?: string[]; // placeholder for credentials
  specialties?: string[];
  availability: AvailabilityWindow[];
  averageRating?: number;
}

export interface Client extends User {
  addressDetails: string;
  preferredContactMethod?: string;
}

// ============================================================================
// CARE REQUEST TYPES
// ============================================================================

export enum VisitStatus {
  PENDING = 'PENDING',
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

// ============================================================================
// AVAILABILITY TYPES
// ============================================================================

export interface AvailabilityWindow {
  id: string;
  professionalId: string;
  dayOfWeek: number; // 0-6 (Monday-Sunday)
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
}

// ============================================================================
// MATCHING ENGINE TYPES
// ============================================================================

export interface MatchingCriteria {
  requestId: string;
  serviceType: ServiceType;
  urgency: UrgencyLevel;
  location: string;
  scheduledDateTime: Date;
}

export interface MatchResult {
  professionalId: string;
  score: number; // 0-100 matching score
  reasons: string[];
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthToken {
  token: string;
  expiresIn: number;
  userId: string;
  role: UserRole;
}
