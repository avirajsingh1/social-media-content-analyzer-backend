const express = require('express');
const router = express.Router();
const Analysis = require('../models/Analysis');

/**
 * GET /api/history
 * Get analysis history
 */
router.get('/', async (req, res, next) => {
  try {
    const analyses = await Analysis.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .select('-extractedText'); // Exclude full text for list view

    res.json({
      success: true,
      analyses: analyses,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/history/:id
 * Get a specific analysis by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const analysis = await Analysis.findById(req.params.id);

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json({
      success: true,
      analysis: analysis,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/history/:id
 * Delete a specific analysis
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const analysis = await Analysis.findByIdAndDelete(req.params.id);

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json({
      success: true,
      message: 'Analysis deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
