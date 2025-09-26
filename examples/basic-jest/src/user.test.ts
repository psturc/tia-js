/**
 * User Service Tests
 * These tests should ONLY cover user-service.ts and server.ts user endpoints
 */

import request from 'supertest';
import { app } from './server';
import { UserService } from './user-service';

describe('User Management', () => {
  let userService: UserService;

  beforeAll(() => {
    userService = new UserService();
  });

  // No server cleanup needed since we're only testing the Express app

  describe('UserService', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com'
      };

      const user = await userService.createUser(userData);

      expect(user).toMatchObject({
        id: expect.any(Number),
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: expect.any(String)
      });
    });

    it('should validate email format', async () => {
      const userData = {
        name: 'Jane Doe',
        email: 'invalid-email'
      };

      await expect(userService.createUser(userData))
        .rejects
        .toThrow('Invalid email format');
    });

    it('should retrieve user by ID', async () => {
      const userData = {
        name: 'Alice Smith',
        email: 'alice@example.com'
      };

      const createdUser = await userService.createUser(userData);
      const retrievedUser = await userService.getUserById(createdUser.id);

      expect(retrievedUser).toEqual(createdUser);
    });

    it('should throw error for non-existent user', async () => {
      await expect(userService.getUserById(999))
        .rejects
        .toThrow('User with ID 999 not found');
    });
  });

  describe('User API Endpoints', () => {
    it('should create user via POST /users', async () => {
      const userData = {
        name: 'Bob Wilson',
        email: 'bob@example.com'
      };

      const response = await request(app)
        .post('/users')
        .send(userData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(Number),
        name: 'Bob Wilson',
        email: 'bob@example.com'
      });
    });

    it('should get user via GET /users/:id', async () => {
      // First create a user
      const createResponse = await request(app)
        .post('/users')
        .send({ name: 'Carol Brown', email: 'carol@example.com' })
        .expect(201);

      const userId = createResponse.body.id;

      // Then retrieve it
      const getResponse = await request(app)
        .get(`/users/${userId}`)
        .expect(200);

      expect(getResponse.body).toMatchObject({
        id: userId,
        name: 'Carol Brown',
        email: 'carol@example.com'
      });
    });

    it('should return 404 for non-existent user', async () => {
      await request(app)
        .get('/users/999')
        .expect(404);
    });
  });
});
