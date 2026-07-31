const express = require('express');
const router = express.Router();
const {
  getAdvances,
  createAdvance,
  cancelAdvance,
  getAdvanceRecoveries
} = require('../controllers/advanceController');
const { authenticate, authorize } = require('../middleware/auth');

// All advance routes require authentication + ADMIN/HR
router.use(authenticate);

router.get('/', authorize('ADMIN', 'HR'), getAdvances);
router.post('/', authorize('ADMIN', 'HR'), createAdvance);
router.get('/:id/recoveries', authorize('ADMIN', 'HR'), getAdvanceRecoveries);
router.put('/:id/cancel', authorize('ADMIN', 'HR'), cancelAdvance);

module.exports = router;
