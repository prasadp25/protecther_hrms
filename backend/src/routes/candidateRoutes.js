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
  convertToEmployee,
  uploadOfferLetterFile
} = require('../controllers/candidateController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadSingle, handleUploadError } = require('../middleware/upload');

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
router.post('/:id/offer-letter-file', authorize('ADMIN', 'HR'), uploadSingle('offerLetter'), handleUploadError, uploadOfferLetterFile);

// PUT routes - Admin/HR only
router.put('/:id', authorize('ADMIN', 'HR'), updateCandidate);
router.put('/:id/status', authorize('ADMIN', 'HR'), updateCandidateStatus);

// DELETE routes - Admin only
router.delete('/:id', authorize('ADMIN'), deleteCandidate);

module.exports = router;
