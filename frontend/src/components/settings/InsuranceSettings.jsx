import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { settingsService } from '../../services/settingsService';

const InsuranceSettings = () => {
  const [settings, setSettings] = useState({
    insurance_provider: '',
    hospital_list_url: '',
    contact_person: '',
    contact_phone: '',
    support_email: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await settingsService.getInsuranceSettings();
      if (response.success && response.data) {
        setSettings({
          insurance_provider: response.data.insurance_provider || '',
          hospital_list_url: response.data.hospital_list_url || '',
          contact_person: response.data.contact_person || '',
          contact_phone: response.data.contact_phone || '',
          support_email: response.data.support_email || ''
        });
      }
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings({ ...settings, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await settingsService.updateInsuranceSettings(settings);
      if (response.success) {
        toast.success('Insurance settings updated successfully');
      }
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Insurance Settings */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Insurance Configuration</h2>
              <p className="text-sm text-gray-500">Configure insurance details shown to employees</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Insurance Provider Name
            </label>
            <input
              type="text"
              name="insurance_provider"
              value={settings.insurance_provider}
              onChange={handleChange}
              placeholder="e.g., Bhima Kavach, Star Health, etc."
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="mt-1 text-sm text-gray-500">
              This will be displayed to employees in the Employee Portal
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hospital List URL
            </label>
            <input
              type="url"
              name="hospital_list_url"
              value={settings.hospital_list_url}
              onChange={handleChange}
              placeholder="https://example.com/hospital-list.pdf"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="mt-1 text-sm text-gray-500">
              Link to the list of empaneled hospitals (PDF or webpage)
            </p>
          </div>

          {/* Contact Information */}
          <div className="border-t pt-6">
            <h3 className="text-md font-semibold text-gray-800 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  name="contact_person"
                  value={settings.contact_person}
                  onChange={handleChange}
                  placeholder="e.g., Rahul"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  name="contact_phone"
                  value={settings.contact_phone}
                  onChange={handleChange}
                  placeholder="+91 XXXXX XXXXX"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Support Email
                </label>
                <input
                  type="email"
                  name="support_email"
                  value={settings.support_email}
                  onChange={handleChange}
                  placeholder="support@example.com"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Employee Portal Preview:</h4>
            <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-lg p-4 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-indigo-200 text-sm">Insurance Provider</p>
                  <h3 className="text-xl font-bold mt-1">
                    {settings.insurance_provider || 'Not configured'}
                  </h3>
                </div>
                <div className="bg-white/20 p-2 rounded-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
              {(settings.hospital_list_url || settings.contact_person || settings.contact_phone || settings.support_email) && (
                <div className="mt-4 pt-4 border-t border-white/20 space-y-2">
                  {settings.hospital_list_url && (
                    <a
                      href={settings.hospital_list_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm bg-white/20 px-3 py-1 rounded hover:bg-white/30 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      View Hospital List
                    </a>
                  )}
                  {(settings.contact_person || settings.contact_phone || settings.support_email) && (
                    <div className="text-sm text-indigo-100 mt-2">
                      {settings.contact_person && <p>Contact: {settings.contact_person}</p>}
                      {settings.contact_phone && <p>Phone: {settings.contact_phone}</p>}
                      {settings.support_email && <p>Email: {settings.support_email}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InsuranceSettings;
