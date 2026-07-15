const express = require('express');
const router = express.Router();
const { generateECR, previewECR } = require('../controllers/ecrController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// ECR routes - Admin/HR can access
// GET /api/v1/ecr/preview/:month - Preview ECR data as JSON
router.get('/preview/:month', authorize('ADMIN', 'HR'), previewECR);

// GET /api/v1/ecr/generate/:month - Generate and download ECR text file
router.get('/generate/:month', authorize('ADMIN', 'HR'), generateECR);

module.exports = router;
