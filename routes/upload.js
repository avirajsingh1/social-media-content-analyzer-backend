const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { extractTextFromPDF } = require('../utils/pdfExtractor');
const { extractTextFromImage } = require('../utils/ocrExtractor');
const path = require('path');
const fs = require('fs').promises;

/**
 * POST /api/upload
 * Upload and extract text from PDF or image file
 */
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    let extractedText;
    let extractionMethod = fileExtension === '.pdf' ? 'pdf' : 'ocr';

    // Extract text based on file type
    if (fileExtension === '.pdf') {
      try {
        extractedText = await extractTextFromPDF(filePath);
      } catch (pdfError) {
        // If PDF parsing fails with XRef error, suggest OCR fallback
        if (pdfError.message.includes('XRef') || pdfError.message.includes('corrupted')) {
          // For now, return a helpful error message
          // In the future, we could add PDF-to-image conversion and OCR fallback
          return res.status(400).json({
            error: pdfError.message,
            suggestion: 'This PDF appears to have structural issues. Try converting it to an image (PNG/JPEG) and uploading that instead, or re-save the PDF using a different PDF creator.'
          });
        }
        throw pdfError;
      }
    } else if (['.png', '.jpg', '.jpeg'].includes(fileExtension)) {
      extractedText = await extractTextFromImage(filePath);
    } else {
      // Clean up uploaded file
      await fs.unlink(filePath);
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    // Clean up uploaded file after extraction
    await fs.unlink(filePath).catch(err => {
      console.error('Error deleting file:', err);
    });

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({ 
        error: 'No text could be extracted from the file',
        suggestion: fileExtension === '.pdf' 
          ? 'The PDF may contain only images. Try converting it to an image file and uploading that instead.'
          : 'The image may not contain readable text, or the text may be too small or unclear.'
      });
    }

    res.json({
      success: true,
      fileName: req.file.originalname,
      fileType: fileExtension === '.pdf' ? 'pdf' : 'image',
      extractedText: extractedText,
      extractionMethod: extractionMethod,
    });
  } catch (error) {
    // Clean up file on error
    if (req.file && req.file.path) {
      await fs.unlink(req.file.path).catch(err => {
        console.error('Error deleting file on error:', err);
      });
    }
    next(error);
  }
});

module.exports = router;
