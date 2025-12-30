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
import Sidebar, { MenuIcon } from './components/layout/Sidebar';
import { getSelectedCompany, setSelectedCompany } from './config/api';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Main App Component
const MainApp = () => {
  const [module, setModule] = useState('dashboard');
  const [view, setView] = useState('list');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [selectedSalaryId, setSelectedSalaryId] = useState(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);

  // Sidebar states
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <div className="min-h-screen bg-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar
        module={module}
        onModuleChange={handleModuleChange}
        user={user}
        isSuperAdmin={isSuperAdmin}
        onLogout={handleLogout}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
        {/* Top Header Bar */}
        <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
          <div className="px-4 lg:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="p-2 rounded-lg hover:bg-slate-100 lg:hidden"
                >
                  <MenuIcon className="w-6 h-6 text-slate-600" />
                </button>
                <div>
                  <h1 className="text-xl font-semibold text-slate-800">
                    {module === 'dashboard' && 'Dashboard'}
                    {module === 'employees' && (view === 'form' ? (selectedEmployeeId ? 'Edit Employee' : 'Add Employee') : 'Employees')}
                    {module === 'sites' && (view === 'form' ? (selectedSiteId ? 'Edit Site' : 'Add Site') : 'Sites & Clients')}
                    {module === 'attendance' && 'Attendance Management'}
                    {module === 'salary' && (view === 'form' ? (selectedSalaryId ? 'Edit Salary' : 'Add Salary') : view === 'payslips' ? 'Payslips' : 'Salary & Payroll')}
                    {module === 'reports' && 'Reports'}
                    {module === 'companies' && (view === 'form' ? (selectedCompanyId ? 'Edit Company' : 'Add Company') : 'Companies')}
                    {module === 'audit' && 'Audit Logs'}
                  </h1>
                  {/* Company indicator */}
                  {isSuperAdmin ? (
                    selectedCompany ? (
                      <p className="text-sm text-blue-600 mt-0.5 font-medium">
                        Viewing: {selectedCompany.company_name}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-500 mt-0.5">
                        Viewing: All Companies
                      </p>
                    )
                  ) : user?.company_name && (
                    <p className="text-sm text-slate-500 mt-0.5">
                      {user.company_name}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {/* Company Switcher for SUPER_ADMIN */}
                {isSuperAdmin && (
                  <CompanySwitcher
                    selectedCompany={selectedCompany}
                    onCompanyChange={handleCompanyChange}
                  />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
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
        </main>
      </div>
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
