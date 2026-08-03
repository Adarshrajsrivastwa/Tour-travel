const multer = require('multer');
const path = require('path');
const fs = require('fs');

console.log("📁 Using local storage");

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
  },
  fileFilter: (req, file, cb) => {
    // Allow all image types and PDFs
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and PDFs are allowed.'), false);
    }
  }
});

// Single file upload
const uploadSingle = (fieldName) => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      next();
    });
  };
};

// Multiple files upload
const uploadMultiple = (fieldName, maxCount = 5) => {
  return (req, res, next) => {
    upload.array(fieldName, maxCount)(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      next();
    });
  };
};

// Fields upload (for different file types)
const uploadFields = (fields) => {
  return (req, res, next) => {
    console.log("📁 ===== UPLOAD MIDDLEWARE =====");
    console.log("📋 Fields configuration:", JSON.stringify(fields, null, 2));
    console.log("🔍 Content-Type:", req.headers['content-type']);
    console.log("💾 Storage type:", "Local");
    
    upload.fields(fields)(req, res, (err) => {
      if (err) {
        console.log("❌ Upload error:", err.message);
        console.log("🔍 Error details:", err);
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      
      console.log("✅ Upload successful");
      console.log("📂 Files uploaded:", req.files ? Object.keys(req.files) : 'None');
      if (req.files) {
        Object.keys(req.files).forEach(key => {
          console.log(`  - ${key}:`, req.files[key].map(f => f.path || f.filename));
        });
      }
      console.log("📝 Body data:", req.body ? Object.keys(req.body) : 'None');
      next();
    });
  };
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadFields
};
