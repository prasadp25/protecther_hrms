import { useState, useEffect } from 'react';
import { companyService } from '../../services/companyService';

const CompanyForm = ({ companyId, onSuccess, onBack }) => {
  const [formData, setFormData] = useState({
    company_name: '',
    legal_name: '',
    registration_number: '',
    gst_number: '',
    pan_number: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    phone: '',
    email: '',
    website: '',
    status: 'ACTIVE',
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (companyId) {
      loadCompany();
    }
  }, [companyId]);

  const loadCompany = async () => {
    try {
      setLoading(true);
      const response = await companyService.getCompanyById(companyId);
      if (response.success) {
        setFormData(response.data);
      }
    } catch (error) {
      alert('Failed to load company');
      onBack();
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
    // Clear error when field is edited
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.company_name?.trim()) {
      newErrors.company_name = 'Company name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.gst_number && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gst_number)) {
      newErrors.gst_number = 'Invalid GST number format';
    }

    if (formData.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_number)) {
      newErrors.pan_number = 'Invalid PAN number format';
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
      setSubmitting(true);
      let response;

      if (companyId) {
        response = await companyService.updateCompany(companyId, formData);
      } else {
        response = await companyService.createCompany(formData);
      }

      if (response.success) {
        alert(response.message);
        onSuccess();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save company');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Loading company...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          {companyId ? 'Edit Company' : 'Add New Company'}
        </h2>
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-600 hover:text-gray-900"
        >
          Back to List
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="company_name"
              value={formData.company_name}
              onChange={handleChange}
              className={`w-full rounded-md border ${errors.company_name ? 'border-red-500' : 'border-gray-300'} shadow-sm px-3 py-2`}
            />
            {errors.company_name && (
              <p className="mt-1 text-sm text-red-500">{errors.company_name}</p>
            )}
          </div>

          {/* Legal Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Legal Name
            </label>
            <input
              type="text"
              name="legal_name"
              value={formData.legal_name || ''}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
            />
          </div>

          {/* Registration Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Registration Number
            </label>
            <input
              type="text"
              name="registration_number"
              value={formData.registration_number || ''}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
            />
          </div>

          {/* GST Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GST Number
            </label>
            <input
              type="text"
              name="gst_number"
              value={formData.gst_number || ''}
              onChange={handleChange}
              placeholder="22AAAAA0000A1Z5"
              className={`w-full rounded-md border ${errors.gst_number ? 'border-red-500' : 'border-gray-300'} shadow-sm px-3 py-2`}
            />
            {errors.gst_number && (
              <p className="mt-1 text-sm text-red-500">{errors.gst_number}</p>
            )}
          </div>

          {/* PAN Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PAN Number
            </label>
            <input
              type="text"
              name="pan_number"
              value={formData.pan_number || ''}
              onChange={handleChange}
              placeholder="AAAAA0000A"
              className={`w-full rounded-md border ${errors.pan_number ? 'border-red-500' : 'border-gray-300'} shadow-sm px-3 py-2`}
            />
            {errors.pan_number && (
              <p className="mt-1 text-sm text-red-500">{errors.pan_number}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="text"
              name="phone"
              value={formData.phone || ''}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email || ''}
              onChange={handleChange}
              className={`w-full rounded-md border ${errors.email ? 'border-red-500' : 'border-gray-300'} shadow-sm px-3 py-2`}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website
            </label>
            <input
              type="text"
              name="website"
              value={formData.website || ''}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
            />
          </div>

          {/* Address */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              name="address"
              value={formData.address || ''}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
            />
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              name="city"
              value={formData.city || ''}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
            />
          </div>

          {/* State */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <input
              type="text"
              name="state"
              value={formData.state || ''}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
            />
          </div>

          {/* Pincode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pincode
            </label>
            <input
              type="text"
              name="pincode"
              value={formData.pincode || ''}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
            />
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <input
              type="text"
              name="country"
              value={formData.country || 'India'}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
            >
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        {/* Form Actions */}
        <div className="mt-6 flex justify-end space-x-4">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : companyId ? 'Update Company' : 'Create Company'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompanyForm;
