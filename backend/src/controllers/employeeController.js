const path = require('path');
const fs = require('fs');
const { executeQuery, withTransaction } = require('../config/database');
const {
  parsePaginationParams,
  parseSortParams,
  parseSearchParams,
  buildPaginatedResponse
} = require('../utils/pagination');
const { asyncHandler } = require('../utils/errors');
const { getCompanyFilter } = require('../middleware/auth');
const { validateEmployeeData } = require('../utils/validators');
const { logEmployeeCreate, logEmployeeUpdate, logEmployeeDelete } = require('../utils/auditLogger');

// Mask identity/bank numbers for list responses; full values are only
// returned by getEmployeeById (ADMIN/HR-only), which the edit form uses.
const maskEmployeePII = (emp) => ({
  ...emp,
  aadhaar_no: emp.aadhaar_no ? 'XXXX-XXXX-' + String(emp.aadhaar_no).slice(-4) : emp.aadhaar_no,
  pan_no: emp.pan_no ? 'XXXXXX' + String(emp.pan_no).slice(-4) : emp.pan_no,
  account_number: emp.account_number ? 'XXXX' + String(emp.account_number).slice(-4) : emp.account_number
});

// ==============================================
// GET ALL EMPLOYEES (with pagination)
// ==============================================
const getAllEmployees = asyncHandler(async (req, res) => {
  // Parse pagination, sort, and search parameters
  const { page, limit, offset } = parsePaginationParams(req.query);
  const { sortBy, sortOrder } = parseSortParams(req.query,
    ['employee_id', 'employee_code', 'first_name', 'last_name', 'designation', 'status', 'created_at'],
    'created_at'
  );
  const { status, siteId, designation, search } = parseSearchParams(req.query);

  // Build WHERE clause
  let whereConditions = [];
  let params = [];

  // Company filter - restrict to user's company
  const companyId = getCompanyFilter(req);
  if (companyId) {
    whereConditions.push('e.company_id = ?');
    params.push(companyId);
  }

  if (status) {
    whereConditions.push('e.status = ?');
    params.push(status);
  }

  if (siteId) {
    whereConditions.push('e.site_id = ?');
    params.push(siteId);
  }

  if (designation) {
    whereConditions.push('e.designation = ?');
    params.push(designation);
  }

  if (search) {
    whereConditions.push('(e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ? OR e.mobile LIKE ?)');
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam, searchParam);
  }

  const whereClause = whereConditions.length > 0
    ? 'WHERE ' + whereConditions.join(' AND ')
    : '';

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM employees e
    ${whereClause}
  `;
  const countResult = await executeQuery(countQuery, params);
  const total = countResult[0].total;

  // Get paginated data (includes salary status)
  const dataQuery = `
    SELECT e.*, s.site_name, s.site_code,
           CASE WHEN sal.salary_id IS NOT NULL THEN 1 ELSE 0 END as has_salary
    FROM employees e
    LEFT JOIN sites s ON e.site_id = s.site_id
    LEFT JOIN salaries sal ON e.employee_id = sal.employee_id AND sal.status = 'ACTIVE'
    ${whereClause}
    ORDER BY e.${sortBy} ${sortOrder}
    LIMIT ? OFFSET ?
  `;
  const employees = await executeQuery(dataQuery, [...params, limit, offset]);

  // Send paginated response with masked PII
  const response = buildPaginatedResponse(employees.map(maskEmployeePII), total, page, limit);
  res.json(response);
});

// ==============================================
// GET ACTIVE EMPLOYEES
// ==============================================
const getActiveEmployees = async (req, res) => {
  try {
    const companyId = getCompanyFilter(req);
    let query = `
      SELECT e.*, s.site_name, s.site_code,
             c.company_name, c.address AS company_address, c.city AS company_city,
             c.state AS company_state, c.pincode AS company_pincode
      FROM employees e
      LEFT JOIN sites s ON e.site_id = s.site_id
      LEFT JOIN companies c ON e.company_id = c.company_id
      WHERE e.status = 'ACTIVE'
    `;
    const params = [];

    if (companyId) {
      query += ` AND e.company_id = ?`;
      params.push(companyId);
    }

    query += ` ORDER BY e.first_name, e.last_name`;

    const employees = await executeQuery(query, params);

    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees.map(maskEmployeePII)
    });
  } catch (error) {
    console.error('Get active employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active employees',
      error: error.message
    });
  }
};

// ==============================================
// GET EMPLOYEES WITHOUT ACTIVE SALARY
// ==============================================
const getEmployeesWithoutSalary = async (req, res) => {
  try {
    const companyId = getCompanyFilter(req);
    let query = `
      SELECT e.*, s.site_name, s.site_code
      FROM employees e
      LEFT JOIN sites s ON e.site_id = s.site_id
      LEFT JOIN salaries sal ON e.employee_id = sal.employee_id AND sal.status = 'ACTIVE'
      WHERE e.status = 'ACTIVE' AND sal.salary_id IS NULL
    `;
    const params = [];

    if (companyId) {
      query += ` AND e.company_id = ?`;
      params.push(companyId);
    }

    query += ` ORDER BY e.first_name, e.last_name`;

    const employees = await executeQuery(query, params);

    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees.map(maskEmployeePII)
    });
  } catch (error) {
    console.error('Get employees without salary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employees without salary',
      error: error.message
    });
  }
};

// ==============================================
// GET EMPLOYEE BY ID
// ==============================================
const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = getCompanyFilter(req);

    let query = `
      SELECT e.*, s.site_name, s.site_code
      FROM employees e
      LEFT JOIN sites s ON e.site_id = s.site_id
      WHERE e.employee_id = ?
    `;
    const params = [id];

    if (companyId) {
      query += ` AND e.company_id = ?`;
      params.push(companyId);
    }

    const employees = await executeQuery(query, params);

    if (employees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.status(200).json({
      success: true,
      data: employees[0]
    });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employee',
      error: error.message
    });
  }
};

// ==============================================
// CREATE EMPLOYEE
// ==============================================
const createEmployee = async (req, res) => {
  try {
    let employeeData = req.body;
    const companyId = getCompanyFilter(req);

    // For non-SUPER_ADMIN users, company_id is required
    if (!companyId && req.user.role !== 'SUPER_ADMIN') {
      return res.status(400).json({
        success: false,
        message: 'Company context is required'
      });
    }

    // SUPER_ADMIN must provide company_id in request body
    const targetCompanyId = companyId || employeeData.company_id;
    if (!targetCompanyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required'
      });
    }

    // Validate employee data (Aadhaar, PAN, Mobile, etc.)
    const validation = validateEmployeeData(employeeData);
    if (!validation.valid) {
      console.log('❌ Employee validation failed:', validation.errors);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }
    // Use cleaned/validated data
    employeeData = { ...employeeData, ...validation.data };

    // Check if Mobile number already exists in ANY company (one person = one company only)
    if (employeeData.mobile) {
      const mobileCheck = await executeQuery(
        `SELECT e.employee_id, e.first_name, e.last_name, c.company_name
         FROM employees e
         LEFT JOIN companies c ON e.company_id = c.company_id
         WHERE e.mobile = ?`,
        [employeeData.mobile]
      );
      if (mobileCheck.length > 0) {
        const existingEmp = mobileCheck[0];
        return res.status(409).json({
          success: false,
          message: `This mobile number is already registered to ${existingEmp.first_name} ${existingEmp.last_name}${existingEmp.company_name ? ` (${existingEmp.company_name})` : ''}.`
        });
      }
    }

    // Check if Aadhaar number already exists in ANY company (one person = one company only)
    if (employeeData.aadhaar_no) {
      const aadhaarCheck = await executeQuery(
        `SELECT e.employee_id, e.first_name, e.last_name, c.company_name
         FROM employees e
         LEFT JOIN companies c ON e.company_id = c.company_id
         WHERE e.aadhaar_no = ?`,
        [employeeData.aadhaar_no]
      );
      if (aadhaarCheck.length > 0) {
        const existingEmp = aadhaarCheck[0];
        return res.status(409).json({
          success: false,
          message: `This Aadhaar number is already registered to ${existingEmp.first_name} ${existingEmp.last_name}${existingEmp.company_name ? ` (${existingEmp.company_name})` : ''}.`
        });
      }
    }

    // Check if PAN number already exists in ANY company (one person = one company only)
    if (employeeData.pan_no) {
      const panCheck = await executeQuery(
        `SELECT e.employee_id, e.first_name, e.last_name, c.company_name
         FROM employees e
         LEFT JOIN companies c ON e.company_id = c.company_id
         WHERE e.pan_no = ?`,
        [employeeData.pan_no]
      );
      if (panCheck.length > 0) {
        const existingEmp = panCheck[0];
        return res.status(409).json({
          success: false,
          message: `This PAN number is already registered to ${existingEmp.first_name} ${existingEmp.last_name}${existingEmp.company_name ? ` (${existingEmp.company_name})` : ''}.`
        });
      }
    }

    // Generate employee code if not provided
    if (!employeeData.employee_code) {
      const lastEmployee = await executeQuery(
        'SELECT employee_code FROM employees ORDER BY employee_id DESC LIMIT 1'
      );

      if (lastEmployee.length > 0) {
        const lastCode = lastEmployee[0].employee_code;
        const num = parseInt(lastCode.replace(/[^0-9]/g, '')) + 1;
        employeeData.employee_code = `P${String(num).padStart(5, '0')}`;
      } else {
        employeeData.employee_code = 'P00001';
      }
    }

    // Handle file uploads (if any)
    if (req.files) {
      if (req.files.offerLetter) {
        employeeData.offer_letter_url = `/uploads/offer-letters/${req.files.offerLetter[0].filename}`;
      }
      if (req.files.aadhaarCard) {
        employeeData.aadhaar_card_url = `/uploads/aadhaar-cards/${req.files.aadhaarCard[0].filename}`;
      }
      if (req.files.panCard) {
        employeeData.pan_card_url = `/uploads/pan-cards/${req.files.panCard[0].filename}`;
      }
      if (req.files.employeePhoto) {
        employeeData.photo_url = `/uploads/employee-photos/${req.files.employeePhoto[0].filename}`;
      }
    }

    const query = `
      INSERT INTO employees (
        company_id, employee_code, first_name, last_name, mobile, alternate_mobile, email,
        photo_url, dob, gender, marital_status, qualification, address, city, state, pincode,
        aadhaar_no, aadhaar_card_url, pan_no, pan_card_url, uan_no, pf_no, esi_no,
        account_number, ifsc_code, bank_name, branch_name,
        designation, department, date_of_joining, date_of_leaving,
        offer_letter_issue_date, offer_letter_url, status, site_id,
        emergency_contact_name, emergency_contact_mobile, emergency_contact_relationship,
        wp_policy, hospital_insurance_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      targetCompanyId,
      employeeData.employee_code,
      employeeData.first_name,
      employeeData.last_name,
      employeeData.mobile,
      employeeData.alternate_mobile || null,
      employeeData.email || null,
      employeeData.photo_url || null,
      employeeData.dob || null,
      employeeData.gender || null,
      employeeData.marital_status || null,
      employeeData.qualification || null,
      employeeData.address || null,
      employeeData.city || null,
      employeeData.state || null,
      employeeData.pincode || null,
      employeeData.aadhaar_no || null,
      employeeData.aadhaar_card_url || null,
      employeeData.pan_no || null,
      employeeData.pan_card_url || null,
      employeeData.uan_no || null,
      employeeData.pf_no || null,
      employeeData.esi_no || null,
      employeeData.account_number || null,
      employeeData.ifsc_code || null,
      employeeData.bank_name || null,
      employeeData.branch_name || null,
      employeeData.designation || null,
      employeeData.department || null,
      employeeData.date_of_joining || null,
      employeeData.date_of_leaving || null,
      employeeData.offer_letter_issue_date || null,
      employeeData.offer_letter_url || null,
      employeeData.status || 'ACTIVE',
      employeeData.site_id || null,
      employeeData.emergency_contact_name || null,
      employeeData.emergency_contact_mobile || null,
      employeeData.emergency_contact_relationship || null,
      employeeData.wp_policy || 'No',
      employeeData.hospital_insurance_id || null
    ];

    const result = await executeQuery(query, params);

    // Log audit trail
    await logEmployeeCreate(result.insertId, employeeData, req);

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: {
        employee_id: result.insertId,
        employee_code: employeeData.employee_code
      }
    });
  } catch (error) {
    console.error('Create employee error:', error);

    // Handle duplicate key errors
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Employee with this code, Aadhaar, or PAN already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create employee',
      error: error.message
    });
  }
};

// ==============================================
// UPDATE EMPLOYEE
// ==============================================
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const employeeData = req.body;
    const companyId = getCompanyFilter(req);

    // Get existing employee data (for audit log)
    let checkQuery = 'SELECT * FROM employees WHERE employee_id = ?';
    const checkParams = [id];

    if (companyId) {
      checkQuery += ' AND company_id = ?';
      checkParams.push(companyId);
    }

    const existing = await executeQuery(checkQuery, checkParams);

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Store old values for audit
    const oldEmployeeData = existing[0];

    // Check for duplicate Mobile in ANY company (excluding current employee)
    if (employeeData.mobile && employeeData.mobile !== oldEmployeeData.mobile) {
      const mobileCheck = await executeQuery(
        `SELECT e.employee_id, e.first_name, e.last_name, c.company_name
         FROM employees e
         LEFT JOIN companies c ON e.company_id = c.company_id
         WHERE e.mobile = ? AND e.employee_id != ?`,
        [employeeData.mobile, id]
      );
      if (mobileCheck.length > 0) {
        const existingEmp = mobileCheck[0];
        return res.status(409).json({
          success: false,
          message: `This mobile number is already registered to ${existingEmp.first_name} ${existingEmp.last_name}${existingEmp.company_name ? ` (${existingEmp.company_name})` : ''}.`
        });
      }
    }

    // Check for duplicate Aadhaar in ANY company (excluding current employee)
    if (employeeData.aadhaar_no && employeeData.aadhaar_no !== oldEmployeeData.aadhaar_no) {
      const aadhaarCheck = await executeQuery(
        `SELECT e.employee_id, e.first_name, e.last_name, c.company_name
         FROM employees e
         LEFT JOIN companies c ON e.company_id = c.company_id
         WHERE e.aadhaar_no = ? AND e.employee_id != ?`,
        [employeeData.aadhaar_no, id]
      );
      if (aadhaarCheck.length > 0) {
        const existingEmp = aadhaarCheck[0];
        return res.status(409).json({
          success: false,
          message: `This Aadhaar number is already registered to ${existingEmp.first_name} ${existingEmp.last_name}${existingEmp.company_name ? ` (${existingEmp.company_name})` : ''}.`
        });
      }
    }

    // Check for duplicate PAN in ANY company (excluding current employee)
    if (employeeData.pan_no && employeeData.pan_no !== oldEmployeeData.pan_no) {
      const panCheck = await executeQuery(
        `SELECT e.employee_id, e.first_name, e.last_name, c.company_name
         FROM employees e
         LEFT JOIN companies c ON e.company_id = c.company_id
         WHERE e.pan_no = ? AND e.employee_id != ?`,
        [employeeData.pan_no, id]
      );
      if (panCheck.length > 0) {
        const existingEmp = panCheck[0];
        return res.status(409).json({
          success: false,
          message: `This PAN number is already registered to ${existingEmp.first_name} ${existingEmp.last_name}${existingEmp.company_name ? ` (${existingEmp.company_name})` : ''}.`
        });
      }
    }

    // Handle file uploads
    if (req.files) {
      if (req.files.offerLetter) {
        employeeData.offer_letter_url = `/uploads/offer-letters/${req.files.offerLetter[0].filename}`;
      }
      if (req.files.aadhaarCard) {
        employeeData.aadhaar_card_url = `/uploads/aadhaar-cards/${req.files.aadhaarCard[0].filename}`;
      }
      if (req.files.panCard) {
        employeeData.pan_card_url = `/uploads/pan-cards/${req.files.panCard[0].filename}`;
      }
      if (req.files.employeePhoto) {
        employeeData.photo_url = `/uploads/employee-photos/${req.files.employeePhoto[0].filename}`;
      }
    }

    // Map frontend field names to database column names
    const fieldMapping = {
      'offerLetter': 'offer_letter_url',
      'aadhaarCard': 'aadhaar_card_url',
      'panCard': 'pan_card_url',
      'employeePhoto': 'photo_url',
      'alternateMobile': 'alternate_mobile',
      'maritalStatus': 'marital_status',
      'aadhaarNo': 'aadhaar_no',
      'panNo': 'pan_no',
      'uanNo': 'uan_no',
      'pfNo': 'pf_no',
      'esiNo': 'esi_no',
      'accountNumber': 'account_number',
      'ifscCode': 'ifsc_code',
      'bankName': 'bank_name',
      'branchName': 'branch_name',
      'dateOfJoining': 'date_of_joining',
      'dateOfLeaving': 'date_of_leaving',
      'offerLetterIssueDate': 'offer_letter_issue_date',
      'siteId': 'site_id',
      'emergencyContactName': 'emergency_contact_name',
      'emergencyContactMobile': 'emergency_contact_mobile',
      'emergencyContactRelationship': 'emergency_contact_relationship',
      'wpPolicy': 'wp_policy',
      'hospitalInsuranceId': 'hospital_insurance_id',
      'firstName': 'first_name',
      'lastName': 'last_name'
    };

    // Build update query dynamically
    const fields = [];
    const values = [];

    Object.keys(employeeData).forEach(key => {
      if (employeeData[key] !== undefined && key !== 'employee_id') {
        // Use mapped field name if exists, otherwise use key as-is
        const dbFieldName = fieldMapping[key] || key;

        // Convert empty strings to null, handle objects/arrays
        let value = employeeData[key];
        if (value === '' || value === null) {
          value = null;
        } else if (typeof value === 'object') {
          // For file upload fields, skip if empty object (no new file uploaded)
          if (key === 'offerLetter' || key === 'aadhaarCard' || key === 'panCard' || key === 'employeePhoto' ||
              key === 'offer_letter_url' || key === 'aadhaar_card_url' || key === 'pan_card_url' || key === 'photo_url') {
            console.warn(`⚠️  Warning: Skipping file field ${key} with empty object value`);
            return; // Skip this field entirely
          }
          // Convert other objects/arrays to null (shouldn't happen, but safety check)
          console.warn(`⚠️  Warning: Field ${key} has object value, converting to null:`, value);
          value = null;
        }

        fields.push(`${dbFieldName} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    values.push(id);

    const query = `UPDATE employees SET ${fields.join(', ')} WHERE employee_id = ?`;
    await executeQuery(query, values);

    // Log audit trail
    await logEmployeeUpdate(id, oldEmployeeData, employeeData, req);

    res.status(200).json({
      success: true,
      message: 'Employee updated successfully'
    });
  } catch (error) {
    console.error('Update employee error:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Employee with this Aadhaar or PAN already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update employee',
      error: error.message
    });
  }
};

// ==============================================
// DELETE EMPLOYEE (Soft Delete)
// ==============================================
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = getCompanyFilter(req);

    // Get employee data for audit log
    let checkQuery = 'SELECT * FROM employees WHERE employee_id = ?';
    const checkParams = [id];

    if (companyId) {
      checkQuery += ' AND company_id = ?';
      checkParams.push(companyId);
    }

    const existing = await executeQuery(checkQuery, checkParams);

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const employeeData = existing[0];

    // Soft delete employee and deactivate salaries atomically — a failure
    // between the two must not leave an inactive employee with active salary
    await withTransaction(async (conn) => {
      await conn.query(
        'UPDATE employees SET status = ?, date_of_leaving = NOW() WHERE employee_id = ?',
        ['INACTIVE', id]
      );
      await conn.query(
        'UPDATE salaries SET status = ? WHERE employee_id = ?',
        ['INACTIVE', id]
      );
    });

    // Log audit trail
    await logEmployeeDelete(id, employeeData, req);

    // Flag any advance still owed: once inactive, no more payslips are
    // generated, so nothing will auto-recover the remaining balance. Surface
    // it so HR can collect it in the final settlement or write it off.
    const outstanding = await executeQuery(
      `SELECT a.advance_id,
              a.amount - COALESCE((SELECT SUM(r.amount) FROM salary_advance_recoveries r WHERE r.advance_id = a.advance_id), 0) AS balance
       FROM salary_advances a
       WHERE a.employee_id = ? AND a.status = 'ACTIVE'
       HAVING balance > 0`,
      [id]
    );
    const outstandingTotal = outstanding.reduce((sum, a) => sum + Number(a.balance), 0);

    res.status(200).json({
      success: true,
      message: 'Employee deactivated successfully',
      outstanding_advance: outstanding.length > 0
        ? { count: outstanding.length, total_balance: outstandingTotal }
        : null
    });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete employee',
      error: error.message
    });
  }
};

// ==============================================
// GET DISTINCT DEPARTMENTS
// ==============================================
const getDepartments = asyncHandler(async (req, res) => {
  const companyId = getCompanyFilter(req);

  let query = 'SELECT DISTINCT department FROM employees WHERE department IS NOT NULL AND department != ""';
  const params = [];

  if (companyId) {
    query += ' AND company_id = ?';
    params.push(companyId);
  }

  query += ' ORDER BY department ASC';

  const results = await executeQuery(query, params);
  const departments = results.map(r => r.department);

  res.status(200).json({ success: true, data: departments });
});

// ==============================================
// GET DISTINCT DESIGNATIONS
// ==============================================
const getDesignations = asyncHandler(async (req, res) => {
  const companyId = getCompanyFilter(req);

  let query = 'SELECT DISTINCT designation FROM employees WHERE designation IS NOT NULL AND designation != ""';
  const params = [];

  if (companyId) {
    query += ' AND company_id = ?';
    params.push(companyId);
  }

  query += ' ORDER BY designation ASC';

  const results = await executeQuery(query, params);
  const designations = results.map(r => r.designation);

  res.status(200).json({ success: true, data: designations });
});

// ==============================================
// GET EMPLOYEE DOCUMENT (authenticated file serving)
// ==============================================
const DOCUMENT_TYPES = {
  'offer-letter': { column: 'offer_letter_url', folder: 'offer-letters' },
  'aadhaar': { column: 'aadhaar_card_url', folder: 'aadhaar-cards' },
  'pan': { column: 'pan_card_url', folder: 'pan-cards' }
};

const getEmployeeDocument = async (req, res) => {
  try {
    const { id, type } = req.params;
    const docType = DOCUMENT_TYPES[type];

    if (!docType) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document type'
      });
    }

    let query = `SELECT ${docType.column} AS doc_url FROM employees WHERE employee_id = ?`;
    const params = [id];

    const companyId = getCompanyFilter(req);
    if (companyId) {
      query += ' AND company_id = ?';
      params.push(companyId);
    }

    const rows = await executeQuery(query, params);

    if (rows.length === 0 || !rows[0].doc_url) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Stored value is a path like /uploads/aadhaar-cards/<file>; basename prevents traversal
    const filename = path.basename(rows[0].doc_url);
    const filePath = path.join(__dirname, '../../uploads', docType.folder, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Document file not found on server'
      });
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error('Get employee document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document'
    });
  }
};

// ==============================================
// BULK DOCUMENT UPLOAD
// ==============================================
// Doc types that can be bulk-uploaded, mapped to their DB column + folder.
const BULK_DOC_TYPES = {
  aadhaar: { column: 'aadhaar_card_url', folder: 'aadhaar-cards' },
  pan: { column: 'pan_card_url', folder: 'pan-cards' },
  photo: { column: 'photo_url', folder: 'employee-photos' }
};

/**
 * Parse an uploaded file's name into { code, type }.
 * Convention: employee code first (P0012 / P00112), then a doc-type keyword
 * anywhere in the name. Separators (_ - space) and case are ignored.
 *   "P0012_aadhaar.jpg" -> { code: 'P0012', type: 'aadhaar' }
 *   "p00112 PAN card.pdf" -> { code: 'P00112', type: 'pan' }
 * Returns nulls for whichever part can't be determined so the caller can
 * explain exactly why a file didn't match.
 */
const parseBulkDocFilename = (originalName) => {
  const name = String(originalName || '');
  const base = name.replace(/\.[^.]+$/, ''); // strip extension

  // Employee codes are P + at least 3 digits (P0001 .. P00124). No word
  // boundary here: '_' counts as a word char so \b breaks on "P0012_...".
  const codeMatch = base.match(/P\d{3,}/i);
  const code = codeMatch ? codeMatch[0].toUpperCase() : null;

  // Normalize separators (_ - .) to spaces so short keywords like "pan" can
  // be matched as standalone tokens without \b (which breaks on underscores).
  const norm = ' ' + base.toLowerCase().replace(/[_\-.]+/g, ' ') + ' ';
  let type = null;
  if (/aadhaar|aadhar|adhaar|adhar/.test(norm)) type = 'aadhaar';
  else if (/ pan | pan card |pancard/.test(norm)) type = 'pan';
  else if (/ photo | pic | image | dp |photo/.test(norm)) type = 'photo';

  return { code, type };
};

const bulkUploadDocuments = async (req, res) => {
  const files = req.files || [];
  const companyId = getCompanyFilter(req);

  // Clean up every temp file no matter how we exit
  const cleanupTemp = () => {
    for (const f of files) {
      if (f && f.path) fs.unlink(f.path, () => {});
    }
  };

  try {
    if (files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    // Load this company's employees once, indexed by uppercase code
    let empQuery = 'SELECT employee_id, employee_code, first_name, last_name, aadhaar_card_url, pan_card_url, photo_url FROM employees WHERE status IN (?, ?)';
    const empParams = ['ACTIVE', 'ON_LEAVE'];
    if (companyId) {
      empQuery += ' AND company_id = ?';
      empParams.push(companyId);
    }
    const employees = await executeQuery(empQuery, empParams);
    const byCode = new Map(employees.map(e => [e.employee_code.toUpperCase(), e]));

    const results = [];
    const seen = new Set(); // guards against two files targeting same employee+type in one batch

    for (const file of files) {
      const { code, type } = parseBulkDocFilename(file.originalname);
      const entry = { file: file.originalname, code, type, status: 'skipped', reason: '' };

      if (!code || !type) {
        entry.reason = !code && !type ? 'Could not read employee code or document type from filename'
          : !code ? 'Could not read employee code from filename'
          : 'Could not read document type (expected aadhaar, pan, or photo) from filename';
        fs.unlink(file.path, () => {});
        results.push(entry);
        continue;
      }

      const emp = byCode.get(code);
      if (!emp) {
        entry.reason = `No active employee with code ${code} in this company`;
        fs.unlink(file.path, () => {});
        results.push(entry);
        continue;
      }
      entry.employee = `${emp.first_name} ${emp.last_name || ''}`.trim();

      const dupeKey = `${code}|${type}`;
      if (seen.has(dupeKey)) {
        entry.reason = `Another file in this batch already targets ${code}'s ${type} — resolve which one to keep`;
        fs.unlink(file.path, () => {});
        results.push(entry);
        continue;
      }
      seen.add(dupeKey);

      const docCfg = BULK_DOC_TYPES[type];
      const finalName = path.basename(file.path); // already unique + safe
      const destDir = path.join(__dirname, '../../uploads', docCfg.folder);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

      // Remove the employee's previous file for this doc type, if any
      const oldUrl = emp[docCfg.column];
      if (oldUrl) {
        fs.unlink(path.join(destDir, path.basename(oldUrl)), () => {});
      }

      fs.renameSync(file.path, path.join(destDir, finalName));
      const fileUrl = `/uploads/${docCfg.folder}/${finalName}`;
      await executeQuery(
        `UPDATE employees SET ${docCfg.column} = ? WHERE employee_id = ?`,
        [fileUrl, emp.employee_id]
      );

      entry.status = 'uploaded';
      results.push(entry);
    }

    const uploaded = results.filter(r => r.status === 'uploaded').length;
    const skipped = results.length - uploaded;

    res.status(200).json({
      success: true,
      message: `${uploaded} document(s) attached, ${skipped} skipped`,
      summary: { total: results.length, uploaded, skipped },
      results
    });
  } catch (error) {
    console.error('Bulk document upload error:', error);
    cleanupTemp();
    res.status(500).json({ success: false, message: 'Bulk upload failed' });
  }
};

module.exports = {
  getAllEmployees,
  getActiveEmployees,
  getEmployeesWithoutSalary,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getDepartments,
  getDesignations,
  getEmployeeDocument,
  bulkUploadDocuments,
  parseBulkDocFilename
};
