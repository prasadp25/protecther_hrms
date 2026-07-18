import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ErrorBoundary from './components/error/ErrorBoundary';
import Login from './components/auth/Login';
import authService from './services/authService';
import CompanySwitcher from './components/common/CompanySwitcher';
import Sidebar, { MenuIcon } from './components/layout/Sidebar';
import { getSelectedCompany, setSelectedCompany } from './config/api';
import { employeePortalService } from './services/employeePortalService';

// Modules are lazy-loaded so heavy libraries (charts, Excel, PDF) download
// only when their screen is opened - keeps the first load small on slow
// site connections.
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));
const EmployeeList = lazy(() => import('./components/employee/EmployeeList'));
const EmployeeForm = lazy(() => import('./components/employee/EmployeeForm'));
const SiteList = lazy(() => import('./components/site/SiteList'));
const SiteForm = lazy(() => import('./components/site/SiteForm'));
const SalaryList = lazy(() => import('./components/salary/SalaryList'));
const SalaryForm = lazy(() => import('./components/salary/SalaryForm'));
const PayslipView = lazy(() => import('./components/salary/PayslipView'));
const AttendanceManagement = lazy(() => import('./components/attendance/AttendanceManagement'));
const Reports = lazy(() => import('./components/reports/Reports'));
const CompanyList = lazy(() => import('./components/company/CompanyList'));
const CompanyForm = lazy(() => import('./components/company/CompanyForm'));
const AuditLogs = lazy(() => import('./components/audit/AuditLogs'));
const NoticeList = lazy(() => import('./components/notices/NoticeList'));
const InsuranceSettings = lazy(() => import('./components/settings/InsuranceSettings'));
const CandidateList = lazy(() => import('./components/candidate/CandidateList'));
const CandidateForm = lazy(() => import('./components/candidate/CandidateForm'));
const OfferLetterGenerator = lazy(() => import('./components/candidate/OfferLetterGenerator'));
const ConvertToEmployee = lazy(() => import('./components/candidate/ConvertToEmployee'));
const EmployeeLogin = lazy(() => import('./components/employeePortal/EmployeeLogin'));
const EmployeePortalLayout = lazy(() => import('./components/employeePortal/EmployeePortalLayout'));
const EmployeeDashboard = lazy(() => import('./components/employeePortal/EmployeeDashboard'));
const MyProfile = lazy(() => import('./components/employeePortal/MyProfile'));
const MyPayslips = lazy(() => import('./components/employeePortal/MyPayslips'));
const MyDocuments = lazy(() => import('./components/employeePortal/MyDocuments'));
const InsuranceInfo = lazy(() => import('./components/employeePortal/InsuranceInfo'));
const EmployeeNotices = lazy(() => import('./components/employeePortal/Notices'));

// Shown while a lazily-loaded screen's code downloads
const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

// Protected Route Component for Admin
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Protected Route Component for Employee Portal
const ProtectedEmployeeRoute = ({ children }) => {
  const isAuthenticated = employeePortalService.isLoggedIn();
  return isAuthenticated ? children : <Navigate to="/employee-portal/login" replace />;
};

// Main App Component
const MainApp = () => {
  const [module, setModule] = useState('dashboard');
  const [view, setView] = useState('list');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [selectedSalaryId, setSelectedSalaryId] = useState(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [preSelectedEmployeeForSalary, setPreSelectedEmployeeForSalary] = useState(null);

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

  const handleEmployeeFormSuccess = (employeeData) => {
    if (employeeData && employeeData.employee_id) {
      // User wants to add salary structure for newly created employee
      setPreSelectedEmployeeForSalary(employeeData.employee_id);
      setModule('salary');
      setView('form');
      setSelectedSalaryId(null);
    } else {
      setView('list');
    }
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

  // Candidate handlers
  const handleCandidateAddNew = () => {
    setSelectedCandidate(null);
    setView('form');
  };

  const handleCandidateEdit = (candidate) => {
    setSelectedCandidate(candidate);
    setView('form');
  };

  const handleCandidateFormSuccess = () => {
    setView('list');
    setSelectedCandidate(null);
  };

  const handleCandidateCancel = () => {
    setView('list');
    setSelectedCandidate(null);
  };

  const handleGenerateOfferLetter = (candidate) => {
    setSelectedCandidate(candidate);
    setView('offer-letter');
  };

  const handleConvertToEmployee = (candidate) => {
    setSelectedCandidate(candidate);
    setView('convert');
  };

  // Module switch handler
  const handleModuleChange = (newModule) => {
    setModule(newModule);
    setView('list');
    setSelectedEmployeeId(null);
    setSelectedSiteId(null);
    setSelectedSalaryId(null);
    setSelectedCompanyId(null);
    setSelectedCandidate(null);
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
                    {module === 'candidates' && (view === 'form' ? (selectedCandidate ? 'Edit Candidate' : 'Add Candidate') : view === 'offer-letter' ? 'Generate Offer Letter' : view === 'convert' ? 'Convert to Employee' : 'Candidates')}
                    {module === 'employees' && (view === 'form' ? (selectedEmployeeId ? 'Edit Employee' : 'Add Employee') : 'Employees')}
                    {module === 'sites' && (view === 'form' ? (selectedSiteId ? 'Edit Site' : 'Add Site') : 'Sites & Clients')}
                    {module === 'attendance' && 'Attendance Management'}
                    {module === 'salary' && (view === 'form' ? (selectedSalaryId ? 'Edit Salary' : 'Add Salary') : view === 'payslips' ? 'Payslips' : 'Salary & Payroll')}
                    {module === 'reports' && 'Reports'}
                    {module === 'companies' && (view === 'form' ? (selectedCompanyId ? 'Edit Company' : 'Add Company') : 'Companies')}
                    {module === 'audit' && 'Audit Logs'}
                    {module === 'notices' && 'Notices Management'}
                    {module === 'settings' && 'Settings'}
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
          <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
          {module === 'dashboard' && (
            <Dashboard key={selectedCompany?.company_id || 'all'} />
          )}

          {module === 'candidates' && (
            <>
              {view === 'list' ? (
                <CandidateList
                  onEdit={handleCandidateEdit}
                  onAddNew={handleCandidateAddNew}
                  onGenerateOfferLetter={handleGenerateOfferLetter}
                  onConvertToEmployee={handleConvertToEmployee}
                />
              ) : view === 'form' ? (
                <CandidateForm
                  candidate={selectedCandidate}
                  onSuccess={handleCandidateFormSuccess}
                  onCancel={handleCandidateCancel}
                />
              ) : view === 'offer-letter' ? (
                <OfferLetterGenerator
                  candidate={selectedCandidate}
                  onSuccess={handleCandidateFormSuccess}
                  onCancel={handleCandidateCancel}
                />
              ) : view === 'convert' ? (
                <ConvertToEmployee
                  candidate={selectedCandidate}
                  onSuccess={handleCandidateFormSuccess}
                  onCancel={handleCandidateCancel}
                />
              ) : null}
            </>
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
                  preSelectedEmployeeId={preSelectedEmployeeForSalary}
                  onSuccess={() => {
                    setPreSelectedEmployeeForSalary(null);
                    handleSalaryFormSuccess();
                  }}
                  onCancel={() => {
                    setPreSelectedEmployeeForSalary(null);
                    handleSalaryCancel();
                  }}
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

          {module === 'notices' && <NoticeList />}

          {module === 'settings' && <InsuranceSettings />}
          </Suspense>
          </ErrorBoundary>
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
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
        <Routes>
          {/* Admin Login */}
          <Route path="/login" element={<Login />} />

          {/* Employee Portal Routes */}
          <Route path="/employee-portal/login" element={<EmployeeLogin />} />
          <Route
            path="/employee-portal"
            element={
              <ProtectedEmployeeRoute>
                <EmployeePortalLayout />
              </ProtectedEmployeeRoute>
            }
          >
            <Route index element={<Navigate to="/employee-portal/dashboard" replace />} />
            <Route path="dashboard" element={<EmployeeDashboard />} />
            <Route path="profile" element={<MyProfile />} />
            <Route path="payslips" element={<MyPayslips />} />
            <Route path="documents" element={<MyDocuments />} />
            <Route path="insurance" element={<InsuranceInfo />} />
            <Route path="notices" element={<EmployeeNotices />} />
          </Route>

          {/* Admin Routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <MainApp />
              </ProtectedRoute>
            }
          />
        </Routes>
        </Suspense>
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
