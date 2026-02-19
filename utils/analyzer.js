/**
 * Analyze extracted text and generate engagement insights
 * @param {string} text - The text to analyze
 * @returns {Object} - Analysis results
 */
function analyzeContent(text) {
  if (!text || text.trim().length === 0) {
    throw new Error('Text is empty or invalid');
  }

  const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
  const charCount = text.length;
  const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const paragraphCount = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;

  // Calculate engagement score (0-100)
  const engagementScore = calculateEngagementScore(text, wordCount, sentenceCount);

  // Determine readability
  const readability = assessReadability(wordCount, sentenceCount);

  // Length feedback
  const lengthFeedback = getLengthFeedback(wordCount);

  // Extract keywords for hashtags
  const hashtagSuggestions = generateHashtagSuggestions(text);

  // Generate CTA suggestions
  const ctaSuggestions = generateCTASuggestions(text);

  // Tone analysis
  const toneFeedback = analyzeTone(text);

  // Generate improved version
  const improvedVersion = generateImprovedVersion(text, wordCount);

  return {
    engagementScore,
    readability,
    lengthFeedback,
    hashtagSuggestions,
    ctaSuggestions,
    toneFeedback,
    improvedVersion,
  };
}

/**
 * Calculate engagement score based on various factors
 */
function calculateEngagementScore(text, wordCount, sentenceCount) {
  let score = 50; // Base score

  // Length factor (optimal: 50-150 words for social media)
  if (wordCount >= 50 && wordCount <= 150) {
    score += 20;
  } else if (wordCount >= 30 && wordCount <= 200) {
    score += 10;
  } else if (wordCount < 20) {
    score -= 15;
  } else if (wordCount > 300) {
    score -= 10;
  }

  // Question factor
  const questionCount = (text.match(/\?/g) || []).length;
  if (questionCount > 0) {
    score += Math.min(questionCount * 5, 15);
  }

  // Exclamation factor (moderate use is good)
  const exclamationCount = (text.match(/!/g) || []).length;
  if (exclamationCount >= 1 && exclamationCount <= 2) {
    score += 5;
  } else if (exclamationCount > 3) {
    score -= 5;
  }

  // Hashtag presence (if already present)
  const hashtagCount = (text.match(/#\w+/g) || []).length;
  if (hashtagCount >= 1 && hashtagCount <= 5) {
    score += 5;
  }

  // Call-to-action presence
  const ctaKeywords = ['click', 'learn', 'discover', 'try', 'get', 'start', 'join', 'sign up', 'download'];
  const hasCTA = ctaKeywords.some(keyword => text.toLowerCase().includes(keyword));
  if (hasCTA) {
    score += 10;
  }

  // Sentence variety (not all same length)
  const avgSentenceLength = wordCount / Math.max(sentenceCount, 1);
  if (avgSentenceLength >= 10 && avgSentenceLength <= 20) {
    score += 5;
  }

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Assess readability level
 */
function assessReadability(wordCount, sentenceCount) {
  if (sentenceCount === 0) return 'Unable to assess';

  const avgSentenceLength = wordCount / sentenceCount;

  if (avgSentenceLength <= 10) {
    return 'Easy to read - Great for quick engagement';
  } else if (avgSentenceLength <= 15) {
    return 'Moderately easy - Good balance';
  } else if (avgSentenceLength <= 20) {
    return 'Moderate - Consider breaking up long sentences';
  } else {
    return 'Complex - May reduce engagement';
  }
}

/**
 * Provide feedback on content length
 */
function getLengthFeedback(wordCount) {
  if (wordCount < 20) {
    return 'Too short - Add more context or value to engage readers';
  } else if (wordCount >= 20 && wordCount < 50) {
    return 'Short - Good for quick posts, but consider adding more detail';
  } else if (wordCount >= 50 && wordCount <= 150) {
    return 'Optimal length - Perfect for most social media platforms';
  } else if (wordCount > 150 && wordCount <= 300) {
    return 'Long - Works well for LinkedIn or detailed posts';
  } else {
    return 'Very long - Consider breaking into multiple posts or a thread';
  }
}

/**
 * Generate hashtag suggestions based on keywords
 */
function generateHashtagSuggestions(text) {
  const suggestions = [];
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  
  // Common words to exclude
  const stopWords = new Set([
    'this', 'that', 'with', 'from', 'have', 'been', 'will', 'your', 'what',
    'when', 'where', 'which', 'their', 'there', 'these', 'those', 'about',
    'would', 'could', 'should', 'might', 'must', 'shall', 'them', 'they'
  ]);

  // Count word frequency
  const wordFreq = {};
  words.forEach(word => {
    if (!stopWords.has(word) && word.length >= 4) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });

  // Get top words
  const sortedWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);

  // Generate hashtags
  sortedWords.forEach(word => {
    suggestions.push(`#${word.charAt(0).toUpperCase() + word.slice(1)}`);
  });

  // Add some generic engagement hashtags if we have space
  const genericHashtags = ['#SocialMedia', '#Content', '#Engagement', '#Marketing'];
  genericHashtags.forEach(tag => {
    if (suggestions.length < 8 && !suggestions.includes(tag)) {
      suggestions.push(tag);
    }
  });

  return suggestions.slice(0, 8);
}

/**
 * Generate call-to-action suggestions
 */
function generateCTASuggestions(text) {
  const suggestions = [];
  const textLower = text.toLowerCase();

  // Check if CTA already exists
  const hasCTA = ['click', 'learn', 'discover', 'try', 'get', 'start', 'join', 'sign up', 'download']
    .some(keyword => textLower.includes(keyword));

  if (!hasCTA) {
    suggestions.push('Add a clear call-to-action to guide your audience');
    suggestions.push('Consider ending with a question to encourage comments');
    suggestions.push('Include a link or next step for interested readers');
  } else {
    suggestions.push('Your content already includes a call-to-action - good!');
    suggestions.push('Consider making the CTA more prominent or specific');
  }

  // Platform-specific suggestions
  suggestions.push('For Instagram: Use "Swipe up" or "Link in bio"');
  suggestions.push('For Twitter: Use "Read more" or "Thread 🧵"');
  suggestions.push('For LinkedIn: Use "Learn more" or "Let\'s connect"');

  return suggestions.slice(0, 5);
}

/**
 * Analyze the tone of the content
 */
function analyzeTone(text) {
  const textLower = text.toLowerCase();
  
  let tone = [];
  
  // Check for positive words
  const positiveWords = ['great', 'amazing', 'wonderful', 'excellent', 'love', 'best', 'awesome', 'fantastic'];
  const positiveCount = positiveWords.filter(word => textLower.includes(word)).length;
  
  // Check for question words
  const questionWords = ['what', 'why', 'how', 'when', 'where', 'who'];
  const questionCount = questionWords.filter(word => textLower.includes(word)).length;
  
  // Check for professional words
  const professionalWords = ['strategy', 'solution', 'approach', 'method', 'process', 'system'];
  const professionalCount = professionalWords.filter(word => textLower.includes(word)).length;
  
  if (positiveCount >= 2) {
    tone.push('Positive and enthusiastic');
  }
  
  if (questionCount >= 2) {
    tone.push('Engaging and thought-provoking');
  }
  
  if (professionalCount >= 2) {
    tone.push('Professional and informative');
  }
  
  // Default tone assessment
  if (tone.length === 0) {
    const exclamationCount = (text.match(/!/g) || []).length;
    if (exclamationCount > 2) {
      tone.push('Energetic and enthusiastic');
    } else {
      tone.push('Neutral and informative');
    }
  }
  
  return tone.join(' - ') || 'Neutral';
}

/**
 * Generate an improved version of the content
 */
function generateImprovedVersion(text, wordCount) {
  let improved = text.trim();
  
  // Ensure it starts with a capital letter
  if (improved.length > 0) {
    improved = improved.charAt(0).toUpperCase() + improved.slice(1);
  }
  
  // Add a question at the end if it's short and doesn't have one
  if (wordCount < 100 && !improved.includes('?') && !improved.includes('!')) {
    improved += ' What do you think?';
  }
  
  // Ensure it ends with proper punctuation
  if (!/[.!?]$/.test(improved.trim())) {
    improved = improved.trim() + '.';
  }
  
  // Add line breaks for readability if it's a long single paragraph
  if (!improved.includes('\n') && wordCount > 100) {
    const sentences = improved.split(/([.!?]+)/);
    let formatted = '';
    for (let i = 0; i < sentences.length; i += 2) {
      if (sentences[i]) {
        formatted += sentences[i] + (sentences[i + 1] || '');
        if (i < sentences.length - 2) {
          formatted += '\n\n';
        }
      }
    }
    if (formatted) {
      improved = formatted;
    }
  }
  
  return improved.trim();
}

module.exports = { analyzeContent };
