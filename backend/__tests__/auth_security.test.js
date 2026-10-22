const request = require('supertest');
const app = require('../src/app');

describe('Authentication & Security Verification', () => {
  describe('Input Validation & Rejection of Invalid Login Attempts', () => {
    it('should reject login request with missing email and password with 400', async () => {
      const res = await request(app).post('/api/auth/login').send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.details).toBeDefined();
    });

    it('should reject login request with invalid email format with 400', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'Password123' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject login request with missing password with 400', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Registration Security & Password Rules', () => {
    it('should reject weak password without numbers or uppercase letters with 400', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'weak',
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration with empty name with 400', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: '',
        email: 'john@example.com',
        password: 'Password123',
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Route Protection & Unauthenticated Rejection', () => {
    it('should reject GET /api/auth/me without token with 401', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Authentication required|Please log in/i);
    });

    it('should reject GET /api/auth/me with invalid token with 401', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token-xyz');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Invalid token/i);
    });

    it('should reject GET /api/tasks without token with 401', async () => {
      const res = await request(app).get('/api/tasks');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject GET /api/memories without token with 401', async () => {
      const res = await request(app).get('/api/memories');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject GET /api/profile without token with 401', async () => {
      const res = await request(app).get('/api/profile');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject GET /api/journal/2026-10-20 without token with 401', async () => {
      const res = await request(app).get('/api/journal/2026-10-20');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Google OAuth Verification Requirement', () => {
    it('should reject google login with missing credential with 400 and not bypass', async () => {
      const res = await request(app).post('/api/auth/google').send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/credential/i);
    });

    it('should reject google login with empty string credential with 400', async () => {
      const res = await request(app).post('/api/auth/google').send({ credential: '' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid or forged Google tokens with 401 (or 503 if unconfigured) and never authenticate', async () => {
      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'forged.google.jwt.token.here' });
      // Must be rejected - never return 200 or access token
      expect([401, 503]).toContain(res.status);
      expect(res.body.success).toBe(false);
      expect(res.body.data?.accessToken).toBeUndefined();
    });
  });

  describe('Google OAuth Service Security Logic', () => {
    const authService = require('../src/services/authService');
    const { env } = require('../src/config/env');

    it('should throw 503 error if GOOGLE_CLIENT_ID is not configured', async () => {
      const originalClientId = env.GOOGLE_CLIENT_ID;
      try {
        delete env.GOOGLE_CLIENT_ID;
        await expect(
          authService.googleLogin({ credential: 'any-token' })
        ).rejects.toMatchObject({
          statusCode: 503,
          message: expect.stringMatching(/Google OAuth is not configured/i),
        });
      } finally {
        env.GOOGLE_CLIENT_ID = originalClientId;
      }
    });

    it('should reject invalid token signature or audience with 401', async () => {
      const originalClientId = env.GOOGLE_CLIENT_ID;
      try {
        env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
        await expect(
          authService.googleLogin({ credential: 'invalid-or-expired-token' })
        ).rejects.toMatchObject({
          statusCode: 401,
          message: expect.stringMatching(/Invalid or expired Google credential token/i),
        });
      } finally {
        env.GOOGLE_CLIENT_ID = originalClientId;
      }
    });
  });
});
