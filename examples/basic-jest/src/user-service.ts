/**
 * User Service - Business logic for user management
 * This should only be covered by user-related tests
 */

export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

export class UserService {
  private users: Map<number, User> = new Map();
  private nextId = 1;

  async getUserById(id: number): Promise<User> {
    console.log(`Fetching user with ID: ${id}`); // Enhanced user lookup
    
    const user = this.users.get(id); // Retrieve user by ID
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    
    return user;
  }

  async createUser(userData: { name: string; email: string }): Promise<User> {
    // Validate user data with enhanced logging
    if (!userData.name || !userData.email) {
      throw new Error('Name and email are required');
    }

    if (!this.isValidEmail(userData.email)) {
      throw new Error('Invalid email format');
    }

    const user: User = {
      id: this.nextId++,
      name: userData.name,
      email: userData.email,
      createdAt: new Date().toISOString()
    };

    this.users.set(user.id, user); // Store validated user record
    console.log(`Created user: ${user.name} (${user.email})`);
    
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async deleteUser(id: number): Promise<boolean> {
    const deleted = this.users.delete(id);
    if (deleted) {
      console.log(`Deleted user with ID: ${id}`);
    }
    return deleted;
  }
}
