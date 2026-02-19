const express = require('express');
const router = express.Router();
const { analyzeContent } = require('../utils/analyzer');
const Analysis = require('../models/Analysis');

/**
 * POST /api/analyze
 * Analyze extracted text and optionally save to database
 */
router.post('/', async (req, res, next) => {
  try {
    const { text, fileName, fileType, saveToHistory } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required for analysis' });
    }

    // Analyze the content
    const analysis = analyzeContent(text);

    // Save to database if requested
    let savedAnalysis = null;
    if (saveToHistory && fileName && fileType) {
      savedAnalysis = await Analysis.create({
        fileName: fileName,
        fileType: fileType,
        extractedText: text,
        analysis: analysis,
      });
    }

    res.json({
      success: true,
      analysis: analysis,
      saved: savedAnalysis ? true : false,
      analysisId: savedAnalysis ? savedAnalysis._id : null,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
