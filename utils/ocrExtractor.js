const { createWorker } = require('tesseract.js');
const fs = require('fs').promises;

// Try to load sharp for image preprocessing, but don't fail if not available
let sharp;
try {
  sharp = require('sharp');
} catch (err) {
  // Sharp not available, will skip preprocessing
  sharp = null;
}

/**
 * Preprocess image to improve OCR accuracy
 * @param {string} inputPath - Path to input image
 * @param {string} outputPath - Path to save preprocessed image
 * @returns {Promise<string>} - Path to use for OCR (preprocessed or original)
 */
async function preprocessImage(inputPath, outputPath) {
  // If sharp is not available, return original path
  if (!sharp) {
    return inputPath;
  }
  
  try {
    // Get image metadata to determine if preprocessing is needed
    const metadata = await sharp(inputPath).metadata();
    
    // Preprocessing pipeline:
    // 1. Convert to grayscale (improves OCR accuracy)
    // 2. Enhance contrast and sharpness
    // 3. Upscale if image is too small (minimum 1000px width for better OCR)
    // 4. Apply noise reduction
    
    let pipeline = sharp(inputPath)
      .greyscale() // Convert to grayscale
      .normalize() // Normalize contrast
      .sharpen({ sigma: 1, flat: 1, jagged: 2 }) // Sharpen text edges
      .linear(1.2, -(128 * 0.2)) // Increase contrast (1.2x multiplier)
      .median(2); // Noise reduction
    
    // Upscale if image is small (less than 1000px width)
    if (metadata.width && metadata.width < 1000) {
      const scaleFactor = Math.max(2, Math.ceil(1000 / metadata.width));
      pipeline = pipeline.resize(metadata.width * scaleFactor, null, {
        kernel: sharp.kernel.lanczos3, // High-quality upscaling
      });
    }
    
    await pipeline.toFile(outputPath);
    return outputPath;
  } catch (error) {
    // If preprocessing fails, use original image
    console.warn('Image preprocessing failed, using original:', error.message);
    return inputPath;
  }
}

/**
 * Clean extracted text by removing OCR garbage and UI elements
 * @param {string} text - Raw OCR text
 * @returns {string} - Cleaned text
 */
function cleanOCRText(text) {
  let cleaned = text;

  // Remove common OCR garbage patterns
  // Remove single character lines that are likely UI elements
  cleaned = cleaned.replace(/^[^\w\s]{1,2}$/gm, '');
  
  // Remove lines with only symbols and special characters (UI elements)
  cleaned = cleaned.replace(/^[^\w\s]{3,}$/gm, '');
  
  // Remove common UI element patterns
  cleaned = cleaned.replace(/[€@®©™]/g, '');
  cleaned = cleaned.replace(/[\[\]{}]/g, '');
  cleaned = cleaned.replace(/[""]/g, '"');
  cleaned = cleaned.replace(/['']/g, "'");
  
  // Remove lines that are just numbers with "others" or "comments" (engagement metrics)
  cleaned = cleaned.replace(/^\d+\s+(others?|comments?)$/gmi, '');
  
  // Remove common social media UI text patterns
  cleaned = cleaned.replace(/and\s+\d+\s+others?\s+\d+\s+comments?/gi, '');
  cleaned = cleaned.replace(/^\d+\s+comments?$/gmi, '');
  
  // Remove engagement metric patterns (e.g., "Baani Kaur Ahuja and 54 others 5 comments")
  cleaned = cleaned.replace(/[A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+.*and\s+\d+\s+others.*\d+\s+comments?/gi, '');
  
  // Remove single character lines that are likely artifacts
  cleaned = cleaned.split('\n')
    .map(line => line.trim())
    .filter(line => {
      // Keep lines with at least 3 characters or meaningful content
      if (line.length < 3) return false;
      // Remove lines that are mostly symbols
      const wordChars = line.match(/[a-zA-Z0-9]/g) || [];
      return wordChars.length >= line.length * 0.3;
    })
    .join('\n');
  
  // Clean up whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  cleaned = cleaned.trim();
  
  // Remove lines that are just engagement metrics or UI buttons
  const engagementPatterns = [
    /^\d+\s*(like|comment|share|repost)/i,
    /^(like|comment|share|repost|send)$/i,
    /^[^\w]*$/,
    /^[A-Z][a-z]+\s+[A-Z][a-z]+\s+and\s+\d+\s+others/i, // "Name and X others"
  ];
  
  cleaned = cleaned.split('\n')
    .filter(line => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      return !engagementPatterns.some(pattern => pattern.test(trimmed));
    })
    .join('\n');
  
  return cleaned.trim();
}

/**
 * Score OCR result quality
 * @param {string} text - OCR text
 * @returns {number} - Quality score (0-1)
 */
function scoreOCRQuality(text) {
  if (!text || text.length === 0) return 0;
  
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return 0;
  
  // Calculate average word length
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
  
  // Count words with reasonable length (3-20 chars)
  const reasonableWords = words.filter(w => w.length >= 3 && w.length <= 20).length;
  const reasonableRatio = reasonableWords / words.length;
  
  // Count lines with meaningful content
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  const meaningfulLines = lines.filter(l => {
    const wordChars = l.match(/[a-zA-Z0-9]/g) || [];
    return wordChars.length >= l.length * 0.4;
  }).length;
  const meaningfulRatio = lines.length > 0 ? meaningfulLines / lines.length : 0;
  
  // Combined score
  return (avgWordLength / 10 * 0.3) + (reasonableRatio * 0.4) + (meaningfulRatio * 0.3);
}

/**
 * Extract text from image using OCR with improved configuration and preprocessing
 * @param {string} filePath - Path to the image file
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextFromImage(filePath) {
  const worker = await createWorker('eng');
  let preprocessedPath = null;
  
  try {
    // Preprocess image to improve OCR accuracy
    preprocessedPath = filePath.replace(/\.[^.]+$/, '_preprocessed.png');
    const imagePath = await preprocessImage(filePath, preprocessedPath);
    
    // Try multiple PSM modes and configurations to get the best result
    const configurations = [
      {
        name: 'PSM 6 - Single Block',
        params: {
          tessedit_pageseg_mode: '6', // Single uniform block (best for clean documents)
          tessedit_ocr_engine_mode: '1', // Neural nets LSTM engine only
        },
      },
      {
        name: 'PSM 3 - Auto',
        params: {
          tessedit_pageseg_mode: '3', // Fully automatic page segmentation
          tessedit_ocr_engine_mode: '1',
        },
      },
      {
        name: 'PSM 11 - Sparse',
        params: {
          tessedit_pageseg_mode: '11', // Sparse text (for screenshots)
          tessedit_ocr_engine_mode: '1',
        },
      },
      {
        name: 'PSM 6 - Legacy',
        params: {
          tessedit_pageseg_mode: '6',
          tessedit_ocr_engine_mode: '0', // Legacy engine only
        },
      },
    ];
    
    const results = [];
    
    // Try each configuration
    for (const config of configurations) {
      try {
        await worker.setParameters(config.params);
        const { data: { text } } = await worker.recognize(imagePath);
        const cleanedText = cleanOCRText(text);
        const quality = scoreOCRQuality(cleanedText);
        
        results.push({
          text: cleanedText,
          quality: quality,
          config: config.name,
        });
      } catch (err) {
        console.error(`OCR failed with ${config.name}:`, err.message);
      }
    }
    
    // Find the best result based on quality score
    results.sort((a, b) => b.quality - a.quality);
    const bestResult = results[0];
    
    if (!bestResult || bestResult.text.length === 0) {
      throw new Error('No text could be extracted from the image');
    }
    
    await worker.terminate();
    
    // Clean up preprocessed image
    if (preprocessedPath && preprocessedPath !== filePath) {
      await fs.unlink(preprocessedPath).catch(() => {
        // Ignore cleanup errors
      });
    }
    
    return bestResult.text;
  } catch (error) {
    await worker.terminate();
    
    // Clean up preprocessed image on error
    if (preprocessedPath && preprocessedPath !== filePath) {
      await fs.unlink(preprocessedPath).catch(() => {
        // Ignore cleanup errors
      });
    }
    
    throw new Error(`Failed to extract text from image: ${error.message}`);
  }
}

module.exports = { extractTextFromImage };
