// ============================================================================
// USER REPOSITORY
// ============================================================================
// Data access layer for user operations

import { User, UserRole } from '../types/index';
import { dataStore } from '../store/index';

export class UserRepository {
  create(user: User): User {
    return dataStore.createUser(user);
  }

  findById(id: string): User | undefined {
    return dataStore.getUserById(id);
  }

  findByEmail(email: string): User | undefined {
    return dataStore.getUserByEmail(email);
  }

  findAll(): User[] {
    return dataStore.getAllUsers();
  }

  findByRole(role: UserRole): User[] {
    return dataStore.getUsersByRole(role);
  }

  update(id: string, updates: Partial<User>): User | null {
    return dataStore.updateUser(id, updates);
  }
}

export const userRepository = new UserRepository();
