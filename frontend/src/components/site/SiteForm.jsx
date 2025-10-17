import { useState, useEffect } from 'react';
import { siteService } from '../../services/siteService';

const SiteForm = ({ siteId, onBack, onSuccess }) => {
  const [formData, setFormData] = useState({
    siteName: '',
    clientName: '',
    clientContactPerson: '',
    clientMobile: '',
    clientEmail: '',
    siteAddress: '',
    projectType: '',
    startDate: '',
    expectedEndDate: '',
    status: 'ACTIVE',
    projectValue: '',
    remarks: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const isEditMode = !!siteId;

  useEffect(() => {
    if (isEditMode) {
      loadSiteData();
    }
  }, [siteId]);

  const loadSiteData = async () => {
    try {
      setLoading(true);
      const response = await siteService.getSiteById(siteId);
      if (response.success) {
        setFormData(response.data);
      }
    } catch (error) {
      alert('Failed to load site data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.siteName?.trim()) {
      newErrors.siteName = 'Site name is required';
    }
    if (!formData.clientName?.trim()) {
      newErrors.clientName = 'Client name is required';
    }
    if (!formData.clientContactPerson?.trim()) {
      newErrors.clientContactPerson = 'Contact person is required';
    }
    if (!formData.clientMobile?.trim()) {
      newErrors.clientMobile = 'Mobile number is required';
    } else if (!/^[0-9]{10}$/.test(formData.clientMobile)) {
      newErrors.clientMobile = 'Mobile number must be 10 digits';
    }
    if (!formData.siteAddress?.trim()) {
      newErrors.siteAddress = 'Site address is required';
    }
    if (!formData.projectType?.trim()) {
      newErrors.projectType = 'Project type is required';
    }
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }
    if (!formData.expectedEndDate) {
      newErrors.expectedEndDate = 'Expected end date is required';
    }

    // Email validation (if provided)
    if (formData.clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.clientEmail)) {
      newErrors.clientEmail = 'Invalid email format';
    }

    // Date validation
    if (formData.startDate && formData.expectedEndDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.expectedEndDate);
      if (end < start) {
        newErrors.expectedEndDate = 'End date must be after start date';
      }
    }

    // Project value validation (if provided)
    if (formData.projectValue && (isNaN(formData.projectValue) || parseFloat(formData.projectValue) < 0)) {
      newErrors.projectValue = 'Project value must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      alert('Please fix all validation errors');
      return;
    }

    try {
      setLoading(true);

      // Prepare data
      const dataToSubmit = {
        ...formData,
        projectValue: formData.projectValue ? parseFloat(formData.projectValue) : 0,
      };

      let response;
      if (isEditMode) {
        response = await siteService.updateSite(siteId, dataToSubmit);
      } else {
        response = await siteService.createSite(dataToSubmit);
      }

      if (response.success) {
        alert(response.message);
        onSuccess?.();
      }
    } catch (error) {
      alert(`Failed to ${isEditMode ? 'update' : 'create'} site: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-2 text-gray-600">Loading site data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          {isEditMode ? 'Edit Site/Client' : 'Add New Site/Client'}
        </h2>
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          ← Back to List
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Site Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Site Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Site Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="siteName"
                value={formData.siteName}
                onChange={handleChange}
                className={`w-full rounded-md shadow-sm px-3 py-2 border ${
                  errors.siteName ? 'border-red-500' : 'border-gray-300'
                } focus:border-blue-500 focus:ring-blue-500`}
                placeholder="Enter site name"
              />
              {errors.siteName && (
                <p className="mt-1 text-sm text-red-600">{errors.siteName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Type <span className="text-red-500">*</span>
              </label>
              <select
                name="projectType"
                value={formData.projectType}
                onChange={handleChange}
                className={`w-full rounded-md shadow-sm px-3 py-2 border ${
                  errors.projectType ? 'border-red-500' : 'border-gray-300'
                } focus:border-blue-500 focus:ring-blue-500`}
              >
                <option value="">Select project type</option>
                <option value="Commercial Building">Commercial Building</option>
                <option value="Residential Complex">Residential Complex</option>
                <option value="Shopping Mall">Shopping Mall</option>
                <option value="IT Park">IT Park</option>
                <option value="Villas">Villas</option>
                <option value="Industrial">Industrial</option>
                <option value="Infrastructure">Infrastructure</option>
                <option value="Other">Other</option>
              </select>
              {errors.projectType && (
                <p className="mt-1 text-sm text-red-600">{errors.projectType}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Site Address <span className="text-red-500">*</span>
              </label>
              <textarea
                name="siteAddress"
                value={formData.siteAddress}
                onChange={handleChange}
                rows="2"
                className={`w-full rounded-md shadow-sm px-3 py-2 border ${
                  errors.siteAddress ? 'border-red-500' : 'border-gray-300'
                } focus:border-blue-500 focus:ring-blue-500`}
                placeholder="Enter complete site address"
              />
              {errors.siteAddress && (
                <p className="mt-1 text-sm text-red-600">{errors.siteAddress}</p>
              )}
            </div>
          </div>
        </div>

        {/* Client Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="clientName"
                value={formData.clientName}
                onChange={handleChange}
                className={`w-full rounded-md shadow-sm px-3 py-2 border ${
                  errors.clientName ? 'border-red-500' : 'border-gray-300'
                } focus:border-blue-500 focus:ring-blue-500`}
                placeholder="Enter client/company name"
              />
              {errors.clientName && (
                <p className="mt-1 text-sm text-red-600">{errors.clientName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Person <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="clientContactPerson"
                value={formData.clientContactPerson}
                onChange={handleChange}
                className={`w-full rounded-md shadow-sm px-3 py-2 border ${
                  errors.clientContactPerson ? 'border-red-500' : 'border-gray-300'
                } focus:border-blue-500 focus:ring-blue-500`}
                placeholder="Enter contact person name"
              />
              {errors.clientContactPerson && (
                <p className="mt-1 text-sm text-red-600">{errors.clientContactPerson}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="clientMobile"
                value={formData.clientMobile}
                onChange={handleChange}
                maxLength="10"
                className={`w-full rounded-md shadow-sm px-3 py-2 border ${
                  errors.clientMobile ? 'border-red-500' : 'border-gray-300'
                } focus:border-blue-500 focus:ring-blue-500`}
                placeholder="Enter 10 digit mobile number"
              />
              {errors.clientMobile && (
                <p className="mt-1 text-sm text-red-600">{errors.clientMobile}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="clientEmail"
                value={formData.clientEmail}
                onChange={handleChange}
                className={`w-full rounded-md shadow-sm px-3 py-2 border ${
                  errors.clientEmail ? 'border-red-500' : 'border-gray-300'
                } focus:border-blue-500 focus:ring-blue-500`}
                placeholder="Enter email address"
              />
              {errors.clientEmail && (
                <p className="mt-1 text-sm text-red-600">{errors.clientEmail}</p>
              )}
            </div>
          </div>
        </div>

        {/* Project Details */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className={`w-full rounded-md shadow-sm px-3 py-2 border ${
                  errors.startDate ? 'border-red-500' : 'border-gray-300'
                } focus:border-blue-500 focus:ring-blue-500`}
              />
              {errors.startDate && (
                <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="expectedEndDate"
                value={formData.expectedEndDate}
                onChange={handleChange}
                className={`w-full rounded-md shadow-sm px-3 py-2 border ${
                  errors.expectedEndDate ? 'border-red-500' : 'border-gray-300'
                } focus:border-blue-500 focus:ring-blue-500`}
              />
              {errors.expectedEndDate && (
                <p className="mt-1 text-sm text-red-600">{errors.expectedEndDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Value (₹)
              </label>
              <input
                type="number"
                name="projectValue"
                value={formData.projectValue}
                onChange={handleChange}
                min="0"
                step="1000"
                className={`w-full rounded-md shadow-sm px-3 py-2 border ${
                  errors.projectValue ? 'border-red-500' : 'border-gray-300'
                } focus:border-blue-500 focus:ring-blue-500`}
                placeholder="Enter project value"
              />
              {errors.projectValue && (
                <p className="mt-1 text-sm text-red-600">{errors.projectValue}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full rounded-md shadow-sm px-3 py-2 border border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remarks
              </label>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                rows="3"
                className="w-full rounded-md shadow-sm px-3 py-2 border border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Any additional notes or remarks about the site"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4 pt-4 border-t">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            disabled={loading}
          >
            {loading ? 'Saving...' : isEditMode ? 'Update Site' : 'Add Site'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SiteForm;
