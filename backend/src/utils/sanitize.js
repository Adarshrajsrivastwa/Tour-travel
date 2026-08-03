/**
 * Sanitizes user input for use in MongoDB regex queries
 * Prevents NoSQL injection attacks
 */
const sanitizeRegex = (input) => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Escape special regex characters
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Sanitizes search query for safe MongoDB regex usage
 */
const sanitizeSearchQuery = (searchTerm) => {
  if (!searchTerm) return '';
  
  const sanitized = sanitizeRegex(searchTerm.trim());
  
  // Limit length to prevent DoS attacks
  return sanitized.substring(0, 100);
};

module.exports = {
  sanitizeRegex,
  sanitizeSearchQuery,
};

