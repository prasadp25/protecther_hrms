import { useState, useEffect } from 'react';
import { employeeService } from '../../services/employeeService';

const EmployeeForm = ({ employeeId, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
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
    address: '',
    status: 'ACTIVE',
    dateOfJoining: '',
    dateOfLeaving: '',
  });

  useEffect(() => {
    if (employeeId) {
      loadEmployee();
    }
  }, [employeeId]);

  const loadEmployee = async () => {
    try {
      setLoading(true);
      const response = await employeeService.getEmployeeById(employeeId);
      if (response.success) {
        setFormData(response.data);
      }
    } catch (error) {
      alert('Failed to load employee data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
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
    } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNo)) {
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
    if (!formData.dateOfJoining) newErrors.dateOfJoining = 'Date of joining is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';

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
      let response;

      if (employeeId) {
        response = await employeeService.updateEmployee(employeeId, formData);
      } else {
        response = await employeeService.createEmployee(formData);
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
              className={inputClasses}
            />
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
