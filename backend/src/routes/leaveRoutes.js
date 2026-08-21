const express = require('express');
const router = express.Router();
const {
  listLeaves, raiseLeave, approveLeave, rejectLeave, cancelLeave, monthSummary,
} = require('../controllers/leaveController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.use(authorize('ADMIN', 'HR'));

router.get('/', listLeaves);
router.get('/month/:month/summary', monthSummary);
router.post('/employees/:id', raiseLeave);
router.post('/:id/approve', approveLeave);
router.post('/:id/reject', rejectLeave);
router.post('/:id/cancel', cancelLeave);

module.exports = router;
