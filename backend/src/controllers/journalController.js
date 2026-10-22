const journalService = require('../services/journalService');

const generateSummary = async (req, res, next) => {
  try {
    const date = req.body.date || new Date().toISOString().split('T')[0];
    const { summary, created } = await journalService.generateSummary(req.user._id, date, 'manual');
    res.status(created ? 201 : 200).json({
      success: true,
      message: created ? 'Summary generated' : 'Summary already exists for this date',
      data: { summary },
    });
  } catch (error) {
    next(error);
  }
};

const getSummaryByDate = async (req, res, next) => {
  try {
    const date = req.params.date || new Date().toISOString().split('T')[0];
    const summary = await journalService.getSummaryByDate(req.user._id, date);
    if (!summary) {
      return res.status(404).json({ success: false, message: 'No summary found for this date' });
    }
    res.json({ success: true, data: { summary } });
  } catch (error) {
    next(error);
  }
};

const getSummaryHistory = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await journalService.getSummaryHistory(req.user._id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = { generateSummary, getSummaryByDate, getSummaryHistory };
