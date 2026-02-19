const pdfParse = require('pdf-parse');
const fs = require('fs').promises;

/**
 * Extract text from PDF file with improved error handling
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextFromPDF(filePath) {
  try {
    const dataBuffer = await fs.readFile(filePath);
    
    // Try parsing with default options first
    let data;
    try {
      data = await pdfParse(dataBuffer);
    } catch (parseError) {
      // If parsing fails, try with relaxed options
      if (parseError.message.includes('XRef') || parseError.message.includes('xref')) {
        console.log('PDF parsing failed with XRef error, attempting recovery...');
        
        // Try parsing with max buffer size and other options
        try {
          data = await pdfParse(dataBuffer, {
            max: 0, // Process all pages
          });
        } catch (retryError) {
          // If still failing, try with a different approach
          throw new Error(
            `PDF appears to be corrupted or uses unsupported features. ` +
            `Error: ${parseError.message}. ` +
            `Please try converting the PDF to a standard format or use an image version of the document.`
          );
        }
      } else {
        throw parseError;
      }
    }
    
    // Check if text was extracted
    if (!data || !data.text) {
      throw new Error('No text could be extracted from the PDF. The PDF may contain only images.');
    }
    
    // Clean up the extracted text
    let text = data.text;
    
    // Remove excessive whitespace but preserve paragraph structure
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.trim();
    
    // Check if we got meaningful text
    if (!text || text.length === 0) {
      throw new Error(
        'PDF appears to contain no extractable text. ' +
        'It may be an image-based PDF. Please try uploading as an image file instead.'
      );
    }
    
    return text;
  } catch (error) {
    // Provide more helpful error messages
    if (error.message.includes('XRef') || error.message.includes('xref')) {
      throw new Error(
        `PDF parsing error: The PDF file appears to have structural issues (${error.message}). ` +
        `This can happen with corrupted PDFs or PDFs created with certain software. ` +
        `Try: 1) Re-saving the PDF, 2) Converting to an image and uploading as PNG/JPEG, or 3) Using a different PDF file.`
      );
    } else if (error.message.includes('password') || error.message.includes('encrypted')) {
      throw new Error(
        'PDF is password-protected or encrypted. Please remove the password and try again.'
      );
    } else {
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }
}

module.exports = { extractTextFromPDF };
