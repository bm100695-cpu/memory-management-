const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const DailyTask = require('../src/models/DailyTask');

let accessToken;
let userId;

beforeAll(async () => {
  const uri = process.env.MONGODB_URI_TEST || process.env.MONGODB_URI;
  await mongoose.connect(uri);

  const res = await request(app).post('/api/auth/register').send({
    name: 'Task Test User',
    email: 'tasks@test.com',
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
  await DailyTask.deleteMany({ user: userId });
});

const authHeader = () => ({ Authorization: `Bearer ${accessToken}` });

describe('Tasks API', () => {
  describe('POST /api/tasks', () => {
    it('should create a task', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set(authHeader())
        .send({
          title: 'Solve 3 LeetCode problems',
          category: 'dsa',
          priority: 'high',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.task.title).toBe('Solve 3 LeetCode problems');
      expect(res.body.data.task.status).toBe('planned');
      expect(res.body.data.task.user).toBe(userId);
    });
  });

  describe('GET /api/tasks/by-date', () => {
    it('should return tasks for today', async () => {
      const today = new Date().toISOString().split('T')[0];
      await request(app)
        .post('/api/tasks')
        .set(authHeader())
        .send({ title: 'Today task', scheduledDate: today });

      const res = await request(app)
        .get(`/api/tasks/by-date?date=${today}`)
        .set(authHeader());
      expect(res.status).toBe(200);
      expect(res.body.data.tasks.length).toBeGreaterThan(0);
    });
  });

  describe('PUT /api/tasks/:id — status update', () => {
    it('should mark task as completed', async () => {
      const createRes = await request(app)
        .post('/api/tasks')
        .set(authHeader())
        .send({ title: 'Complete me', category: 'personal' });
      const taskId = createRes.body.data.task._id;

      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set(authHeader())
        .send({ status: 'completed' });
      expect(res.status).toBe(200);
      expect(res.body.data.task.status).toBe('completed');
      expect(res.body.data.task.completedAt).toBeDefined();
    });
  });

  describe('GET /api/tasks/stats', () => {
    it('should return correct stats', async () => {
      await request(app).post('/api/tasks').set(authHeader()).send({ title: 'Task 1', status: 'completed' });
      await request(app).post('/api/tasks').set(authHeader()).send({ title: 'Task 2' });

      const res = await request(app).get('/api/tasks/stats').set(authHeader());
      expect(res.status).toBe(200);
      expect(res.body.data.stats.total).toBeGreaterThanOrEqual(2);
    });
  });
});
