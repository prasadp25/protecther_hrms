const express = require('express');
const router = express.Router();
const {
  startClearance,
  getClearance,
  listClearances,
  updateClearance,
  cancelClearance,
} = require('../controllers/clearanceController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// Create / view / edit — HR and Admin (SUPER_ADMIN bypasses authorize)
router.post('/employees/:id/start', authorize('ADMIN', 'HR'), startClearance);
router.get('/', authorize('ADMIN', 'HR'), listClearances);
router.get('/:id', authorize('ADMIN', 'HR'), getClearance);
router.put('/:id', authorize('ADMIN', 'HR'), updateClearance);

// Cancel — Admin only
router.post('/:id/cancel', authorize('ADMIN'), cancelClearance);

module.exports = router;
