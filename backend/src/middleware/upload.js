const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ==============================================
// CONFIGURE STORAGE
// ==============================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';

    // Determine folder based on fieldname
    if (file.fieldname === 'offerLetter') {
      uploadPath += 'offer-letters/';
    } else if (file.fieldname === 'aadhaarCard') {
      uploadPath += 'aadhaar-cards/';
    } else if (file.fieldname === 'panCard') {
      uploadPath += 'pan-cards/';
    } else {
      uploadPath += 'others/';
    }

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  }
});

// ==============================================
// FILE FILTER (validates both MIME type AND extension)
// ==============================================
const fileFilter = (req, file, cb) => {
  // Allowed MIME types
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png'
  ];

  // Allowed extensions (must match MIME type)
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];

  // Get file extension
  const ext = path.extname(file.originalname).toLowerCase();

  // Validate BOTH MIME type AND extension (prevents spoofing)
  const isMimeValid = allowedMimeTypes.includes(file.mimetype);
  const isExtValid = allowedExtensions.includes(ext);

  if (isMimeValid && isExtValid) {
    cb(null, true);
  } else {
    console.warn(`⚠️ File rejected: ${file.originalname} (MIME: ${file.mimetype}, Ext: ${ext})`);
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPG, and PNG files are allowed.'), false);
  }
};

// ==============================================
// UPLOAD MIDDLEWARE
// ==============================================
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB default
  }
});

// ==============================================
// UPLOAD FIELDS FOR EMPLOYEE DOCUMENTS
// ==============================================
const uploadEmployeeDocuments = upload.fields([
  { name: 'offerLetter', maxCount: 1 },
  { name: 'aadhaarCard', maxCount: 1 },
  { name: 'panCard', maxCount: 1 }
]);

// ==============================================
// SINGLE FILE UPLOAD
// ==============================================
const uploadSingle = (fieldName) => upload.single(fieldName);

// ==============================================
// MULTIPLE FILES UPLOAD
// ==============================================
const uploadMultiple = (fieldName, maxCount = 5) => upload.array(fieldName, maxCount);

// ==============================================
// ERROR HANDLER FOR MULTER
// ==============================================
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds the maximum limit of 5MB'
      });
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded'
      });
    }

    return res.status(400).json({
      success: false,
      message: 'File upload error',
      error: err.message
    });
  } else if (err) {
    // Other errors
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload failed'
    });
  }

  next();
};

module.exports = {
  upload,
  uploadEmployeeDocuments,
  uploadSingle,
  uploadMultiple,
  handleUploadError
};
