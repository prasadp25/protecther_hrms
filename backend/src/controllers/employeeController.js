const { executeQuery } = require('../config/database');
const {
  parsePaginationParams,
  parseSortParams,
  parseSearchParams,
  buildPaginatedResponse
} = require('../utils/pagination');
const { asyncHandler } = require('../utils/errors');
const { getCompanyFilter } = require('../middleware/auth');
const { validateEmployeeData } = require('../utils/validators');

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

  // Get paginated data
  const dataQuery = `
    SELECT e.*, s.site_name, s.site_code
    FROM employees e
    LEFT JOIN sites s ON e.site_id = s.site_id
    ${whereClause}
    ORDER BY e.${sortBy} ${sortOrder}
    LIMIT ? OFFSET ?
  `;
  const employees = await executeQuery(dataQuery, [...params, limit, offset]);

  // Send paginated response
  const response = buildPaginatedResponse(employees, total, page, limit);
  res.json(response);
});

// ==============================================
// GET ACTIVE EMPLOYEES
// ==============================================
const getActiveEmployees = async (req, res) => {
  try {
    const companyId = getCompanyFilter(req);
    let query = `
      SELECT e.*, s.site_name, s.site_code
      FROM employees e
      LEFT JOIN sites s ON e.site_id = s.site_id
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
      data: employees
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
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }
    // Use cleaned/validated data
    employeeData = { ...employeeData, ...validation.data };

    // Check if Aadhaar number already exists in ANY company
    if (employeeData.aadhaar_no) {
      const aadhaarCheck = await executeQuery(
        `SELECT employee_id FROM employees WHERE aadhaar_no = ?`,
        [employeeData.aadhaar_no]
      );
      if (aadhaarCheck.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'This Aadhaar number is already registered. Please contact HR for assistance.'
        });
      }
    }

    // Check if PAN number already exists in ANY company
    if (employeeData.pan_no) {
      const panCheck = await executeQuery(
        `SELECT employee_id FROM employees WHERE pan_no = ?`,
        [employeeData.pan_no]
      );
      if (panCheck.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'This PAN number is already registered. Please contact HR for assistance.'
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
        employeeData.employee_code = `P${String(num).padStart(4, '0')}`;
      } else {
        employeeData.employee_code = 'P0001';
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
    }

    const query = `
      INSERT INTO employees (
        company_id, employee_code, first_name, last_name, mobile, alternate_mobile, email,
        dob, gender, marital_status, qualification, address, city, state, pincode,
        aadhaar_no, aadhaar_card_url, pan_no, pan_card_url, uan_no, pf_no, esi_no,
        account_number, ifsc_code, bank_name, branch_name,
        designation, grade, department, date_of_joining, date_of_leaving,
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
      employeeData.dob,
      employeeData.gender || null,
      employeeData.marital_status || null,
      employeeData.qualification || null,
      employeeData.address,
      employeeData.city || null,
      employeeData.state || null,
      employeeData.pincode || null,
      employeeData.aadhaar_no,
      employeeData.aadhaar_card_url || null,
      employeeData.pan_no,
      employeeData.pan_card_url || null,
      employeeData.uan_no || null,
      employeeData.pf_no || null,
      employeeData.esi_no || null,
      employeeData.account_number,
      employeeData.ifsc_code,
      employeeData.bank_name,
      employeeData.branch_name || null,
      employeeData.designation,
      employeeData.grade || null,
      employeeData.department,
      employeeData.date_of_joining,
      employeeData.date_of_leaving || null,
      employeeData.offer_letter_issue_date,
      employeeData.offer_letter_url || null,
      employeeData.status || 'ACTIVE',
      employeeData.site_id || null,
      employeeData.emergency_contact_name,
      employeeData.emergency_contact_mobile,
      employeeData.emergency_contact_relationship,
      employeeData.wp_policy || 'No',
      employeeData.hospital_insurance_id || null
    ];

    const result = await executeQuery(query, params);

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

    // Check if employee exists (within user's company)
    let checkQuery = 'SELECT employee_id FROM employees WHERE employee_id = ?';
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
    }

    // Map frontend field names to database column names
    const fieldMapping = {
      'offerLetter': 'offer_letter_url',
      'aadhaarCard': 'aadhaar_card_url',
      'panCard': 'pan_card_url',
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
          if (key === 'offerLetter' || key === 'aadhaarCard' || key === 'panCard' ||
              key === 'offer_letter_url' || key === 'aadhaar_card_url' || key === 'pan_card_url') {
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

    // Check if employee exists (within user's company)
    let checkQuery = 'SELECT employee_id FROM employees WHERE employee_id = ?';
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

    // Soft delete - set status to INACTIVE
    await executeQuery(
      'UPDATE employees SET status = ?, date_of_leaving = NOW() WHERE employee_id = ?',
      ['INACTIVE', id]
    );

    // Also deactivate salary records
    await executeQuery(
      'UPDATE salaries SET status = ? WHERE employee_id = ?',
      ['INACTIVE', id]
    );

    res.status(200).json({
      success: true,
      message: 'Employee deactivated successfully'
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

module.exports = {
  getAllEmployees,
  getActiveEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee
};
