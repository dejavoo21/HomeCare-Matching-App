// ============================================================================
// MATCHING SERVICE
// ============================================================================
// Core matching engine that assigns healthcare professionals to care requests

import {
  MatchingCriteria,
  MatchResult,
  HealthcareProfessional,
  UserRole,
} from '../types/index';
import { userRepository } from '../repositories/user.repository';

export class MatchingService {
  /**
   * Find best matches for a care request
   * Returns top 3 candidates sorted by matching score
   */
  findMatches(criteria: MatchingCriteria): MatchResult[] {
    // Get all active healthcare professionals
    const nurses = userRepository
      .findByRole(UserRole.NURSE)
      .filter((u) => u.isActive);
    const doctors = userRepository
      .findByRole(UserRole.DOCTOR)
      .filter((u) => u.isActive);

    const candidates = [...nurses, ...doctors];

    if (candidates.length === 0) {
      return [];
    }

    // Score each candidate
    const scores = candidates
      .map((professional) => ({
        professionalId: professional.id,
        score: this.calculateMatchScore(professional, criteria),
        reasons: this.getMatchReasons(professional, criteria),
      }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3); // Return top 3

    return scores;
  }

  /**
   * Assign a specific professional to a request
   * This is called after matching or manual admin selection
   */
  assignProfessional(
    requestId: string,
    professionalId: string
  ): boolean {
    const professional = userRepository.findById(professionalId);

    if (!professional || professional.isActive === false) {
      return false;
    }

    return true;
  }

  // =========================================================================
  // PRIVATE SCORING METHODS
  // =========================================================================

  private calculateMatchScore(
    professional: any,
    criteria: MatchingCriteria
  ): number {
    let score = 100;

    // Location proximity (simplified - in production use geolocation)
    if (professional.location === criteria.location) {
      score += 20;
    } else {
      score -= 30; // Different location penalty
    }

    // Availability matching
    const isAvailable = this.checkAvailability(
      professional,
      criteria.scheduledDateTime
    );
    if (!isAvailable) {
      score -= 50;
    }

    // Role-based matching
    if (
      professional.specialties &&
      this.matchesServiceType(professional.specialties, criteria.serviceType)
    ) {
      score += 15;
    }

    // Urgency level boost (urgent cases need experienced professionals)
    if (
      criteria.urgency === 'CRITICAL' &&
      professional.role === UserRole.DOCTOR
    ) {
      score += 25;
    }

    return Math.max(0, score);
  }

  private checkAvailability(professional: any, dateTime: Date): boolean {
    // Simplified availability check
    // In production, check against detailed availability windows

    if (!professional.availability || professional.availability.length === 0) {
      return false;
    }

    const dayOfWeek = dateTime.getDay();
    const timeHour = dateTime.getHours();

    return professional.availability.some((window: any) => {
      if (window.dayOfWeek !== dayOfWeek) {
        return false;
      }

      const [startHour] = window.startTime.split(':').map(Number);
      const [endHour] = window.endTime.split(':').map(Number);

      return timeHour >= startHour && timeHour < endHour;
    });
  }

  private matchesServiceType(
    specialties: string[],
    serviceType: string
  ): boolean {
    const serviceMapping: Record<string, string[]> = {
      MEDICATION_ADMIN: ['Medication Administration'],
      WOUND_CARE: ['Wound Care'],
      VITAL_CHECKS: ['Vital Signs Monitoring'],
      GENERAL_CARE: ['General Care', 'Vital Signs Monitoring'],
    };

    const requiredSpecialties = serviceMapping[serviceType] || [];
    return requiredSpecialties.some((spec) => specialties.includes(spec));
  }

  private getMatchReasons(
    professional: any,
    criteria: MatchingCriteria
  ): string[] {
    const reasons: string[] = [];

    if (professional.location === criteria.location) {
      reasons.push('Same location as request');
    }

    if (
      professional.specialties &&
      this.matchesServiceType(professional.specialties, criteria.serviceType)
    ) {
      reasons.push('Has relevant specialties');
    }

    if (professional.role === UserRole.DOCTOR) {
      reasons.push('Doctor-level care available');
    }

    if (
      professional.availability &&
      professional.availability.length > 0
    ) {
      reasons.push('Has availability');
    }

    return reasons;
  }
}

export const matchingService = new MatchingService();
