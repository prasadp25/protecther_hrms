import { useState, useEffect } from 'react';
import { employeeService } from '../../services/employeeService';
import { siteService } from '../../services/siteService';

const EmployeeForm = ({ employeeId, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [offerLetterFile, setOfferLetterFile] = useState(null);
  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [panFile, setPanFile] = useState(null);
  const [activeSites, setActiveSites] = useState([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    mobileNo: '',
    email: '',
    aadhaarNo: '',
    panNo: '',
    accountNo: '',
    ifscCode: '',
    bankName: '',
    uanNo: '',
    pfNo: '',
    qualification: '',
    dob: '',
    gender: '',
    address: '',
    status: 'ACTIVE',
    dateOfJoining: '',
    dateOfLeaving: '',
    designation: '',
    department: '',
    offerLetterIssueDate: '',
    offerLetterUrl: '',
    aadhaarCardUrl: '',
    panCardUrl: '',
    emergencyContactName: '',
    emergencyContactMobile: '',
    emergencyContactRelationship: '',
    siteId: '',
    wpPolicy: 'Yes',
    hospitalInsuranceId: '',
  });

  useEffect(() => {
    loadActiveSites();
    if (employeeId) {
      loadEmployee();
    }
  }, [employeeId]);

  const loadActiveSites = async () => {
    try {
      const response = await siteService.getActiveSites();
      if (response.success) {
        setActiveSites(response.data);
      }
    } catch (error) {
      console.error('Failed to load active sites:', error);
    }
  };

  const loadEmployee = async () => {
    try {
      setLoading(true);
      const response = await employeeService.getEmployeeById(employeeId);
      if (response.success) {
        // Map backend field names (snake_case) to frontend (camelCase)
        const employee = response.data;
        setFormData({
          firstName: employee.first_name || '',
          lastName: employee.last_name || '',
          mobileNo: employee.mobile || '',
          email: employee.email || '',
          aadhaarNo: employee.aadhaar_no || '',
          panNo: employee.pan_no || '',
          accountNo: employee.account_number || '',
          ifscCode: employee.ifsc_code || '',
          bankName: employee.bank_name || '',
          uanNo: employee.uan_no || '',
          pfNo: employee.pf_no || '',
          qualification: employee.qualification || '',
          dob: employee.dob ? employee.dob.split('T')[0] : '',
          gender: employee.gender || '',
          address: employee.address || '',
          status: employee.status || 'ACTIVE',
          dateOfJoining: employee.date_of_joining ? employee.date_of_joining.split('T')[0] : '',
          dateOfLeaving: employee.date_of_leaving ? employee.date_of_leaving.split('T')[0] : '',
          designation: employee.designation || '',
          department: employee.department || '',
          offerLetterIssueDate: employee.offer_letter_issue_date ? employee.offer_letter_issue_date.split('T')[0] : '',
          offerLetterUrl: employee.offer_letter_url || '',
          aadhaarCardUrl: employee.aadhaar_card_url || '',
          panCardUrl: employee.pan_card_url || '',
          emergencyContactName: employee.emergency_contact_name || '',
          emergencyContactMobile: employee.emergency_contact_mobile || '',
          emergencyContactRelationship: employee.emergency_contact_relationship || '',
          siteId: employee.site_id || '',
          wpPolicy: employee.wp_policy || 'No',
          hospitalInsuranceId: employee.hospital_insurance_id || '',
        });
      }
    } catch (error) {
      alert('Failed to load employee data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Trim and uppercase for PAN and IFSC
    let processedValue = value;
    if (name === 'panNo' || name === 'ifscCode') {
      processedValue = value.trim().toUpperCase();
    }

    let updatedData = {
      ...formData,
      [name]: processedValue,
    };

    // If status is ACTIVE, clear the leaving date
    if (name === 'status' && value === 'ACTIVE') {
      updatedData.dateOfLeaving = '';
      updatedData.wpPolicy = 'Yes'; // Active employees get WP Policy
    }

    // If status is not ACTIVE, set WP Policy to No
    if (name === 'status' && value !== 'ACTIVE') {
      updatedData.wpPolicy = 'No';
    }

    setFormData(updatedData);

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleFileChange = (e) => {
    const { name } = e.target;
    const file = e.target.files[0];

    if (file) {
      // Validate file type (PDF, DOC, DOCX, JPG, PNG)
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        alert('Only PDF, DOC, DOCX, JPG, and PNG files are allowed');
        e.target.value = '';
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        e.target.value = '';
        return;
      }

      // Handle different file types
      if (name === 'offerLetter') {
        setOfferLetterFile(file);
        setFormData((prev) => ({
          ...prev,
          offerLetterUrl: file.name,
        }));
      } else if (name === 'aadhaarCard') {
        setAadhaarFile(file);
        setFormData((prev) => ({
          ...prev,
          aadhaarCardUrl: file.name,
        }));
      } else if (name === 'panCard') {
        setPanFile(file);
        setFormData((prev) => ({
          ...prev,
          panCardUrl: file.name,
        }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';

    if (!formData.mobileNo.trim()) {
      newErrors.mobileNo = 'Mobile number is required';
    } else if (!/^[0-9]{10}$/.test(formData.mobileNo)) {
      newErrors.mobileNo = 'Mobile number must be 10 digits';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.aadhaarNo.trim()) {
      newErrors.aadhaarNo = 'Aadhaar number is required';
    } else if (!/^[0-9]{12}$/.test(formData.aadhaarNo)) {
      newErrors.aadhaarNo = 'Aadhaar number must be 12 digits';
    }

    if (!formData.panNo.trim()) {
      newErrors.panNo = 'PAN number is required';
    } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNo.trim())) {
      newErrors.panNo = 'Invalid PAN format (e.g., ABCDE1234F)';
    }

    if (!formData.accountNo.trim()) newErrors.accountNo = 'Account number is required';
    if (!formData.bankName.trim()) newErrors.bankName = 'Bank name is required';

    if (!formData.ifscCode.trim()) {
      newErrors.ifscCode = 'IFSC code is required';
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode)) {
      newErrors.ifscCode = 'Invalid IFSC code format';
    }

    if (!formData.dob) newErrors.dob = 'Date of birth is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.dateOfJoining) newErrors.dateOfJoining = 'Date of joining is required';
    if (!formData.designation.trim()) newErrors.designation = 'Designation is required';
    if (!formData.department.trim()) newErrors.department = 'Department is required';
    if (!formData.offerLetterIssueDate) newErrors.offerLetterIssueDate = 'Offer letter issue date is required';
    if (!formData.offerLetterUrl && !employeeId) newErrors.offerLetter = 'Offer letter is required';
    if (!formData.aadhaarCardUrl && !employeeId) newErrors.aadhaarCard = 'Aadhaar card is required';
    if (!formData.panCardUrl && !employeeId) newErrors.panCard = 'PAN card is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';

    // Emergency contact validation
    if (!formData.emergencyContactName.trim()) newErrors.emergencyContactName = 'Emergency contact name is required';
    if (!formData.emergencyContactMobile.trim()) {
      newErrors.emergencyContactMobile = 'Emergency contact mobile is required';
    } else if (!/^[0-9]{10}$/.test(formData.emergencyContactMobile)) {
      newErrors.emergencyContactMobile = 'Mobile number must be 10 digits';
    }
    if (!formData.emergencyContactRelationship) newErrors.emergencyContactRelationship = 'Relationship is required';

    // Hospital Insurance validation (if provided)
    if (formData.hospitalInsuranceId && !/^[0-9]{12,15}$/.test(formData.hospitalInsuranceId)) {
      newErrors.hospitalInsuranceId = 'Insurance ID must be 12-15 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // Create FormData for file upload support
      const formDataToSend = new FormData();

      // Add text fields
      formDataToSend.append('first_name', formData.firstName);
      formDataToSend.append('last_name', formData.lastName);
      formDataToSend.append('mobile', formData.mobileNo);
      if (formData.email) formDataToSend.append('email', formData.email);
      formDataToSend.append('dob', formData.dob);
      formDataToSend.append('gender', formData.gender);
      if (formData.qualification) formDataToSend.append('qualification', formData.qualification);
      formDataToSend.append('address', formData.address);
      formDataToSend.append('aadhaar_no', formData.aadhaarNo);
      formDataToSend.append('pan_no', formData.panNo);
      if (formData.uanNo) formDataToSend.append('uan_no', formData.uanNo);
      if (formData.pfNo) formDataToSend.append('pf_no', formData.pfNo);
      formDataToSend.append('account_number', formData.accountNo);
      formDataToSend.append('ifsc_code', formData.ifscCode);
      formDataToSend.append('bank_name', formData.bankName);
      formDataToSend.append('designation', formData.designation);
      formDataToSend.append('department', formData.department);
      formDataToSend.append('date_of_joining', formData.dateOfJoining);
      if (formData.dateOfLeaving) formDataToSend.append('date_of_leaving', formData.dateOfLeaving);
      formDataToSend.append('offer_letter_issue_date', formData.offerLetterIssueDate);
      formDataToSend.append('status', formData.status);
      if (formData.siteId) formDataToSend.append('site_id', formData.siteId);
      formDataToSend.append('emergency_contact_name', formData.emergencyContactName);
      formDataToSend.append('emergency_contact_mobile', formData.emergencyContactMobile);
      formDataToSend.append('emergency_contact_relationship', formData.emergencyContactRelationship);
      formDataToSend.append('wp_policy', formData.wpPolicy || 'No');
      if (formData.hospitalInsuranceId) formDataToSend.append('hospital_insurance_id', formData.hospitalInsuranceId);

      // Add file uploads
      if (offerLetterFile) {
        formDataToSend.append('offerLetter', offerLetterFile);
      }
      if (aadhaarFile) {
        formDataToSend.append('aadhaarCard', aadhaarFile);
      }
      if (panFile) {
        formDataToSend.append('panCard', panFile);
      }

      let response;

      if (employeeId) {
        response = await employeeService.updateEmployee(employeeId, formDataToSend);
      } else {
        response = await employeeService.createEmployee(formDataToSend);
      }

      if (response.success) {
        alert(response.message);
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      if (error.response?.data?.message) {
        alert(error.response.data.message);
      } else if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else if (error.message) {
        alert(error.message);
      } else {
        alert('Failed to save employee');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border";
  const labelClasses = "block text-sm font-medium text-gray-700";
  const errorClasses = "mt-1 text-sm text-red-600";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {employeeId ? 'Edit Employee' : 'Add New Employee'}
      </h2>

      {/* Personal Information */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClasses}>First Name *</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className={inputClasses}
            />
            {errors.firstName && <p className={errorClasses}>{errors.firstName}</p>}
          </div>

          <div>
            <label className={labelClasses}>Last Name *</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className={inputClasses}
            />
            {errors.lastName && <p className={errorClasses}>{errors.lastName}</p>}
          </div>

          <div>
            <label className={labelClasses}>Mobile Number *</label>
            <input
              type="text"
              name="mobileNo"
              value={formData.mobileNo}
              onChange={handleChange}
              maxLength="10"
              className={inputClasses}
            />
            {errors.mobileNo && <p className={errorClasses}>{errors.mobileNo}</p>}
          </div>

          <div>
            <label className={labelClasses}>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={inputClasses}
            />
            {errors.email && <p className={errorClasses}>{errors.email}</p>}
          </div>

          <div>
            <label className={labelClasses}>Date of Birth *</label>
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              className={inputClasses}
            />
            {errors.dob && <p className={errorClasses}>{errors.dob}</p>}
          </div>

          <div>
            <label className={labelClasses}>Gender *</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className={inputClasses}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            {errors.gender && <p className={errorClasses}>{errors.gender}</p>}
          </div>

          <div>
            <label className={labelClasses}>Qualification</label>
            <input
              type="text"
              name="qualification"
              value={formData.qualification}
              onChange={handleChange}
              className={inputClasses}
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelClasses}>Address *</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows="3"
              className={inputClasses}
            />
            {errors.address && <p className={errorClasses}>{errors.address}</p>}
          </div>
        </div>
      </div>

      {/* Identity Documents */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Identity Documents</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClasses}>Aadhaar Number *</label>
            <input
              type="text"
              name="aadhaarNo"
              value={formData.aadhaarNo}
              onChange={handleChange}
              maxLength="12"
              className={inputClasses}
            />
            {errors.aadhaarNo && <p className={errorClasses}>{errors.aadhaarNo}</p>}
          </div>

          <div>
            <label className={labelClasses}>Upload Aadhaar Card *</label>
            <input
              type="file"
              name="aadhaarCard"
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png"
              className={inputClasses}
            />
            {errors.aadhaarCard && <p className={errorClasses}>{errors.aadhaarCard}</p>}
            {formData.aadhaarCardUrl && (
              <p className="mt-1 text-sm text-green-600">
                Uploaded: {formData.aadhaarCardUrl}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              PDF, JPG, PNG (Max 5MB)
            </p>
          </div>

          <div>
            <label className={labelClasses}>PAN Number *</label>
            <input
              type="text"
              name="panNo"
              value={formData.panNo}
              onChange={handleChange}
              maxLength="10"
              className={inputClasses}
              style={{ textTransform: 'uppercase' }}
            />
            {errors.panNo && <p className={errorClasses}>{errors.panNo}</p>}
          </div>

          <div>
            <label className={labelClasses}>Upload PAN Card *</label>
            <input
              type="file"
              name="panCard"
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png"
              className={inputClasses}
            />
            {errors.panCard && <p className={errorClasses}>{errors.panCard}</p>}
            {formData.panCardUrl && (
              <p className="mt-1 text-sm text-green-600">
                Uploaded: {formData.panCardUrl}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              PDF, JPG, PNG (Max 5MB)
            </p>
          </div>

          <div>
            <label className={labelClasses}>UAN Number</label>
            <input
              type="text"
              name="uanNo"
              value={formData.uanNo}
              onChange={handleChange}
              className={inputClasses}
            />
          </div>

          <div>
            <label className={labelClasses}>PF Number</label>
            <input
              type="text"
              name="pfNo"
              value={formData.pfNo}
              onChange={handleChange}
              className={inputClasses}
            />
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Emergency Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClasses}>Contact Person Name *</label>
            <input
              type="text"
              name="emergencyContactName"
              value={formData.emergencyContactName}
              onChange={handleChange}
              className={inputClasses}
            />
            {errors.emergencyContactName && <p className={errorClasses}>{errors.emergencyContactName}</p>}
          </div>

          <div>
            <label className={labelClasses}>Contact Mobile Number *</label>
            <input
              type="text"
              name="emergencyContactMobile"
              value={formData.emergencyContactMobile}
              onChange={handleChange}
              maxLength="10"
              className={inputClasses}
            />
            {errors.emergencyContactMobile && <p className={errorClasses}>{errors.emergencyContactMobile}</p>}
          </div>

          <div>
            <label className={labelClasses}>Relationship *</label>
            <select
              name="emergencyContactRelationship"
              value={formData.emergencyContactRelationship}
              onChange={handleChange}
              className={inputClasses}
            >
              <option value="">Select Relationship</option>
              <option value="Father">Father</option>
              <option value="Mother">Mother</option>
              <option value="Spouse">Spouse</option>
              <option value="Sibling">Sibling</option>
              <option value="Friend">Friend</option>
              <option value="Other">Other</option>
            </select>
            {errors.emergencyContactRelationship && <p className={errorClasses}>{errors.emergencyContactRelationship}</p>}
          </div>
        </div>
      </div>

      {/* Bank Details */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Bank Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClasses}>Account Number *</label>
            <input
              type="text"
              name="accountNo"
              value={formData.accountNo}
              onChange={handleChange}
              className={inputClasses}
            />
            {errors.accountNo && <p className={errorClasses}>{errors.accountNo}</p>}
          </div>

          <div>
            <label className={labelClasses}>IFSC Code *</label>
            <input
              type="text"
              name="ifscCode"
              value={formData.ifscCode}
              onChange={handleChange}
              maxLength="11"
              className={inputClasses}
              style={{ textTransform: 'uppercase' }}
            />
            {errors.ifscCode && <p className={errorClasses}>{errors.ifscCode}</p>}
          </div>

          <div className="md:col-span-2">
            <label className={labelClasses}>Bank Name *</label>
            <input
              type="text"
              name="bankName"
              value={formData.bankName}
              onChange={handleChange}
              className={inputClasses}
            />
            {errors.bankName && <p className={errorClasses}>{errors.bankName}</p>}
          </div>
        </div>
      </div>

      {/* Employment Details */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Employment Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClasses}>Date of Joining *</label>
            <input
              type="date"
              name="dateOfJoining"
              value={formData.dateOfJoining}
              onChange={handleChange}
              className={inputClasses}
            />
            {errors.dateOfJoining && <p className={errorClasses}>{errors.dateOfJoining}</p>}
          </div>

          <div>
            <label className={labelClasses}>Date of Leaving</label>
            <input
              type="date"
              name="dateOfLeaving"
              value={formData.dateOfLeaving}
              onChange={handleChange}
              disabled={formData.status === 'ACTIVE'}
              className={inputClasses}
            />
            {formData.status === 'ACTIVE' && (
              <p className="mt-1 text-xs text-gray-500">
                Not applicable for active employees
              </p>
            )}
          </div>

          <div>
            <label className={labelClasses}>Designation *</label>
            <select
              name="designation"
              value={formData.designation}
              onChange={handleChange}
              className={inputClasses}
            >
              <option value="">Select Designation</option>
              <option value="Site Engineer">Site Engineer</option>
              <option value="Site Supervisor">Site Supervisor</option>
              <option value="Foreman">Foreman</option>
              <option value="Mason">Mason</option>
              <option value="Carpenter">Carpenter</option>
              <option value="Electrician">Electrician</option>
              <option value="Plumber">Plumber</option>
              <option value="Helper">Helper</option>
              <option value="Labour">Labour</option>
              <option value="Operator">Operator</option>
              <option value="Safety Officer">Safety Officer</option>
              <option value="Store Keeper">Store Keeper</option>
              <option value="Accountant">Accountant</option>
              <option value="HR Manager">HR Manager</option>
              <option value="Project Manager">Project Manager</option>
              <option value="Other">Other</option>
            </select>
            {errors.designation && <p className={errorClasses}>{errors.designation}</p>}
          </div>

          <div>
            <label className={labelClasses}>Department *</label>
            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              className={inputClasses}
            >
              <option value="">Select Department</option>
              <option value="Civil">Civil</option>
              <option value="Electrical">Electrical</option>
              <option value="Plumbing">Plumbing</option>
              <option value="Carpentry">Carpentry</option>
              <option value="Finishing">Finishing</option>
              <option value="Safety">Safety</option>
              <option value="Administration">Administration</option>
              <option value="Accounts">Accounts</option>
              <option value="HR">HR</option>
              <option value="Stores">Stores</option>
              <option value="Equipment">Equipment</option>
              <option value="Quality Control">Quality Control</option>
              <option value="Other">Other</option>
            </select>
            {errors.department && <p className={errorClasses}>{errors.department}</p>}
          </div>

          <div>
            <label className={labelClasses}>Offer Letter Issue Date *</label>
            <input
              type="date"
              name="offerLetterIssueDate"
              value={formData.offerLetterIssueDate}
              onChange={handleChange}
              className={inputClasses}
            />
            {errors.offerLetterIssueDate && <p className={errorClasses}>{errors.offerLetterIssueDate}</p>}
          </div>

          <div>
            <label className={labelClasses}>Upload Offer Letter *</label>
            <input
              type="file"
              name="offerLetter"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              className={inputClasses}
            />
            {errors.offerLetter && <p className={errorClasses}>{errors.offerLetter}</p>}
            {formData.offerLetterUrl && (
              <p className="mt-1 text-sm text-green-600">
                Uploaded: {formData.offerLetterUrl}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Accepted formats: PDF, DOC, DOCX, JPG, PNG (Max 5MB)
            </p>
          </div>

          <div>
            <label className={labelClasses}>Status *</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className={inputClasses}
            >
              <option value="ACTIVE">Active</option>
              <option value="RESIGNED">Resigned</option>
              <option value="TERMINATED">Terminated</option>
              <option value="ON_LEAVE">On Leave</option>
            </select>
          </div>

          <div>
            <label className={labelClasses}>Assigned Site/Client</label>
            <select
              name="siteId"
              value={formData.siteId}
              onChange={handleChange}
              className={inputClasses}
            >
              <option value="">Select Site (Optional)</option>
              {activeSites.map((site) => (
                <option key={site.site_id} value={site.site_id}>
                  {site.site_code} - {site.site_name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Assign employee to a construction site/project
            </p>
          </div>

          <div>
            <label className={labelClasses}>WP Policy</label>
            <select
              name="wpPolicy"
              value={formData.wpPolicy}
              onChange={handleChange}
              disabled={formData.status !== 'ACTIVE'}
              className={inputClasses}
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {formData.status === 'ACTIVE'
                ? 'Work Permit policy coverage'
                : 'Only available for ACTIVE employees'}
            </p>
          </div>

          <div>
            <label className={labelClasses}>Hospital Insurance ID</label>
            <input
              type="text"
              name="hospitalInsuranceId"
              value={formData.hospitalInsuranceId}
              onChange={handleChange}
              maxLength="15"
              className={inputClasses}
              placeholder="Enter 12-15 digit insurance ID"
            />
            {errors.hospitalInsuranceId && <p className={errorClasses}>{errors.hospitalInsuranceId}</p>}
            <p className="mt-1 text-xs text-gray-500">
              12-15 digit ID provided by insurance company (Optional)
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
          disabled={loading}
        >
          {loading ? 'Saving...' : employeeId ? 'Update Employee' : 'Create Employee'}
        </button>
      </div>
    </form>
  );
};

export default EmployeeForm;
