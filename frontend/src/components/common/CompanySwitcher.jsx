import { useState, useEffect } from 'react';
import { companyService } from '../../services/companyService';

const CompanySwitcher = ({ selectedCompany, onCompanyChange }) => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const response = await companyService.getActiveCompanies();
      if (response.success) {
        setCompanies(response.data);
      }
    } catch (error) {
      console.error('Failed to load companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (company) => {
    onCompanyChange(company);
    setIsOpen(false);
  };

  const handleViewAll = () => {
    onCompanyChange(null); // null means view all companies
    setIsOpen(false);
  };

  if (loading) {
    return (
      <div className="text-sm text-gray-500">Loading companies...</div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
      >
        <svg
          className="w-5 h-5 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        <span className="text-sm font-medium text-blue-700">
          {selectedCompany ? selectedCompany.company_name : 'All Companies'}
        </span>
        <svg
          className={`w-4 h-4 text-blue-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="p-2">
              <p className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">
                Switch Company
              </p>

              {/* View All Option */}
              <button
                onClick={handleViewAll}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  !selectedCompany
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  <span>All Companies</span>
                </div>
                {!selectedCompany && (
                  <span className="text-xs text-blue-600">Currently viewing</span>
                )}
              </button>

              <hr className="my-2" />

              {/* Company List */}
              {companies.map((company) => (
                <button
                  key={company.company_id}
                  onClick={() => handleSelect(company)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedCompany?.company_id === company.company_id
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{company.company_name}</p>
                      <p className="text-xs text-gray-500">{company.company_code}</p>
                    </div>
                    {selectedCompany?.company_id === company.company_id && (
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CompanySwitcher;
