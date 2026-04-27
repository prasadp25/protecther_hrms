const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getInsuranceSettings,
  updateInsuranceSettings
} = require('../controllers/settingsController');

// All routes require authentication and ADMIN role
router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/insurance', getInsuranceSettings);
router.put('/insurance', updateInsuranceSettings);

module.exports = router;
