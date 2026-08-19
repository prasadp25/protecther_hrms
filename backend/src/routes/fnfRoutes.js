const express = require('express');
const router = express.Router();
const {
  createDraft,
  getSettlement,
  listSettlements,
  updateSettlement,
  approveSettlement,
  paySettlement,
  cancelSettlement,
} = require('../controllers/fnfController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// Create / view / edit — HR and Admin (SUPER_ADMIN bypasses authorize)
router.post('/employees/:id/draft', authorize('ADMIN', 'HR'), createDraft);
router.get('/', authorize('ADMIN', 'HR'), listSettlements);
router.get('/:fnfId', authorize('ADMIN', 'HR'), getSettlement);
router.put('/:fnfId', authorize('ADMIN', 'HR'), updateSettlement);

// Approve / mark-paid — HR and Admin (per client sign-off A4)
router.post('/:fnfId/approve', authorize('ADMIN', 'HR'), approveSettlement);
router.post('/:fnfId/pay', authorize('ADMIN', 'HR'), paySettlement);
// Cancel stays Admin-only
router.post('/:fnfId/cancel', authorize('ADMIN'), cancelSettlement);

module.exports = router;
