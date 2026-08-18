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

// State transitions — Admin only
router.post('/:fnfId/approve', authorize('ADMIN'), approveSettlement);
router.post('/:fnfId/pay', authorize('ADMIN'), paySettlement);
router.post('/:fnfId/cancel', authorize('ADMIN'), cancelSettlement);

module.exports = router;
