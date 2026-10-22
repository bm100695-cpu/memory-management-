const express = require('express');
const router = express.Router();
const SavedSource = require('../models/SavedSource');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/research - List saved sources
router.get('/', async (req, res, next) => {
  try {
    const { search, tag, limit = 50 } = req.query;
    const query = { user: req.user._id };

    if (tag) query.tags = tag;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
        { url: { $regex: search, $options: 'i' } },
      ];
    }

    const sources = await SavedSource.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, data: { sources } });
  } catch (error) {
    next(error);
  }
});

// POST /api/research - Save a source
router.post('/', async (req, res, next) => {
  try {
    const { url, title, notes, excerpt, summary, tags } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: 'URL is required' });
    }

    const source = await SavedSource.create({
      user: req.user._id,
      url,
      title: title || url,
      notes,
      excerpt,
      summary,
      tags: Array.isArray(tags) ? tags : [],
    });

    res.status(201).json({ success: true, data: { source } });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/research/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await SavedSource.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true, message: 'Source deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
