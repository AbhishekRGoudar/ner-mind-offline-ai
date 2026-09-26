import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { PasswordService } from '../src/auth/passwordService.js';
import { UserRepository } from '../src/auth/userRepository.js';

describe('Authentication & RBAC', () => {
  beforeEach(() => {
    UserRepository.seedInMemory();
  });
  it('hashes passwords and verifies them using constant-time comparison', async () => {
    const rawPass = 'SecretPassword123!';
    const hash = await PasswordService.hashPassword(rawPass);

    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(await PasswordService.verifyPassword(rawPass, hash)).toBe(true);
    expect(await PasswordService.verifyPassword('WrongPass', hash)).toBe(false);
  });

  it('rejects passwords shorter than 8 characters', async () => {
    await expect(PasswordService.hashPassword('short')).rejects.toThrow();
  });

  it('authenticates valid caregiver and issues session token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'caregiver_pranjal',
        password: 'CaregiverSecurePass123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.role).toBe('CAREGIVER');
  });

  it('rejects invalid login credentials with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'caregiver_pranjal',
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('blocks unauthenticated access to caregiver endpoints', async () => {
    const res = await request(app).get('/api/v1/caregiver/patients');
    expect(res.status).toBe(401);
  });
});
