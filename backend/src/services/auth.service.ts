// ============================================================================
// AUTH SERVICE
// ============================================================================
// Business logic for authentication

import { User, UserRole, AuthToken } from '../types/index';
import { userRepository } from '../repositories/user.repository';
import { v4 as uuidv4 } from 'uuid';

export class AuthService {
  /**
   * Register a new user
   */
  register(
    name: string,
    email: string,
    password: string,
    role: UserRole,
    location: string
  ): User | null {
    // Check if user already exists
    if (userRepository.findByEmail(email)) {
      return null;
    }

    const newUser: User = {
      id: uuidv4(),
      name,
      email,
      password: this.hashPassword(password),
      role,
      location,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return userRepository.create(newUser);
  }

  /**
   * Login user and return auth token
   */
  login(email: string, password: string): AuthToken | null {
    const user = userRepository.findByEmail(email);

    if (!user || !this.verifyPassword(password, user.password)) {
      return null;
    }

    if (!user.isActive) {
      return null;
    }

    // Generate JWT-like token (simplified for demo)
    const token = this.generateToken(user.id);

    return {
      token,
      expiresIn: 3600,
      userId: user.id,
      role: user.role,
    };
  }

  /**
   * Verify token validity
   */
  verifyToken(token: string): { userId: string; role: UserRole } | null {
    try {
      // In production, use jwt.verify()
      // For now, simple base64 decode
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [userId, role] = decoded.split(':');
      return { userId, role: role as UserRole };
    } catch {
      return null;
    }
  }

  // =========================================================================
  // PRIVATE METHODS
  // =========================================================================

  private hashPassword(password: string): string {
    // In production, use bcrypt or similar
    return Buffer.from(password).toString('base64');
  }

  private verifyPassword(password: string, hash: string): boolean {
    return this.hashPassword(password) === hash;
  }

  private generateToken(userId: string): string {
    // Simple token generation (production should use JWT)
    const user = userRepository.findById(userId);
    if (!user) throw new Error('User not found');
    return Buffer.from(`${userId}:${user.role}`).toString('base64');
  }
}

export const authService = new AuthService();
