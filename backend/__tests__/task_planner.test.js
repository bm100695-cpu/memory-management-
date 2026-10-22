const taskPlannerService = require('../src/services/taskPlannerService');
const { TaskExecution, TaskStep } = require('../src/models/TaskExecution');
const mongoose = require('mongoose');

describe('JARVIS Continuous Voice & Autonomous Task Planner', () => {
  describe('Language Detection', () => {
    it('should detect Hindi for Devanagari text', () => {
      const lang = taskPlannerService.detectLang('मुझे आज के कार्य बताओ');
      expect(lang).toBe('hi');
    });

    it('should detect Hinglish for Romanized Hindi keywords', () => {
      const lang = taskPlannerService.detectLang('JARVIS, mere browser mein internship search karo');
      expect(lang).toBe('hinglish');
    });

    it('should detect English for English sentences', () => {
      const lang = taskPlannerService.detectLang('Find me software engineering internships with stipend');
      expect(lang).toBe('en');
    });
  });

  describe('Heuristic Plan Generation', () => {
    it('should structure internship search task into multi-step execution plan', async () => {
      // Mock mongoose model create for unit testing
      const fakeUserId = new mongoose.Types.ObjectId();
      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        user: fakeUserId,
        title: 'Search Internship Opportunities',
        status: 'planning',
        save: jest.fn().mockResolvedValue(true),
      };
      const mockStep = {
        _id: new mongoose.Types.ObjectId(),
        execution: mockTask._id,
        stepIndex: 1,
        title: 'Navigate and query web search',
        status: 'queued',
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(TaskExecution, 'create').mockResolvedValue(mockTask);
      jest.spyOn(TaskStep, 'create').mockResolvedValue(mockStep);

      const plan = await taskPlannerService.planTask(
        fakeUserId,
        'JARVIS, mere browser mein internship opportunities search karo'
      );

      expect(plan.execution).toBeDefined();
      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.lang).toBe('hinglish');
      expect(plan.message).toMatch(/opportunities search kar raha hoon/i);

      TaskExecution.create.mockRestore();
      TaskStep.create.mockRestore();
    });
  });
});
