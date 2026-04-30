const express = require('express');
const router = express.Router();
const {
  getAllCandidates,
  getCandidateById,
  getNextCandidateCode,
  getNextOfferLetterRef,
  createCandidate,
  updateCandidate,
  deleteCandidate,
  generateOfferLetter,
  updateCandidateStatus,
  convertToEmployee
} = require('../controllers/candidateController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// GET routes
router.get('/', getAllCandidates);
router.get('/next-code', getNextCandidateCode);
router.get('/next-offer-ref', getNextOfferLetterRef);
router.get('/:id', getCandidateById);

// POST routes - Admin/HR only
router.post('/', authorize('ADMIN', 'HR'), createCandidate);
router.post('/:id/generate-offer-letter', authorize('ADMIN', 'HR'), generateOfferLetter);
router.post('/:id/convert-to-employee', authorize('ADMIN', 'HR'), convertToEmployee);

// PUT routes - Admin/HR only
router.put('/:id', authorize('ADMIN', 'HR'), updateCandidate);
router.put('/:id/status', authorize('ADMIN', 'HR'), updateCandidateStatus);

// DELETE routes - Admin only
router.delete('/:id', authorize('ADMIN'), deleteCandidate);

module.exports = router;
