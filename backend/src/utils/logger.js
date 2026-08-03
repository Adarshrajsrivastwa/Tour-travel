const logger = {
  // Only log in development mode
  isDevelopment: process.env.NODE_ENV === 'development',

  info: (...args) => {
    if (logger.isDevelopment) {
      console.log(...args);
    }
  },

  error: (...args) => {
    // Always log errors, even in production
    console.error(...args);
  },

  warn: (...args) => {
    if (logger.isDevelopment) {
      console.warn(...args);
    }
  },

  debug: (...args) => {
    if (logger.isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },
};

module.exports = logger;

