const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true,
  },
  fileType: {
    type: String,
    required: true,
    enum: ['pdf', 'image'],
  },
  extractedText: {
    type: String,
    required: true,
  },
  analysis: {
    engagementScore: {
      type: Number,
      required: true,
    },
    readability: {
      type: String,
      required: true,
    },
    lengthFeedback: {
      type: String,
      required: true,
    },
    hashtagSuggestions: [{
      type: String,
    }],
    ctaSuggestions: [{
      type: String,
    }],
    toneFeedback: {
      type: String,
      required: true,
    },
    improvedVersion: {
      type: String,
      required: true,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Analysis', analysisSchema);
