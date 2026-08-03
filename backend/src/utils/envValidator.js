/**
 * Validates required environment variables on startup
 * Throws error if critical variables are missing
 */
const validateEnv = () => {
  const required = [
    'JWT_SECRET',
    'MONGODB_URI',
  ];

  const missing = [];
  const warnings = [];

  // Check required variables
  required.forEach((key) => {
    if (!process.env[key]) {
      missing.push(key);
    }
  });

  // Check for weak JWT_SECRET
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET should be at least 32 characters long for production');
  }

  // Check for default/example values
  if (process.env.JWT_SECRET === 'your_super_secret_jwt_key_here') {
    warnings.push('JWT_SECRET is using default value - change it in production!');
  }

  if (process.env.MONGODB_URI && process.env.MONGODB_URI.includes('localhost')) {
    if (process.env.NODE_ENV === 'production') {
      warnings.push('MONGODB_URI points to localhost - not suitable for production');
    }
  }

  // Throw error if critical variables are missing
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }

  // Log warnings
  if (warnings.length > 0) {
    console.warn('⚠️  Environment variable warnings:');
    warnings.forEach((warning) => console.warn(`   - ${warning}`));
  }

  return true;
};

module.exports = { validateEnv };

