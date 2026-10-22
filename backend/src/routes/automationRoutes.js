const express = require('express');
const router = express.Router();
const { TaskExecution, TaskStep } = require('../models/TaskExecution');
const taskPlannerService = require('../services/taskPlannerService');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/automations - List recent task executions
router.get('/', async (req, res, next) => {
  try {
    const executions = await TaskExecution.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30);

    res.json({ success: true, data: { executions } });
  } catch (error) {
    next(error);
  }
});

// GET /api/automations/:id - Get specific execution and its steps
router.get('/:id', async (req, res, next) => {
  try {
    const execution = await TaskExecution.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!execution) {
      return res.status(404).json({ success: false, message: 'Execution not found' });
    }

    const steps = await TaskStep.find({ execution: execution._id }).sort({ stepIndex: 1 });

    res.json({
      success: true,
      data: { execution, steps },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/automations/plan - Convert instruction into structured task plan with context
router.post('/plan', async (req, res, next) => {
  try {
    const { instruction, activeTaskId, conversationContext } = req.body;
    if (!instruction || !instruction.trim()) {
      return res.status(400).json({ success: false, message: 'Instruction is required' });
    }

    const result = await taskPlannerService.planTask(req.user._id, instruction.trim(), {
      activeTaskId,
      conversationContext,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/automations/:id/execute-all - Execute remaining steps in sequence
router.post('/:id/execute-all', async (req, res, next) => {
  try {
    const execution = await TaskExecution.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!execution) {
      return res.status(404).json({ success: false, message: 'Execution not found' });
    }

    const steps = await TaskStep.find({
      execution: execution._id,
      status: { $in: ['queued', 'pending'] },
    }).sort({ stepIndex: 1 });

    const stepResults = [];
    for (const step of steps) {
      try {
        const stepRes = await taskPlannerService.executeTaskStep(
          execution._id,
          step._id,
          req.user._id
        );
        stepResults.push(stepRes.step);
      } catch (err) {
        stepResults.push({ stepId: step._id, status: 'failed', error: err.message });
        break; // Stop execution on failure
      }
    }

    const updatedExecution = await TaskExecution.findById(execution._id);
    const allSteps = await TaskStep.find({ execution: execution._id }).sort({ stepIndex: 1 });

    res.json({
      success: true,
      data: {
        execution: updatedExecution,
        steps: allSteps,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/automations/:id/step/:stepId - Execute a single step
router.post('/:id/step/:stepId', async (req, res, next) => {
  try {
    const result = await taskPlannerService.executeTaskStep(
      req.params.id,
      req.params.stepId,
      req.user._id
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/automations/:id/cancel - Cancel task execution
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const execution = await taskPlannerService.cancelTaskExecution(
      req.params.id,
      req.user._id,
      req.body.reason || 'User cancelled task'
    );

    res.json({ success: true, data: { execution } });
  } catch (error) {
    next(error);
  }
});

// POST /api/automations/validate-url - Safe URL validation endpoint
router.post('/validate-url', (req, res) => {
  const { validateUrl } = require('../services/webAutomationService');
  const result = validateUrl(req.body.url);
  res.json({ success: true, data: result });
});

// GET /api/automations/extension-commands - Retrieve queued browser commands for Chrome Extension
router.get('/extension-commands', (req, res) => {
  const commands = taskPlannerService.extensionCommandQueue.splice(0, 10);
  res.json({ success: true, commands });
});

// POST /api/automations/extension-results - Post result from Chrome Extension
router.post('/extension-results', (req, res) => {
  const { commandId, status, result, error } = req.body;
  if (commandId) {
    taskPlannerService.extensionResults.set(commandId, { status, result, error, timestamp: Date.now() });
  }
  res.json({ success: true, message: 'Result recorded' });
});

module.exports = router;
