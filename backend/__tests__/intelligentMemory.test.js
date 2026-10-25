require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Memory = require('../src/models/Memory');
const Conversation = require('../src/models/Conversation');
const Message = require('../src/models/Message');
const memoryService = require('../src/services/memoryService');
const { sanitizeSecrets, containsSecret } = require('../src/utils/secretSanitizer');
const { extractHeuristicMemories } = require('../src/services/memoryExtractor');
const { generateTokenPair } = require('../src/utils/jwt');

jest.setTimeout(60000);

let accessToken;
let userId;
let otherUserId;
let otherAccessToken;

beforeAll(async () => {
  const uri = process.env.MONGODB_URI_TEST || process.env.MONGODB_URI;
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }

  // Ensure index with language_override: 'none' is synced
  try {
    await Conversation.collection.dropIndexes();
  } catch (e) {
    // ignore
  }
  await Conversation.syncIndexes();

  const suffix = Date.now();
  const user1 = await User.create({
    name: 'Memory Dev User',
    email: `memdev_${suffix}@test.com`,
    password: 'Password123!',
  });
  userId = user1._id;
  accessToken = generateTokenPair(user1).accessToken;

  const user2 = await User.create({
    name: 'Other Dev User',
    email: `otherdev_${suffix}@test.com`,
    password: 'Password123!',
  });
  otherUserId = user2._id;
  otherAccessToken = generateTokenPair(user2).accessToken;
});

afterAll(async () => {
  try {
    if (userId) {
      await Memory.deleteMany({ user: { $in: [userId, otherUserId] } });
      await Conversation.deleteMany({ user: { $in: [userId, otherUserId] } });
      await Message.deleteMany({ user: { $in: [userId, otherUserId] } });
      await User.deleteMany({ _id: { $in: [userId, otherUserId] } });
    }
  } catch (e) {
    // ignore cleanup
  }
  await mongoose.disconnect();
});

describe('Intelligent Memory & Conversation Continuity System', () => {
  describe('1. Secret Sanitization & Privacy', () => {
    it('should detect and redact passwords, API keys, and MongoDB connection strings', () => {
      const sensitiveText =
        'My mongodb uri is mongodb+srv://admin:pass123@cluster0.mongodb.net/db and my openai key is sk-1234567890abcdef1234567890abcdef and password: supersecret123';
      expect(containsSecret(sensitiveText)).toBe(true);

      const sanitized = sanitizeSecrets(sensitiveText);
      expect(sanitized).not.toContain('pass123');
      expect(sanitized).not.toContain('sk-1234567890abcdef1234567890abcdef');
      expect(sanitized).not.toContain('supersecret123');
      expect(sanitized).toContain('[REDACTED_SECRET]');
      expect(sanitized).toContain('[REDACTED_PASSWORD]');
    });

    it('should not store secrets when creating memory via memoryService', async () => {
      const memory = await memoryService.createMemory(userId, {
        title: 'Secret Setup',
        content: 'Connecting with password: MySecretPassword123 and sk-abc123456789012345678901234',
        category: 'fact',
      });

      expect(memory.content).not.toContain('MySecretPassword123');
      expect(memory.content).not.toContain('sk-abc123456789012345678901234');
      expect(memory.content).toContain('[REDACTED_PASSWORD]');
    });
  });

  describe('2. Deduplication & Memory Merging', () => {
    it('should prevent duplicate memory creation and merge tags / content updates', async () => {
      // Create initial memory
      const mem1 = await memoryService.saveOrMergeMemory(userId, {
        title: 'Color Preference',
        content: 'I prefer dark mode UI for all projects',
        category: 'preference',
        topic: 'Design',
        tags: ['ui', 'theme'],
      });

      // Save memory with identical content but extra tag
      const mem2 = await memoryService.saveOrMergeMemory(userId, {
        title: 'Color Preference',
        content: 'I prefer dark mode UI for all projects',
        category: 'preference',
        topic: 'Design',
        tags: ['theme', 'darkmode'],
      });

      expect(String(mem1._id)).toBe(String(mem2._id));
      expect(mem2.tags).toContain('darkmode');
      expect(mem2.tags).toContain('ui');

      const count = await Memory.countDocuments({ user: userId, category: 'preference' });
      expect(count).toBe(1);
    });
  });

  describe('3. Automatic Memory Extraction From Conversation', () => {
    it('should extract useful long-term preferences, decisions, and goals without saving greetings', async () => {
      // Casual greeting -> should not create memories
      const greetingCandidates = extractHeuristicMemories('Hello JARVIS, how are you today?');
      expect(greetingCandidates).toHaveLength(0);

      // Explicit memory -> extracted
      const explicitCandidates = extractHeuristicMemories('Remember that our production API uses Node.js and Express');
      expect(explicitCandidates.length).toBeGreaterThan(0);
      expect(explicitCandidates[0].category).toBe('personal');
      expect(explicitCandidates[0].content).toContain('our production API uses Node.js');

      // Personal preference -> extracted
      const prefCandidates = extractHeuristicMemories('I prefer TypeScript over Vanilla JavaScript for modern projects');
      expect(prefCandidates.length).toBeGreaterThan(0);
      expect(prefCandidates[0].category).toBe('preference');

      // Key decision -> extracted
      const decisionCandidates = extractHeuristicMemories('We decided to use MongoDB Atlas for multi-region redundancy');
      expect(decisionCandidates.length).toBeGreaterThan(0);
      expect(decisionCandidates[0].category).toBe('decision');
    });

    it('should save extracted memories linked to the conversation', async () => {
      const conv = await Conversation.create({
        user: userId,
        title: 'Architecture Discussion',
      });

      const saved = await memoryService.extractAndSaveMemoriesFromConversation(
        userId,
        conv._id,
        'Remember that we decided to use Vite for the React frontend',
        'Understood, I will remember this architectural decision.'
      );

      expect(saved.length).toBeGreaterThan(0);
      expect(String(saved[0].conversation)).toBe(String(conv._id));
      expect(saved[0].content).toContain('Vite for the React frontend');
    });
  });

  describe('4. Conversation History & Topic Continuity', () => {
    it('should retrieve previous conversation context when returning to a topic', async () => {
      // Yesterday conversation
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const prevConv = await Conversation.create({
        user: userId,
        title: 'Browser Automation Work',
        topics: ['browser automation', 'puppeteer', 'scraping'],
        summary: 'Scaffolded Puppeteer script and tested initial navigation',
        lastMessageAt: yesterday,
      });

      await Message.create({
        conversation: prevConv._id,
        user: userId,
        role: 'user',
        content: 'Let us build the browser automation feature for job listings',
        createdAt: yesterday,
      });

      await Message.create({
        conversation: prevConv._id,
        user: userId,
        role: 'assistant',
        content: 'I have set up the browser automation script and verified the login page navigation.',
        createdAt: yesterday,
      });

      // Today in a new conversation: User says "Continue the browser automation work from yesterday"
      const newConv = await Conversation.create({
        user: userId,
        title: 'Today Conversation',
      });

      const retrieved = await memoryService.retrieveRelevantConversations(userId, {
        currentConversationId: newConv._id,
        query: 'Continue the browser automation work from yesterday',
        topic: 'browser automation',
      });

      expect(retrieved.length).toBeGreaterThan(0);
      expect(String(retrieved[0].conversationId)).toBe(String(prevConv._id));
      expect(retrieved[0].title).toBe('Browser Automation Work');
      expect(retrieved[0].summary).toContain('Puppeteer');
    });
  });

  describe('5. User Isolation & Security', () => {
    it('should never expose User 1 memories to User 2', async () => {
      const user1Memory = await memoryService.createMemory(userId, {
        title: 'User 1 Confidential Fact',
        content: 'User 1 private business model',
        category: 'fact',
      });

      // User 2 requests memories
      const user2Memories = await memoryService.getMemories(otherUserId, {});
      const hasUser1Mem = user2Memories.memories.some((m) => String(m._id) === String(user1Memory._id));
      expect(hasUser1Mem).toBe(false);

      // User 2 tries to access User 1 memory by ID directly
      await expect(memoryService.getMemoryById(otherUserId, user1Memory._id)).rejects.toThrow('Memory not found');
    });

    it('should allow User 1 to fetch their memories via HTTP API', async () => {
      const res = await request(app)
        .get('/api/memories')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.memories)).toBe(true);
    });
  });
});
