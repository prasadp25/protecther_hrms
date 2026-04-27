import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { employeePortalService } from '../../services/employeePortalService';

const MyProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await employeePortalService.getProfile();
        if (response.success) {
          setProfile(response.data);
        }
      } catch (error) {
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Unable to load profile</p>
      </div>
    );
  }

  const { employee, site, salary_structure } = profile;

  const tabs = [
    { id: 'personal', label: 'Personal Details' },
    { id: 'employment', label: 'Employment' },
    { id: 'bank', label: 'Bank Details' },
    { id: 'salary', label: 'Salary Structure' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center space-x-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-3xl font-bold">
            {employee.photo_url ? (
              <img
                src={employee.photo_url}
                alt={employee.first_name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              employee.first_name?.charAt(0)
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {employee.first_name} {employee.last_name}
            </h1>
            <p className="text-gray-500">{employee.designation || 'Employee'}</p>
            <p className="text-sm text-indigo-600 mt-1">{employee.employee_code}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Personal Details */}
          {activeTab === 'personal' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InfoItem label="Full Name" value={`${employee.first_name} ${employee.last_name}`} />
              <InfoItem label="Email" value={employee.email} />
              <InfoItem label="Mobile" value={employee.mobile} />
              <InfoItem label="Date of Birth" value={formatDate(employee.date_of_birth)} />
              <InfoItem label="Gender" value={employee.gender} />
              <InfoItem label="Address" value={employee.address} />
            </div>
          )}

          {/* Employment Details */}
          {activeTab === 'employment' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InfoItem label="Employee Code" value={employee.employee_code} />
              <InfoItem label="Department" value={employee.department} />
              <InfoItem label="Designation" value={employee.designation} />
              <InfoItem label="Date of Joining" value={formatDate(employee.date_of_joining)} />
              <InfoItem label="Company" value={employee.company_name} />
              <InfoItem label="Site" value={site?.site_name} />
              <InfoItem label="UAN Number" value={employee.uan_number} />
              <InfoItem label="ESI Number" value={employee.esi_number} />
            </div>
          )}

          {/* Bank Details */}
          {activeTab === 'bank' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InfoItem label="Bank Name" value={employee.bank_name} />
              <InfoItem label="Account Number" value={employee.account_number} />
              <InfoItem label="IFSC Code" value={employee.ifsc_code} />
            </div>
          )}

          {/* Salary Structure */}
          {activeTab === 'salary' && (
            <>
              {salary_structure ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <SalaryCard label="Basic Salary" value={salary_structure.basic_salary} />
                    <SalaryCard label="HRA" value={salary_structure.hra} />
                    <SalaryCard label="Conveyance" value={salary_structure.conveyance} />
                    <SalaryCard label="Medical Allowance" value={salary_structure.medical_allowance} />
                    <SalaryCard label="Special Allowance" value={salary_structure.special_allowance} />
                    <SalaryCard label="Other Allowance" value={salary_structure.other_allowance} />
                  </div>
                  <div className="border-t pt-6">
                    <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-lg">
                      <span className="text-lg font-semibold text-gray-700">Gross Salary (CTC)</span>
                      <span className="text-2xl font-bold text-indigo-600">
                        {formatCurrency(salary_structure.gross_salary)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">Salary structure not available</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const InfoItem = ({ label, value }) => (
  <div>
    <dt className="text-sm text-gray-500">{label}</dt>
    <dd className="mt-1 text-gray-900 font-medium">{value || '-'}</dd>
  </div>
);

const SalaryCard = ({ label, value }) => (
  <div className="bg-gray-50 p-4 rounded-lg">
    <dt className="text-sm text-gray-500">{label}</dt>
    <dd className="mt-1 text-lg font-semibold text-gray-900">
      {value ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(value) : '-'}
    </dd>
  </div>
);

export default MyProfile;
