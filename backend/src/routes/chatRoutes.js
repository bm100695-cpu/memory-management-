const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.post('/message', chatController.sendMessage);
router.get('/conversations', chatController.getConversations);
router.get('/conversations/:conversationId/messages', chatController.getMessages);
router.delete('/conversations/:conversationId', chatController.deleteConversation);

module.exports = router;