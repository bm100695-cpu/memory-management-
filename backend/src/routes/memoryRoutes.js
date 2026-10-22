const express = require('express');
const router = express.Router();
const memoryController = require('../controllers/memoryController');
const { requireAuth } = require('../middleware/auth');

// All memory routes require authentication
router.use(requireAuth);

router.get('/', memoryController.getMemories);
router.post('/', memoryController.createMemory);
router.delete('/all', memoryController.deleteAllMemories); // Must be before /:id
router.get('/:id', memoryController.getMemoryById);
router.put('/:id', memoryController.updateMemory);
router.delete('/:id', memoryController.deleteMemory);

module.exports = router;
