const jwt = require('jsonwebtoken');
const { executeQuery } = require('../config/database');
const { generateOTP, sendOTPEmail } = require('../utils/emailService');

// OTP expiry time in minutes
const OTP_EXPIRY_MINUTES = 10;
// Max OTP attempts
const MAX_OTP_ATTEMPTS = 3;
// Rate limit: max OTPs per hour
const MAX_OTPS_PER_HOUR = 3;

// ==============================================
// SEND OTP
// ==============================================
const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find employee by email
    const employees = await executeQuery(
      `SELECT employee_id, first_name, last_name, email, company_id
       FROM employees
       WHERE LOWER(email) = LOWER(?) AND status = 'ACTIVE'`,
      [email]
    );

    if (employees.length === 0) {
      // Don't reveal if email exists or not for security
      return res.status(200).json({
        success: true,
        message: 'If this email is registered, an OTP has been sent'
      });
    }

    const employee = employees[0];

    // Check rate limit - max OTPs per hour
    const recentOTPs = await executeQuery(
      `SELECT COUNT(*) as count FROM otp_tokens
       WHERE email = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
      [email]
    );

    if (recentOTPs[0].count >= MAX_OTPS_PER_HOUR) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests. Please try again later.'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Invalidate previous OTPs for this email
    await executeQuery(
      `UPDATE otp_tokens SET used = TRUE WHERE email = ? AND used = FALSE`,
      [email]
    );

    // Store new OTP
    await executeQuery(
      `INSERT INTO otp_tokens (employee_id, email, otp_code, expires_at)
       VALUES (?, ?, ?, ?)`,
      [employee.employee_id, email, otp, expiresAt]
    );

    // Send OTP email
    const employeeName = `${employee.first_name} ${employee.last_name}`;
    await sendOTPEmail(email, otp, employeeName);

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email'
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
      error: error.message
    });
  }
};

// ==============================================
// VERIFY OTP
// ==============================================
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Find valid OTP
    const otpRecords = await executeQuery(
      `SELECT ot.*, e.employee_id, e.employee_code, e.first_name, e.last_name,
              e.company_id, c.company_name, c.company_code
       FROM otp_tokens ot
       JOIN employees e ON ot.employee_id = e.employee_id
       JOIN companies c ON e.company_id = c.company_id
       WHERE ot.email = ? AND ot.used = FALSE AND ot.expires_at > NOW()
       ORDER BY ot.created_at DESC
       LIMIT 1`,
      [email]
    );

    if (otpRecords.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP. Please request a new one.'
      });
    }

    const otpRecord = otpRecords[0];

    // Check max attempts
    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      // Mark OTP as used
      await executeQuery(
        `UPDATE otp_tokens SET used = TRUE WHERE id = ?`,
        [otpRecord.id]
      );
      return res.status(400).json({
        success: false,
        message: 'Maximum attempts exceeded. Please request a new OTP.'
      });
    }

    // Verify OTP
    if (otpRecord.otp_code !== otp) {
      // Increment attempts
      await executeQuery(
        `UPDATE otp_tokens SET attempts = attempts + 1 WHERE id = ?`,
        [otpRecord.id]
      );
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.'
      });
    }

    // OTP is valid - mark as used
    await executeQuery(
      `UPDATE otp_tokens SET used = TRUE WHERE id = ?`,
      [otpRecord.id]
    );

    // Generate JWT token for employee
    const token = jwt.sign(
      {
        employee_id: otpRecord.employee_id,
        employee_code: otpRecord.employee_code,
        email: email,
        company_id: otpRecord.company_id,
        type: 'employee' // Distinguish from admin tokens
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        employee: {
          employee_id: otpRecord.employee_id,
          employee_code: otpRecord.employee_code,
          first_name: otpRecord.first_name,
          last_name: otpRecord.last_name,
          email: email,
          company_id: otpRecord.company_id,
          company_name: otpRecord.company_name,
          company_code: otpRecord.company_code
        }
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP',
      error: error.message
    });
  }
};

// ==============================================
// EMPLOYEE PORTAL AUTH MIDDLEWARE
// ==============================================
const authenticateEmployee = async (req, res, next) => {
  try {
    let token = req.cookies?.employee_token;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify it's an employee token
    if (decoded.type !== 'employee') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    // Check if employee still exists and is active
    const employees = await executeQuery(
      `SELECT e.*, c.company_name, c.company_code
       FROM employees e
       JOIN companies c ON e.company_id = c.company_id
       WHERE e.employee_id = ? AND e.status = 'ACTIVE'`,
      [decoded.employee_id]
    );

    if (employees.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Employee no longer exists or is inactive'
      });
    }

    req.employee = employees[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};

// ==============================================
// GET EMPLOYEE PROFILE
// ==============================================
const getProfile = async (req, res) => {
  try {
    const employee = req.employee;

    // Get salary structure
    const salaryQuery = `
      SELECT * FROM salaries
      WHERE employee_id = ? AND status = 'ACTIVE'
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const salaryStructures = await executeQuery(salaryQuery, [employee.employee_id]);

    // Get site info
    const siteQuery = `
      SELECT site_id, site_code, site_name, location
      FROM sites WHERE site_id = ?
    `;
    const sites = employee.site_id
      ? await executeQuery(siteQuery, [employee.site_id])
      : [];

    res.status(200).json({
      success: true,
      data: {
        employee: {
          employee_id: employee.employee_id,
          employee_code: employee.employee_code,
          first_name: employee.first_name,
          last_name: employee.last_name,
          email: employee.email,
          mobile: employee.mobile,
          designation: employee.designation,
          department: employee.department,
          date_of_joining: employee.date_of_joining,
          date_of_birth: employee.dob,
          gender: employee.gender,
          address: employee.address,
          photo_url: employee.photo_url,
          uan_number: employee.uan_no,
          esi_number: employee.esi_no,
          bank_name: employee.bank_name,
          account_number: employee.account_number,
          ifsc_code: employee.ifsc_code,
          company_name: employee.company_name,
          company_code: employee.company_code
        },
        site: sites.length > 0 ? sites[0] : null,
        salary_structure: salaryStructures.length > 0 ? salaryStructures[0] : null
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};

// ==============================================
// GET EMPLOYEE PAYSLIPS
// ==============================================
const getPayslips = async (req, res) => {
  try {
    const employee = req.employee;
    const { year } = req.query;

    let query = `
      SELECT p.payslip_id, p.month, p.basic_salary, p.hra, p.other_allowances,
             p.gross_salary, p.pf_deduction, p.esi_deduction,
             p.professional_tax, p.tds, p.advance_deduction, p.other_deductions,
             p.total_deductions, p.net_salary, p.days_present, p.total_working_days,
             p.payment_status, p.payment_date, p.bonus, p.gratuity
      FROM payslips p
      WHERE p.employee_id = ?
    `;
    const params = [employee.employee_id];

    if (year) {
      query += ' AND SUBSTRING(p.month, 1, 4) = ?';
      params.push(year);
    }

    query += ' ORDER BY p.month DESC';

    const payslips = await executeQuery(query, params);

    res.status(200).json({
      success: true,
      count: payslips.length,
      data: payslips
    });
  } catch (error) {
    console.error('Get payslips error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payslips',
      error: error.message
    });
  }
};

// ==============================================
// GET SINGLE PAYSLIP
// ==============================================
const getPayslipById = async (req, res) => {
  try {
    const employee = req.employee;
    const { id } = req.params;

    const query = `
      SELECT p.*, e.employee_code, e.first_name, e.last_name, e.designation,
             e.mobile, e.account_number, e.ifsc_code, e.bank_name, e.uan_no,
             e.esi_no, st.site_name, st.site_code
      FROM payslips p
      JOIN employees e ON p.employee_id = e.employee_id
      LEFT JOIN sites st ON e.site_id = st.site_id
      WHERE p.payslip_id = ? AND p.employee_id = ?
    `;

    const payslips = await executeQuery(query, [id, employee.employee_id]);

    if (payslips.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payslip not found'
      });
    }

    res.status(200).json({
      success: true,
      data: payslips[0]
    });
  } catch (error) {
    console.error('Get payslip error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payslip',
      error: error.message
    });
  }
};

// ==============================================
// GET COMPANY NOTICES
// ==============================================
const getNotices = async (req, res) => {
  try {
    const employee = req.employee;

    const query = `
      SELECT n.notice_id, n.title, n.content, n.category, n.created_at,
             u.username as created_by_name
      FROM notices n
      JOIN users u ON n.created_by = u.user_id
      WHERE n.company_id = ? AND n.is_active = TRUE
      ORDER BY
        CASE n.category WHEN 'URGENT' THEN 1 ELSE 2 END,
        n.created_at DESC
    `;

    const notices = await executeQuery(query, [employee.company_id]);

    res.status(200).json({
      success: true,
      count: notices.length,
      data: notices
    });
  } catch (error) {
    console.error('Get notices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notices',
      error: error.message
    });
  }
};

// ==============================================
// GET INSURANCE INFO
// ==============================================
const getInsurance = async (req, res) => {
  try {
    const employee = req.employee;

    const query = `
      SELECT insurance_provider, hospital_list_url, contact_person, contact_phone, support_email
      FROM company_settings
      WHERE company_id = ?
    `;

    const settings = await executeQuery(query, [employee.company_id]);

    // Return default values if no settings found
    const insurance = settings.length > 0 ? settings[0] : {
      insurance_provider: 'Bima Kavach',
      hospital_list_url: null,
      contact_person: null,
      contact_phone: null,
      support_email: null
    };

    res.status(200).json({
      success: true,
      data: insurance
    });
  } catch (error) {
    console.error('Get insurance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch insurance info',
      error: error.message
    });
  }
};

// ==============================================
// GET EMPLOYEE DOCUMENTS
// ==============================================
const getDocuments = async (req, res) => {
  try {
    const employee = req.employee;

    res.status(200).json({
      success: true,
      data: {
        offer_letter_url: employee.offer_letter_url || null,
        aadhaar_card_url: employee.aadhaar_card_url || null,
        pan_card_url: employee.pan_card_url || null,
        photo_url: employee.photo_url || null
      }
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch documents',
      error: error.message
    });
  }
};

module.exports = {
  sendOTP,
  verifyOTP,
  authenticateEmployee,
  getProfile,
  getPayslips,
  getPayslipById,
  getNotices,
  getInsurance,
  getDocuments
};
