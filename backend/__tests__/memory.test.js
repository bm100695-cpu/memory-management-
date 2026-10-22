const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Memory = require('../src/models/Memory');

let accessToken;
let userId;

beforeAll(async () => {
  const uri = process.env.MONGODB_URI_TEST || process.env.MONGODB_URI;
  await mongoose.connect(uri);

  // Register and login
  const res = await request(app).post('/api/auth/register').send({
    name: 'Memory Test User',
    email: 'memory@test.com',
    password: 'Password123',
  });
  accessToken = res.body.data.accessToken;
  userId = res.body.data.user._id;
});

afterAll(async () => {
  try {
    await mongoose.connection.dropDatabase();
  } catch {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
  await mongoose.disconnect();
});

afterEach(async () => {
  await Memory.deleteMany({ user: userId });
});

const authHeader = () => ({ Authorization: `Bearer ${accessToken}` });

describe('Memory API', () => {
  describe('POST /api/memories', () => {
    it('should create a memory', async () => {
      const res = await request(app)
        .post('/api/memories')
        .set(authHeader())
        .send({ content: 'I like chai over coffee', category: 'preference' });
      expect(res.status).toBe(201);
      expect(res.body.data.memory.content).toBe('I like chai over coffee');
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app)
        .post('/api/memories')
        .send({ content: 'test' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/memories', () => {
    it('should return user memories only', async () => {
      await Memory.create({ user: userId, content: 'Test memory', category: 'other' });

      // Another user's memory (should not appear)
      const other = await User.create({ name: 'Other', email: 'other@test.com', password: 'Password123' });
      await Memory.create({ user: other._id, content: 'Other memory', category: 'other' });

      const res = await request(app).get('/api/memories').set(authHeader());
      expect(res.status).toBe(200);
      expect(res.body.data.memories).toHaveLength(1);
      expect(res.body.data.memories[0].content).toBe('Test memory');
    });
  });

  describe('PUT /api/memories/:id', () => {
    it('should update own memory', async () => {
      const mem = await Memory.create({ user: userId, content: 'Old content', category: 'other' });
      const res = await request(app)
        .put(`/api/memories/${mem._id}`)
        .set(authHeader())
        .send({ content: 'Updated content' });
      expect(res.status).toBe(200);
      expect(res.body.data.memory.content).toBe('Updated content');
    });

    it('should not update another user\'s memory', async () => {
      const other = await User.create({ name: 'Other', email: 'other2@test.com', password: 'Password123' });
      const mem = await Memory.create({ user: other._id, content: 'Other memory', category: 'other' });
      const res = await request(app)
        .put(`/api/memories/${mem._id}`)
        .set(authHeader())
        .send({ content: 'Hacked content' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/memories/:id', () => {
    it('should delete own memory', async () => {
      const mem = await Memory.create({ user: userId, content: 'To delete', category: 'other' });
      const res = await request(app)
        .delete(`/api/memories/${mem._id}`)
        .set(authHeader());
      expect(res.status).toBe(200);
      const deleted = await Memory.findById(mem._id);
      expect(deleted).toBeNull();
    });
  });
});
