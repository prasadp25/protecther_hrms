const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getAllNotices,
  getNoticeById,
  createNotice,
  updateNotice,
  deleteNotice
} = require('../controllers/noticeController');

// All routes require authentication and ADMIN/HR role
router.use(authenticate);
router.use(authorize('ADMIN', 'HR'));

router.get('/', getAllNotices);
router.get('/:id', getNoticeById);
router.post('/', createNotice);
router.put('/:id', updateNotice);
router.delete('/:id', deleteNotice);

module.exports = router;
