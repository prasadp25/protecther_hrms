const { executeQuery } = require('../config/database');

// ==============================================
// GET ALL EMPLOYEES
// ==============================================
const getAllEmployees = async (req, res) => {
  try {
    const { status, site_id, designation, search } = req.query;

    let query = `
      SELECT e.*, s.site_name, s.site_code
      FROM employees e
      LEFT JOIN sites s ON e.site_id = s.site_id
      WHERE 1=1
    `;
    const params = [];

    // Add filters
    if (status) {
      query += ' AND e.status = ?';
      params.push(status);
    }

    if (site_id) {
      query += ' AND e.site_id = ?';
      params.push(site_id);
    }

    if (designation) {
      query += ' AND e.designation = ?';
      params.push(designation);
    }

    if (search) {
      query += ` AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ? OR e.mobile LIKE ?)`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    query += ' ORDER BY e.created_at DESC';

    const employees = await executeQuery(query, params);

    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employees',
      error: error.message
    });
  }
};

// ==============================================
// GET ACTIVE EMPLOYEES
// ==============================================
const getActiveEmployees = async (req, res) => {
  try {
    const query = `
      SELECT e.*, s.site_name, s.site_code
      FROM employees e
      LEFT JOIN sites s ON e.site_id = s.site_id
      WHERE e.status = 'ACTIVE'
      ORDER BY e.first_name, e.last_name
    `;

    const employees = await executeQuery(query);

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

    const query = `
      SELECT e.*, s.site_name, s.site_code
      FROM employees e
      LEFT JOIN sites s ON e.site_id = s.site_id
      WHERE e.employee_id = ?
    `;

    const employees = await executeQuery(query, [id]);

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
    const employeeData = req.body;

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
        employee_code, first_name, last_name, mobile, alternate_mobile, email,
        dob, gender, marital_status, qualification, address, city, state, pincode,
        aadhaar_no, aadhaar_card_url, pan_no, pan_card_url, uan_no, pf_no, esi_no,
        account_number, ifsc_code, bank_name, branch_name,
        designation, department, date_of_joining, date_of_leaving,
        offer_letter_issue_date, offer_letter_url, status, site_id,
        emergency_contact_name, emergency_contact_mobile, emergency_contact_relationship,
        wp_policy, hospital_insurance_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
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

    // Debug: Log any undefined values
    console.log('Employee Data:', JSON.stringify(employeeData, null, 2));
    console.log('\n=== Checking params array ===');
    params.forEach((param, index) => {
      if (param === undefined) {
        console.log(`❌ Parameter ${index} is undefined`);
      }
    });
    console.log(`Total params: ${params.length}`);
    console.log(`Params: ${JSON.stringify(params)}`);
    console.log('=== End params check ===\n');

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

    // Check if employee exists
    const existing = await executeQuery(
      'SELECT employee_id FROM employees WHERE employee_id = ?',
      [id]
    );

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

    // Build update query dynamically
    const fields = [];
    const values = [];

    Object.keys(employeeData).forEach(key => {
      if (employeeData[key] !== undefined && key !== 'employee_id') {
        fields.push(`${key} = ?`);
        values.push(employeeData[key]);
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

    // Check if employee exists
    const existing = await executeQuery(
      'SELECT employee_id FROM employees WHERE employee_id = ?',
      [id]
    );

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
