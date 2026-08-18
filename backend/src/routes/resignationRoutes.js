const express = require('express');
const router = express.Router();
const {
  raiseRequest,
  listRequests,
  getRequest,
  approveRequest,
  rejectRequest,
  relieveRequest,
  cancelRequest,
} = require('../controllers/resignationController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// HR + Admin (SUPER_ADMIN bypasses authorize)
router.post('/employees/:id', authorize('ADMIN', 'HR'), raiseRequest);
router.get('/', authorize('ADMIN', 'HR'), listRequests);
router.get('/:id', authorize('ADMIN', 'HR'), getRequest);
router.post('/:id/approve', authorize('ADMIN', 'HR'), approveRequest);
router.post('/:id/reject', authorize('ADMIN', 'HR'), rejectRequest);
router.post('/:id/relieve', authorize('ADMIN', 'HR'), relieveRequest);

// Admin only
router.post('/:id/cancel', authorize('ADMIN'), cancelRequest);

module.exports = router;
