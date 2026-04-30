const { executeQuery } = require('../config/database');
const {
  parsePaginationParams,
  parseSortParams,
  parseSearchParams,
  buildPaginatedResponse
} = require('../utils/pagination');
const { asyncHandler } = require('../utils/errors');
const { getCompanyFilter } = require('../middleware/auth');
const { generateCandidateCode, generateOfferLetterRef } = require('../utils/helpers');

// ==============================================
// GET ALL CANDIDATES (with pagination)
// ==============================================
const getAllCandidates = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePaginationParams(req.query);
  const { sortBy, sortOrder } = parseSortParams(req.query,
    ['candidate_id', 'candidate_code', 'first_name', 'last_name', 'designation', 'status', 'created_at'],
    'created_at'
  );
  const { status, siteId, search } = parseSearchParams(req.query);

  let whereConditions = [];
  let params = [];

  const companyId = getCompanyFilter(req);
  if (companyId) {
    whereConditions.push('c.company_id = ?');
    params.push(companyId);
  }

  if (status) {
    whereConditions.push('c.status = ?');
    params.push(status);
  }

  if (siteId) {
    whereConditions.push('c.site_id = ?');
    params.push(siteId);
  }

  if (search) {
    whereConditions.push('(c.first_name LIKE ? OR c.last_name LIKE ? OR c.candidate_code LIKE ? OR c.mobile LIKE ?)');
    const searchParam = '%' + search + '%';
    params.push(searchParam, searchParam, searchParam, searchParam);
  }

  const whereClause = whereConditions.length > 0
    ? 'WHERE ' + whereConditions.join(' AND ')
    : '';

  const countQuery = 'SELECT COUNT(*) as total FROM candidates c ' + whereClause;
  const countResult = await executeQuery(countQuery, params);
  const total = countResult[0].total;

  const dataQuery = 'SELECT c.*, s.site_name, s.site_code FROM candidates c LEFT JOIN sites s ON c.site_id = s.site_id ' + whereClause + ' ORDER BY c.' + sortBy + ' ' + sortOrder + ' LIMIT ? OFFSET ?';
  const candidates = await executeQuery(dataQuery, [...params, limit, offset]);

  const response = buildPaginatedResponse(candidates, total, page, limit);
  res.json(response);
});

// ==============================================
// GET CANDIDATE BY ID
// ==============================================
const getCandidateById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const companyId = getCompanyFilter(req);

  let query = 'SELECT c.*, s.site_name, s.site_code FROM candidates c LEFT JOIN sites s ON c.site_id = s.site_id WHERE c.candidate_id = ?';
  const params = [id];

  if (companyId) {
    query += ' AND c.company_id = ?';
    params.push(companyId);
  }

  const candidates = await executeQuery(query, params);

  if (candidates.length === 0) {
    return res.status(404).json({ success: false, message: 'Candidate not found' });
  }

  res.status(200).json({ success: true, data: candidates[0] });
});

// ==============================================
// GET NEXT CANDIDATE CODE
// ==============================================
const getNextCandidateCode = asyncHandler(async (req, res) => {
  const lastCandidate = await executeQuery('SELECT candidate_code FROM candidates ORDER BY candidate_id DESC LIMIT 1');

  let nextCode = 'C0001';
  if (lastCandidate.length > 0) {
    nextCode = generateCandidateCode(lastCandidate[0].candidate_code);
  }

  res.status(200).json({ success: true, data: { nextCode } });
});

// ==============================================
// GET NEXT OFFER LETTER REFERENCE
// ==============================================
const getNextOfferLetterRef = asyncHandler(async (req, res) => {
  const companyId = getCompanyFilter(req);
  const currentYear = new Date().getFullYear();

  if (!companyId) {
    return res.status(400).json({ success: false, message: 'Company context is required' });
  }

  let sequence = await executeQuery('SELECT * FROM offer_letter_sequence WHERE company_id = ? AND year = ?', [companyId, currentYear]);

  let lastNumber = 100;
  if (sequence.length > 0) {
    lastNumber = sequence[0].last_number;
  }

  const nextRef = generateOfferLetterRef(currentYear, lastNumber);

  res.status(200).json({ success: true, data: { nextRef, year: currentYear, nextNumber: lastNumber + 1 } });
});


// ==============================================
// CREATE CANDIDATE
// ==============================================
const createCandidate = asyncHandler(async (req, res) => {
  const candidateData = req.body;
  const companyId = getCompanyFilter(req);

  if (!companyId && req.user.role !== 'SUPER_ADMIN') {
    return res.status(400).json({ success: false, message: 'Company context is required' });
  }

  const targetCompanyId = companyId || candidateData.company_id;
  if (!targetCompanyId) {
    return res.status(400).json({ success: false, message: 'Company ID is required' });
  }

  // Generate candidate code
  const lastCandidate = await executeQuery('SELECT candidate_code FROM candidates ORDER BY candidate_id DESC LIMIT 1');
  const candidateCode = lastCandidate.length > 0 ? generateCandidateCode(lastCandidate[0].candidate_code) : 'C0001';

  // Calculate salary components
  const basicSalary = parseFloat(candidateData.basic_salary) || 0;
  const hra = parseFloat(candidateData.hra) || 0;
  const conveyance = parseFloat(candidateData.conveyance_allowance) || 0;
  const otherAllowances = parseFloat(candidateData.other_allowances) || 0;

  // Bonus calculation: 8.33% of min(basic, 7000) if basic <= 21000
  // Bonus is INCLUDED in CTC, not added on top
  const bonusEligible = basicSalary <= 21000;
  const bonusBase = Math.min(basicSalary, 7000);
  const bonus = bonusEligible ? Math.round(bonusBase * 0.0833) : 0;

  // Gratuity calculation: 4.81% of Basic (Payment of Gratuity Act 1972)
  // Gratuity is INCLUDED in CTC, not added on top
  const gratuity = Math.round(basicSalary * 0.0481);

  // Gross includes bonus and gratuity (both are part of CTC)
  const grossSalary = basicSalary + hra + conveyance + otherAllowances + bonus + gratuity;

  const pfDeduction = parseFloat(candidateData.pf_deduction) || 1800;
  const ptDeduction = parseFloat(candidateData.pt_deduction) || 200;
  const mediclaim = parseFloat(candidateData.mediclaim_deduction) || 0;
  const totalDeductions = pfDeduction + ptDeduction + mediclaim;
  const netSalary = grossSalary - totalDeductions;
  const ctc = (grossSalary * 12) + (pfDeduction * 12);

  const query = 'INSERT INTO candidates (candidate_code, company_id, first_name, last_name, gender, mobile, email, dob, address, city, state, pincode, aadhaar_no, pan_no, designation, department, site_id, expected_joining_date, reporting_manager, ctc, basic_salary, hra, conveyance_allowance, other_allowances, bonus, gratuity, gross_salary, pf_deduction, pt_deduction, mediclaim_deduction, total_deductions, net_salary, probation_period, notice_period, status, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

  const params = [
    candidateCode, targetCompanyId, candidateData.first_name, candidateData.last_name, candidateData.gender,
    candidateData.mobile, candidateData.email || null, candidateData.dob || null,
    candidateData.address || null, candidateData.city || null, candidateData.state || null, candidateData.pincode || null,
    candidateData.aadhaar_no || null, candidateData.pan_no || null, candidateData.designation, candidateData.department,
    candidateData.site_id || null, candidateData.expected_joining_date || null, candidateData.reporting_manager || null,
    ctc, basicSalary, hra, conveyance, otherAllowances, bonus, gratuity, grossSalary,
    pfDeduction, ptDeduction, mediclaim, totalDeductions, netSalary,
    candidateData.probation_period || 6, candidateData.notice_period || 15, 'PENDING', candidateData.remarks || null
  ];

  const result = await executeQuery(query, params);

  res.status(201).json({
    success: true,
    message: 'Candidate created successfully',
    data: { candidate_id: result.insertId, candidate_code: candidateCode }
  });
});

// ==============================================
// UPDATE CANDIDATE
// ==============================================
const updateCandidate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const candidateData = req.body;
  const companyId = getCompanyFilter(req);

  let checkQuery = 'SELECT * FROM candidates WHERE candidate_id = ?';
  const checkParams = [id];

  if (companyId) {
    checkQuery += ' AND company_id = ?';
    checkParams.push(companyId);
  }

  const existing = await executeQuery(checkQuery, checkParams);

  if (existing.length === 0) {
    return res.status(404).json({ success: false, message: 'Candidate not found' });
  }

  // Recalculate salary
  const basicSalary = parseFloat(candidateData.basic_salary) || existing[0].basic_salary;
  const hra = parseFloat(candidateData.hra) || existing[0].hra;
  const conveyance = parseFloat(candidateData.conveyance_allowance) || existing[0].conveyance_allowance;
  const otherAllowances = parseFloat(candidateData.other_allowances) || existing[0].other_allowances;

  // Bonus calculation: 8.33% of min(basic, 7000) if basic <= 21000
  // Bonus is INCLUDED in CTC, not added on top
  const bonusEligible = basicSalary <= 21000;
  const bonusBase = Math.min(basicSalary, 7000);
  const bonus = bonusEligible ? Math.round(bonusBase * 0.0833) : 0;

  // Gratuity calculation: 4.81% of Basic (Payment of Gratuity Act 1972)
  // Gratuity is INCLUDED in CTC, not added on top
  const gratuity = Math.round(basicSalary * 0.0481);

  // Gross includes bonus and gratuity (both are part of CTC)
  const grossSalary = basicSalary + hra + conveyance + otherAllowances + bonus + gratuity;

  const pfDeduction = parseFloat(candidateData.pf_deduction) || existing[0].pf_deduction;
  const ptDeduction = parseFloat(candidateData.pt_deduction) || existing[0].pt_deduction;
  const mediclaim = parseFloat(candidateData.mediclaim_deduction) || existing[0].mediclaim_deduction;
  const totalDeductions = pfDeduction + ptDeduction + mediclaim;
  const netSalary = grossSalary - totalDeductions;
  const ctc = (grossSalary * 12) + (pfDeduction * 12);

  const query = 'UPDATE candidates SET first_name = ?, last_name = ?, gender = ?, mobile = ?, email = ?, dob = ?, address = ?, city = ?, state = ?, pincode = ?, aadhaar_no = ?, pan_no = ?, designation = ?, department = ?, site_id = ?, expected_joining_date = ?, reporting_manager = ?, ctc = ?, basic_salary = ?, hra = ?, conveyance_allowance = ?, other_allowances = ?, bonus = ?, gratuity = ?, gross_salary = ?, pf_deduction = ?, pt_deduction = ?, mediclaim_deduction = ?, total_deductions = ?, net_salary = ?, probation_period = ?, notice_period = ?, status = ?, remarks = ? WHERE candidate_id = ?';

  const params = [
    candidateData.first_name || existing[0].first_name, candidateData.last_name || existing[0].last_name,
    candidateData.gender || existing[0].gender, candidateData.mobile || existing[0].mobile,
    candidateData.email || existing[0].email, candidateData.dob || existing[0].dob,
    candidateData.address || existing[0].address, candidateData.city || existing[0].city,
    candidateData.state || existing[0].state, candidateData.pincode || existing[0].pincode,
    candidateData.aadhaar_no || existing[0].aadhaar_no, candidateData.pan_no || existing[0].pan_no,
    candidateData.designation || existing[0].designation, candidateData.department || existing[0].department,
    candidateData.site_id || existing[0].site_id,
    candidateData.expected_joining_date || existing[0].expected_joining_date,
    candidateData.reporting_manager || existing[0].reporting_manager,
    ctc, basicSalary, hra, conveyance, otherAllowances, bonus, gratuity, grossSalary,
    pfDeduction, ptDeduction, mediclaim, totalDeductions, netSalary,
    candidateData.probation_period || existing[0].probation_period,
    candidateData.notice_period || existing[0].notice_period,
    candidateData.status || existing[0].status,
    candidateData.remarks || existing[0].remarks, id
  ];

  await executeQuery(query, params);

  res.status(200).json({ success: true, message: 'Candidate updated successfully' });
});

// ==============================================
// DELETE CANDIDATE
// ==============================================
const deleteCandidate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const companyId = getCompanyFilter(req);

  let checkQuery = 'SELECT * FROM candidates WHERE candidate_id = ?';
  const checkParams = [id];

  if (companyId) {
    checkQuery += ' AND company_id = ?';
    checkParams.push(companyId);
  }

  const existing = await executeQuery(checkQuery, checkParams);

  if (existing.length === 0) {
    return res.status(404).json({ success: false, message: 'Candidate not found' });
  }

  if (existing[0].status === 'CONVERTED') {
    return res.status(400).json({ success: false, message: 'Cannot delete a converted candidate' });
  }

  await executeQuery('DELETE FROM candidates WHERE candidate_id = ?', [id]);

  res.status(200).json({ success: true, message: 'Candidate deleted successfully' });
});


// ==============================================
// GENERATE OFFER LETTER
// ==============================================
const generateOfferLetter = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const companyId = getCompanyFilter(req);
  const { offer_letter_date } = req.body;

  let query = 'SELECT c.*, s.site_name, s.location as site_location FROM candidates c LEFT JOIN sites s ON c.site_id = s.site_id WHERE c.candidate_id = ?';
  const params = [id];

  if (companyId) {
    query += ' AND c.company_id = ?';
    params.push(companyId);
  }

  const candidates = await executeQuery(query, params);

  if (candidates.length === 0) {
    return res.status(404).json({ success: false, message: 'Candidate not found' });
  }

  const candidate = candidates[0];
  const currentYear = new Date().getFullYear();

  let offerLetterRef = candidate.offer_letter_ref;

  if (!offerLetterRef) {
    let sequence = await executeQuery('SELECT * FROM offer_letter_sequence WHERE company_id = ? AND year = ?', [candidate.company_id, currentYear]);

    let lastNumber = 100;
    if (sequence.length > 0) {
      lastNumber = sequence[0].last_number;
      await executeQuery('UPDATE offer_letter_sequence SET last_number = ? WHERE company_id = ? AND year = ?', [lastNumber + 1, candidate.company_id, currentYear]);
    } else {
      await executeQuery('INSERT INTO offer_letter_sequence (company_id, year, last_number) VALUES (?, ?, ?)', [candidate.company_id, currentYear, 101]);
    }

    offerLetterRef = generateOfferLetterRef(currentYear, lastNumber);

    await executeQuery('UPDATE candidates SET offer_letter_ref = ?, offer_letter_date = ?, status = ? WHERE candidate_id = ?', [offerLetterRef, offer_letter_date || new Date(), 'OFFERED', id]);
  }

  res.status(200).json({
    success: true,
    message: 'Offer letter generated successfully',
    data: { ...candidate, offer_letter_ref: offerLetterRef, offer_letter_date: offer_letter_date || new Date() }
  });
});

// ==============================================
// UPDATE CANDIDATE STATUS
// ==============================================
const updateCandidateStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const companyId = getCompanyFilter(req);

  const validStatuses = ['PENDING', 'OFFERED', 'ACCEPTED', 'REJECTED', 'NEGOTIATING', 'CONVERTED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  let checkQuery = 'SELECT * FROM candidates WHERE candidate_id = ?';
  const checkParams = [id];

  if (companyId) {
    checkQuery += ' AND company_id = ?';
    checkParams.push(companyId);
  }

  const existing = await executeQuery(checkQuery, checkParams);

  if (existing.length === 0) {
    return res.status(404).json({ success: false, message: 'Candidate not found' });
  }

  await executeQuery('UPDATE candidates SET status = ? WHERE candidate_id = ?', [status, id]);

  res.status(200).json({ success: true, message: 'Candidate status updated successfully' });
});

// ==============================================
// CONVERT CANDIDATE TO EMPLOYEE
// ==============================================
const convertToEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const additionalData = req.body;
  const companyId = getCompanyFilter(req);

  let query = 'SELECT * FROM candidates WHERE candidate_id = ?';
  const params = [id];

  if (companyId) {
    query += ' AND company_id = ?';
    params.push(companyId);
  }

  const candidates = await executeQuery(query, params);

  if (candidates.length === 0) {
    return res.status(404).json({ success: false, message: 'Candidate not found' });
  }

  const candidate = candidates[0];

  if (candidate.status === 'CONVERTED') {
    return res.status(400).json({ success: false, message: 'Candidate already converted to employee' });
  }

  if (candidate.status !== 'ACCEPTED') {
    return res.status(400).json({ success: false, message: 'Only accepted candidates can be converted to employees' });
  }

  if (!additionalData.aadhaar_no || !additionalData.pan_no || !additionalData.date_of_joining) {
    return res.status(400).json({ success: false, message: 'Aadhaar, PAN, and Date of Joining are required for conversion' });
  }

  // Generate employee code
  const lastEmployee = await executeQuery('SELECT employee_code FROM employees ORDER BY employee_id DESC LIMIT 1');
  let employeeCode = 'P0001';
  if (lastEmployee.length > 0) {
    const num = parseInt(lastEmployee[0].employee_code.replace(/[^0-9]/g, '')) + 1;
    employeeCode = 'P' + String(num).padStart(4, '0');
  }

  // Insert employee
  const employeeQuery = 'INSERT INTO employees (company_id, employee_code, first_name, last_name, mobile, email, dob, gender, address, city, state, pincode, aadhaar_no, pan_no, designation, department, date_of_joining, offer_letter_issue_date, offer_letter_url, site_id, status, emergency_contact_name, emergency_contact_mobile, emergency_contact_relationship, account_number, ifsc_code, bank_name, branch_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

  const employeeParams = [
    candidate.company_id, employeeCode, candidate.first_name, candidate.last_name,
    candidate.mobile, candidate.email, candidate.dob, candidate.gender,
    candidate.address, candidate.city, candidate.state, candidate.pincode,
    additionalData.aadhaar_no, additionalData.pan_no, candidate.designation, candidate.department,
    additionalData.date_of_joining, candidate.offer_letter_date, candidate.offer_letter_url,
    candidate.site_id, 'ACTIVE',
    additionalData.emergency_contact_name || null, additionalData.emergency_contact_mobile || null,
    additionalData.emergency_contact_relationship || null,
    additionalData.account_number || null, additionalData.ifsc_code || null,
    additionalData.bank_name || null, additionalData.branch_name || null
  ];

  const employeeResult = await executeQuery(employeeQuery, employeeParams);
  const employeeId = employeeResult.insertId;

  // Create salary structure
  const salaryQuery = 'INSERT INTO salaries (company_id, employee_id, basic_salary, hra, conveyance_allowance, incentive_allowance, gross_salary, pf_deduction, professional_tax, total_deductions, net_salary, effective_from, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

  const salaryParams = [
    candidate.company_id, employeeId, candidate.basic_salary, candidate.hra,
    candidate.conveyance_allowance, candidate.other_allowances || 0, candidate.gross_salary,
    candidate.pf_deduction, candidate.pt_deduction, candidate.total_deductions, candidate.net_salary,
    additionalData.date_of_joining, 'ACTIVE'
  ];

  await executeQuery(salaryQuery, salaryParams);

  // Update candidate status
  await executeQuery('UPDATE candidates SET status = ?, converted_employee_id = ?, converted_at = NOW() WHERE candidate_id = ?', ['CONVERTED', employeeId, id]);

  res.status(201).json({
    success: true,
    message: 'Candidate converted to employee successfully',
    data: { employee_id: employeeId, employee_code: employeeCode }
  });
});

module.exports = {
  getAllCandidates,
  getCandidateById,
  getNextCandidateCode,
  getNextOfferLetterRef,
  createCandidate,
  updateCandidate,
  deleteCandidate,
  generateOfferLetter,
  updateCandidateStatus,
  convertToEmployee
};
