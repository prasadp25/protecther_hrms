const express = require('express');
const router = express.Router();
const {
  getAllCompanies,
  getActiveCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  getCompanyStats,
  getCompaniesSummary
} = require('../controllers/companyController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// GET routes - Most require SUPER_ADMIN
router.get('/', authorize('SUPER_ADMIN'), getAllCompanies);
router.get('/active', getActiveCompanies); // Available to all authenticated users (for company switcher)
router.get('/summary', authorize('SUPER_ADMIN'), getCompaniesSummary);
router.get('/:id', authorize('SUPER_ADMIN', 'ADMIN'), getCompanyById);
router.get('/:id/stats', authorize('SUPER_ADMIN', 'ADMIN'), getCompanyStats);

// POST routes - SUPER_ADMIN only
router.post('/', authorize('SUPER_ADMIN'), createCompany);

// PUT routes - SUPER_ADMIN only
router.put('/:id', authorize('SUPER_ADMIN'), updateCompany);

// DELETE routes - SUPER_ADMIN only
router.delete('/:id', authorize('SUPER_ADMIN'), deleteCompany);

module.exports = router;
