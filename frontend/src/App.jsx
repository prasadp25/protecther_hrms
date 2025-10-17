import { useState } from 'react';
import Dashboard from './components/dashboard/Dashboard';
import EmployeeList from './components/employee/EmployeeList';
import EmployeeForm from './components/employee/EmployeeForm';
import SiteList from './components/site/SiteList';
import SiteForm from './components/site/SiteForm';
import SalaryList from './components/salary/SalaryList';
import SalaryForm from './components/salary/SalaryForm';
import PayslipView from './components/salary/PayslipView';
import AttendanceCalendar from './components/attendance/AttendanceCalendar';
import MarkAttendance from './components/attendance/MarkAttendance';
import AttendanceReport from './components/attendance/AttendanceReport';

function App() {
  const [module, setModule] = useState('dashboard'); // 'dashboard', 'employees', 'sites', 'salary', or 'attendance'
  const [view, setView] = useState('list'); // 'list', 'form', 'payslips', 'calendar', 'mark', 'report'
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [selectedSalaryId, setSelectedSalaryId] = useState(null);

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

  // Attendance handlers
  const handleMarkAttendance = () => {
    setView('mark');
  };

  const handleViewReports = () => {
    setView('report');
  };

  const handleBackToCalendar = () => {
    setView('calendar');
  };

  // Module switch handler
  const handleModuleChange = (newModule) => {
    setModule(newModule);
    // Set appropriate default view for each module
    if (newModule === 'attendance') {
      setView('calendar');
    } else {
      setView('list');
    }
    setSelectedEmployeeId(null);
    setSelectedSiteId(null);
    setSelectedSalaryId(null);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">
              HRMS - Construction Staffing
            </h1>
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {module === 'dashboard' && <Dashboard />}

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

          {module === 'attendance' && (
            <>
              {view === 'calendar' ? (
                <AttendanceCalendar
                  onMarkAttendance={handleMarkAttendance}
                  onViewReports={handleViewReports}
                />
              ) : view === 'mark' ? (
                <MarkAttendance onBack={handleBackToCalendar} />
              ) : view === 'report' ? (
                <AttendanceReport onBack={handleBackToCalendar} />
              ) : null}
            </>
          )}

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
}

export default App;
