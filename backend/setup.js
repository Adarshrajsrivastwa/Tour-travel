#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Bus Booking System Backend...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, 'env.example');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    console.log('📝 Creating .env file from env.example...');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created successfully!');
    console.log('⚠️  Please update the .env file with your actual configuration values.\n');
  } else {
    console.log('❌ env.example file not found!');
    process.exit(1);
  }
} else {
  console.log('✅ .env file already exists.\n');
}

// Create uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  console.log('📁 Creating uploads directory...');
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ uploads directory created successfully!\n');
} else {
  console.log('✅ uploads directory already exists.\n');
}

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 16) {
  console.log('❌ Node.js version 16 or higher is required!');
  console.log(`   Current version: ${nodeVersion}`);
  console.log('   Please upgrade Node.js and try again.\n');
  process.exit(1);
} else {
  console.log(`✅ Node.js version ${nodeVersion} is compatible.\n`);
}

console.log('🎉 Setup completed successfully!');
console.log('\n📋 Next steps:');
console.log('1. Update your .env file with the correct configuration');
console.log('2. Make sure MongoDB is running');
console.log('3. Install dependencies: npm install');
console.log('4. Start the server: npm run dev');
console.log('\n🔗 Useful URLs:');
console.log('- Health check: http://localhost:5000/health');
console.log('- API Base: http://localhost:5000/api');
console.log('- Documentation: Check README.md');
console.log('\n📚 For more information, check the README.md file.');
