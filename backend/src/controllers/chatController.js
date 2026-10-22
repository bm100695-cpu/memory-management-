const aiService = require('../services/aiService');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const logger = require('../utils/logger');

const sendMessage = async (req, res, next) => {
  try {
    const { content, conversationId, activeTaskId } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    logger.info(`Processing chat message for user: ${req.user._id}`);
    const result = await aiService.handleMessage(req.user._id, content.trim(), conversationId, activeTaskId);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error(`Chat sendMessage error [${error.statusCode || 500}]: ${error.message}`);
    next(error);
  }
};

const getConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({ user: req.user._id, isActive: true })
      .sort({ lastMessageAt: -1 })
      .limit(30);

    res.json({
      success: true,
      data: { conversations },
    });
  } catch (error) {
    next(error);
  }
};

const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const messages = await Message.find({
      conversation: conversationId,
      user: req.user._id,
      isDeleted: false,
    }).sort({ createdAt: 1 });

    res.json({
      success: true,
      data: { messages },
    });
  } catch (error) {
    next(error);
  }
};

const deleteConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    await Conversation.findOneAndUpdate(
      { _id: conversationId, user: req.user._id },
      { isActive: false }
    );
    res.json({ success: true, message: 'Conversation deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendMessage,
  getConversations,
  getMessages,
  deleteConversation,
};