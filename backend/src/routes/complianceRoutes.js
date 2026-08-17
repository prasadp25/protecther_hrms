const express = require('express');
const router = express.Router();
const {
  getBonusRegister,
  getBonusFormC,
  getGratuityLiability,
  getPFRegister,
  getESIRegister,
  getPTRegister,
  getEpsExempt,
  setEpsExempt,
} = require('../controllers/complianceController');
const { authenticate, authorize } = require('../middleware/auth');

// Statutory registers — Admin/HR (SUPER_ADMIN bypasses authorize)
router.use(authenticate);
router.use(authorize('ADMIN', 'HR'));

router.get('/bonus', getBonusRegister);        // ?month=YYYY-MM | ?year=YYYY
router.get('/bonus/form-c', getBonusFormC);     // ?fy=YYYY (accounting year Apr fy - Mar fy+1)
router.get('/gratuity', getGratuityLiability);  // cumulative
router.get('/pf', getPFRegister);               // ?month=YYYY-MM
router.get('/esi', getESIRegister);             // ?month=YYYY-MM
router.get('/pt', getPTRegister);               // ?month=YYYY-MM
router.get('/eps-exempt', getEpsExempt);         // list EPS-exempt members
router.post('/eps-exempt', setEpsExempt);        // bulk set/clear EPS-exempt flag

module.exports = router;
