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
    status: 'ACTIVE',
    payCycleType: 'GROUP_A',
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
        const site = response.data;
        // Map snake_case from backend to camelCase for form
        setFormData({
          siteName: site.site_name || '',
          clientName: site.client_name || '',
          clientContactPerson: site.contact_person || '',
          clientMobile: site.contact_mobile || '',
          clientEmail: site.contact_email || '',
          siteAddress: site.site_address || '',
          projectType: site.location || '',
          startDate: site.start_date ? site.start_date.split('T')[0] : '',
          status: site.status || 'ACTIVE',
          payCycleType: site.pay_cycle_type || 'GROUP_A',
          remarks: site.remarks || '',
        });
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

    // Email validation (if provided)
    if (formData.clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.clientEmail)) {
      newErrors.clientEmail = 'Invalid email format';
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

      let response;
      if (isEditMode) {
        response = await siteService.updateSite(siteId, formData);
      } else {
        response = await siteService.createSite(formData);
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

  const inputClasses = "mt-1.5 block w-full rounded-xl border-slate-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2.5 border text-slate-700 placeholder-slate-400 transition-colors";
  const labelClasses = "block text-sm font-medium text-slate-600";
  const errorClasses = "mt-1 text-sm text-red-500";
  const sectionClasses = "bg-slate-50 rounded-xl p-5 border border-slate-100";
  const sectionTitleClasses = "text-lg font-semibold text-slate-800 mb-4 flex items-center";

  if (loading && isEditMode) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-2 text-slate-600">Loading site data...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold text-slate-800">
          {isEditMode ? 'Edit Site/Client' : 'Add New Site/Client'}
        </h2>
      </div>

      {/* Site Information */}
      <div className={sectionClasses}>
        <h3 className={sectionTitleClasses}>
          <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          Site Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClasses}>Site Name *</label>
            <input
              type="text"
              name="siteName"
              value={formData.siteName}
              onChange={handleChange}
              className={inputClasses}
              placeholder="Enter site name"
            />
            {errors.siteName && <p className={errorClasses}>{errors.siteName}</p>}
          </div>

          <div>
            <label className={labelClasses}>Project Type *</label>
            <select
              name="projectType"
              value={formData.projectType}
              onChange={handleChange}
              className={inputClasses}
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
            {errors.projectType && <p className={errorClasses}>{errors.projectType}</p>}
          </div>

          <div className="md:col-span-2">
            <label className={labelClasses}>Site Address *</label>
            <textarea
              name="siteAddress"
              value={formData.siteAddress}
              onChange={handleChange}
              rows="2"
              className={inputClasses}
              placeholder="Enter complete site address"
            />
            {errors.siteAddress && <p className={errorClasses}>{errors.siteAddress}</p>}
          </div>
        </div>
      </div>

      {/* Client Information */}
      <div className={sectionClasses}>
        <h3 className={sectionTitleClasses}>
          <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Client Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClasses}>Client Name *</label>
            <input
              type="text"
              name="clientName"
              value={formData.clientName}
              onChange={handleChange}
              className={inputClasses}
              placeholder="Enter client/company name"
            />
            {errors.clientName && <p className={errorClasses}>{errors.clientName}</p>}
          </div>

          <div>
            <label className={labelClasses}>Contact Person *</label>
            <input
              type="text"
              name="clientContactPerson"
              value={formData.clientContactPerson}
              onChange={handleChange}
              className={inputClasses}
              placeholder="Enter contact person name"
            />
            {errors.clientContactPerson && <p className={errorClasses}>{errors.clientContactPerson}</p>}
          </div>

          <div>
            <label className={labelClasses}>Mobile Number *</label>
            <input
              type="text"
              name="clientMobile"
              value={formData.clientMobile}
              onChange={handleChange}
              maxLength="10"
              className={inputClasses}
              placeholder="Enter 10 digit mobile number"
            />
            {errors.clientMobile && <p className={errorClasses}>{errors.clientMobile}</p>}
          </div>

          <div>
            <label className={labelClasses}>Email</label>
            <input
              type="email"
              name="clientEmail"
              value={formData.clientEmail}
              onChange={handleChange}
              className={inputClasses}
              placeholder="Enter email address"
            />
            {errors.clientEmail && <p className={errorClasses}>{errors.clientEmail}</p>}
          </div>
        </div>
      </div>

      {/* Project Details */}
      <div className={sectionClasses}>
        <h3 className={sectionTitleClasses}>
          <svg className="w-5 h-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          Project Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClasses}>Start Date *</label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className={inputClasses}
            />
            {errors.startDate && <p className={errorClasses}>{errors.startDate}</p>}
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
              <option value="COMPLETED">Completed</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <div>
            <label className={labelClasses}>Wages Calculation Cycle *</label>
            <select
              name="payCycleType"
              value={formData.payCycleType}
              onChange={handleChange}
              className={inputClasses}
            >
              <option value="GROUP_A">Group A (1st to 30th/31st - Calendar Month)</option>
              <option value="GROUP_B">Group B (26th to 25th - Custom Cycle)</option>
            </select>
            <p className="mt-1 text-xs text-slate-500">
              {formData.payCycleType === 'GROUP_A'
                ? 'Standard calendar month: Dec salary = Dec 1-31'
                : 'Custom cycle for daily wage workers: Dec salary = Nov 26 to Dec 25'}
            </p>
          </div>

          <div className="md:col-span-2">
            <label className={labelClasses}>Remarks</label>
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              rows="3"
              className={inputClasses}
              placeholder="Any additional notes or remarks about the site"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4 pt-6 border-t border-slate-100">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2.5 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-medium transition-colors"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 font-medium shadow-lg shadow-blue-500/25 transition-all"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </span>
          ) : isEditMode ? 'Update Site' : 'Add Site'}
        </button>
      </div>
    </form>
  );
};

export default SiteForm;
