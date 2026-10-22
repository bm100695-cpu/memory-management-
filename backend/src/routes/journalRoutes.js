const express = require('express');
const router = express.Router();
const journalController = require('../controllers/journalController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/journal/history
router.get('/history', journalController.getSummaryHistory);
// GET /api/journal/:date  (e.g. 2024-01-15)
router.get('/:date', journalController.getSummaryByDate);
// POST /api/journal/generate
router.post('/generate', journalController.generateSummary);

module.exports = router;
