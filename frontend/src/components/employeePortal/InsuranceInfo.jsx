import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { employeePortalService } from '../../services/employeePortalService';

const InsuranceInfo = () => {
  const [insurance, setInsurance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsurance = async () => {
      try {
        const response = await employeePortalService.getInsurance();
        if (response.success) {
          setInsurance(response.data);
        }
      } catch (error) {
        toast.error('Failed to load insurance information');
      } finally {
        setLoading(false);
      }
    };
    fetchInsurance();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Insurance Information</h1>

      {/* Insurance Card */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-indigo-200 text-sm">Insurance Provider</p>
            <h2 className="text-2xl font-bold mt-1">
              {insurance?.insurance_provider || 'Bhima Kavach'}
            </h2>
          </div>
          <div className="bg-white/20 p-3 rounded-lg">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-white/20">
          <p className="text-indigo-200 text-sm">Coverage</p>
          <p className="text-lg mt-1">Group Health Insurance under ESI Scheme</p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* What's Covered */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            What's Covered
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start">
              <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></span>
              <span className="text-gray-600">Medical expenses including hospitalization</span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></span>
              <span className="text-gray-600">Maternity benefits for female employees</span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></span>
              <span className="text-gray-600">Sickness benefits (cash during illness)</span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></span>
              <span className="text-gray-600">Disablement benefits</span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></span>
              <span className="text-gray-600">Dependent benefits for family</span>
            </li>
          </ul>
        </div>

        {/* How to Claim */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How to Claim
          </h3>
          <ol className="space-y-3">
            <li className="flex items-start">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">1</span>
              <span className="text-gray-600">Visit any ESI-empaneled hospital</span>
            </li>
            <li className="flex items-start">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">2</span>
              <span className="text-gray-600">Show your ESI card or ESI number</span>
            </li>
            <li className="flex items-start">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">3</span>
              <span className="text-gray-600">Treatment is cashless at ESI hospitals</span>
            </li>
            <li className="flex items-start">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">4</span>
              <span className="text-gray-600">For reimbursement, submit bills to HR</span>
            </li>
          </ol>
        </div>
      </div>

      {/* Hospital List */}
      {insurance?.hospital_list_url && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Find a Hospital</h3>
          <p className="text-gray-600 mb-4">
            Click below to view the list of empaneled hospitals where you can avail cashless treatment.
          </p>
          <a
            href={insurance.hospital_list_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View Hospital List
          </a>
        </div>
      )}

      {/* Emergency Contact */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h3 className="font-semibold text-red-800 mb-2 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          Emergency Contact
        </h3>
        <p className="text-red-700">
          For medical emergencies, contact HR immediately or call the ESI helpline: <strong>1800-11-2526</strong>
        </p>
      </div>
    </div>
  );
};

export default InsuranceInfo;
