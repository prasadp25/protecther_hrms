import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ErrorBoundary from './components/error/ErrorBoundary';
import Login from './components/auth/Login';
import authService from './services/authService';
import Dashboard from './components/dashboard/Dashboard';
import EmployeeList from './components/employee/EmployeeList';
import EmployeeForm from './components/employee/EmployeeForm';
import SiteList from './components/site/SiteList';
import SiteForm from './components/site/SiteForm';
import SalaryList from './components/salary/SalaryList';
import SalaryForm from './components/salary/SalaryForm';
import PayslipView from './components/salary/PayslipView';
import AttendanceManagement from './components/attendance/AttendanceManagement';
import Reports from './components/reports/Reports';
import CompanyList from './components/company/CompanyList';
import CompanyForm from './components/company/CompanyForm';
import CompanySwitcher from './components/common/CompanySwitcher';
import AuditLogs from './components/audit/AuditLogs';
import { getSelectedCompany, setSelectedCompany } from './config/api';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Main App Component
const MainApp = () => {
  const [module, setModule] = useState('dashboard'); // 'dashboard', 'employees', 'sites', 'salary', 'attendance', 'reports', or 'companies'
  const [view, setView] = useState('list'); // 'list', 'form', 'payslips'
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [selectedSalaryId, setSelectedSalaryId] = useState(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);

  // Get current user info
  const user = authService.getUser();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Selected company state (for SUPER_ADMIN)
  const [selectedCompany, setSelectedCompanyState] = useState(() => {
    if (isSuperAdmin) {
      return getSelectedCompany();
    }
    return null;
  });

  // Handle company change
  const handleCompanyChange = (company) => {
    setSelectedCompanyState(company);
    setSelectedCompany(company); // Save to localStorage
    // Reset to dashboard when switching companies
    setModule('dashboard');
    setView('list');
  };

  // Company handlers
  const handleCompanyAddNew = () => {
    setSelectedCompanyId(null);
    setView('form');
  };

  const handleCompanyEdit = (companyId) => {
    setSelectedCompanyId(companyId);
    setView('form');
  };

  const handleCompanyFormSuccess = () => {
    setView('list');
    setSelectedCompanyId(null);
  };

  const handleCompanyBack = () => {
    setView('list');
    setSelectedCompanyId(null);
  };

  // Logout handler
  const handleLogout = () => {
    authService.logout();
    window.location.href = '/login';
  };

  // Employee handlers
  const handleEmployeeAddNew = () => {
    setSelectedEmployeeId(null);
    setView('form');
  };

  const handleEmployeeEdit = (employeeId) => {
    setSelectedEmployeeId(employeeId);
    setView('form');
  };

  const handleEmployeeFormSuccess = () => {
    setView('list');
    setSelectedEmployeeId(null);
  };

  const handleEmployeeCancel = () => {
    setView('list');
    setSelectedEmployeeId(null);
  };

  // Site handlers
  const handleSiteAddNew = () => {
    setSelectedSiteId(null);
    setView('form');
  };

  const handleSiteEdit = (siteId) => {
    setSelectedSiteId(siteId);
    setView('form');
  };

  const handleSiteFormSuccess = () => {
    setView('list');
    setSelectedSiteId(null);
  };

  const handleSiteBack = () => {
    setView('list');
    setSelectedSiteId(null);
  };

  // Salary handlers
  const handleSalaryAddNew = () => {
    setSelectedSalaryId(null);
    setView('form');
  };

  const handleSalaryEdit = (salaryId) => {
    setSelectedSalaryId(salaryId);
    setView('form');
  };

  const handleSalaryFormSuccess = () => {
    setView('list');
    setSelectedSalaryId(null);
  };

  const handleSalaryCancel = () => {
    setView('list');
    setSelectedSalaryId(null);
  };

  const handleViewPayslips = () => {
    setView('payslips');
  };

  const handleBackToSalaries = () => {
    setView('list');
  };

  // Module switch handler
  const handleModuleChange = (newModule) => {
    setModule(newModule);
    setView('list');
    setSelectedEmployeeId(null);
    setSelectedSiteId(null);
    setSelectedSalaryId(null);
    setSelectedCompanyId(null);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                HRMS - Construction Staffing
              </h1>
              {/* Show selected company for SUPER_ADMIN or user's company */}
              {isSuperAdmin ? (
                selectedCompany ? (
                  <p className="text-sm text-blue-600 mt-1 font-medium">
                    Viewing: {selectedCompany.company_name}
                  </p>
                ) : (
                  <p className="text-sm text-gray-600 mt-1">
                    Viewing: All Companies
                  </p>
                )
              ) : user?.company_name && (
                <p className="text-sm text-gray-600 mt-1">
                  {user.company_name}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {/* Company Switcher for SUPER_ADMIN */}
              {isSuperAdmin && (
                <CompanySwitcher
                  selectedCompany={selectedCompany}
                  onCompanyChange={handleCompanyChange}
                />
              )}
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                <p className="text-xs text-gray-500">{user?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-4 flex space-x-4 border-b">
            <button
              onClick={() => handleModuleChange('dashboard')}
              className={`pb-2 px-4 font-medium ${
                module === 'dashboard'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => handleModuleChange('employees')}
              className={`pb-2 px-4 font-medium ${
                module === 'employees'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Employees
            </button>
            <button
              onClick={() => handleModuleChange('sites')}
              className={`pb-2 px-4 font-medium ${
                module === 'sites'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sites/Clients
            </button>
            <button
              onClick={() => handleModuleChange('attendance')}
              className={`pb-2 px-4 font-medium ${
                module === 'attendance'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Attendance
            </button>
            <button
              onClick={() => handleModuleChange('salary')}
              className={`pb-2 px-4 font-medium ${
                module === 'salary'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Salary & Payroll
            </button>
            <button
              onClick={() => handleModuleChange('reports')}
              className={`pb-2 px-4 font-medium ${
                module === 'reports'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Reports
            </button>
            {isSuperAdmin && (
              <button
                onClick={() => handleModuleChange('companies')}
                className={`pb-2 px-4 font-medium ${
                  module === 'companies'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Companies
              </button>
            )}
            {isSuperAdmin && (
              <button
                onClick={() => handleModuleChange('audit')}
                className={`pb-2 px-4 font-medium ${
                  module === 'audit'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Audit Logs
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {module === 'dashboard' && (
            <Dashboard key={selectedCompany?.company_id || 'all'} />
          )}

          {module === 'employees' && (
            <>
              {view === 'list' ? (
                <EmployeeList onEdit={handleEmployeeEdit} onAddNew={handleEmployeeAddNew} />
              ) : (
                <EmployeeForm
                  employeeId={selectedEmployeeId}
                  onSuccess={handleEmployeeFormSuccess}
                  onCancel={handleEmployeeCancel}
                />
              )}
            </>
          )}

          {module === 'sites' && (
            <>
              {view === 'list' ? (
                <SiteList onEdit={handleSiteEdit} onAddNew={handleSiteAddNew} />
              ) : (
                <SiteForm
                  siteId={selectedSiteId}
                  onSuccess={handleSiteFormSuccess}
                  onBack={handleSiteBack}
                />
              )}
            </>
          )}

          {module === 'attendance' && <AttendanceManagement />}

          {module === 'salary' && (
            <>
              {view === 'list' ? (
                <SalaryList
                  onEdit={handleSalaryEdit}
                  onAddNew={handleSalaryAddNew}
                  onViewPayslips={handleViewPayslips}
                />
              ) : view === 'form' ? (
                <SalaryForm
                  salaryId={selectedSalaryId}
                  onSuccess={handleSalaryFormSuccess}
                  onCancel={handleSalaryCancel}
                />
              ) : view === 'payslips' ? (
                <PayslipView onBack={handleBackToSalaries} />
              ) : null}
            </>
          )}

          {module === 'reports' && <Reports />}

          {module === 'companies' && isSuperAdmin && (
            <>
              {view === 'list' ? (
                <CompanyList onEdit={handleCompanyEdit} onAddNew={handleCompanyAddNew} />
              ) : (
                <CompanyForm
                  companyId={selectedCompanyId}
                  onSuccess={handleCompanyFormSuccess}
                  onBack={handleCompanyBack}
                />
              )}
            </>
          )}

          {module === 'audit' && isSuperAdmin && <AuditLogs />}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white mt-12">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            Construction Staffing HRMS - Employee Management System
          </p>
        </div>
      </footer>
    </div>
  );
};

// Router Wrapper
function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <MainApp />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
      {/* Toast Container for global notifications */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </ErrorBoundary>
  );
}

export default App;
