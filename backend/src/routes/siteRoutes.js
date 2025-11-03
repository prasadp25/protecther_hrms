const express = require('express');
const router = express.Router();
const {
  getAllSites,
  getActiveSites,
  getSiteById,
  createSite,
  updateSite,
  deleteSite,
  getSiteStats
} = require('../controllers/siteController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// GET routes
router.get('/', getAllSites);
router.get('/active', getActiveSites);
router.get('/:id', getSiteById);
router.get('/:id/stats', getSiteStats);

// POST routes - Admin/HR only
router.post('/', authorize('ADMIN', 'HR'), createSite);

// PUT routes - Admin/HR only
router.put('/:id', authorize('ADMIN', 'HR'), updateSite);

// DELETE routes - Admin only
router.delete('/:id', authorize('ADMIN'), deleteSite);

module.exports = router;
