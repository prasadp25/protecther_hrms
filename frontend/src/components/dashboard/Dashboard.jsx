import { useState, useEffect } from 'react';
import { dashboardService } from '../../services/dashboardService';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import authService from '../../services/authService';
import { getSelectedCompany } from '../../config/api';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [companyStats, setCompanyStats] = useState([]);
  const [loadingCompanyStats, setLoadingCompanyStats] = useState(false);

  const user = authService.getUser();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const selectedCompany = isSuperAdmin ? getSelectedCompany() : null;

  useEffect(() => {
    loadDashboardData();
    // Load company stats for SUPER_ADMIN when viewing all companies
    if (isSuperAdmin && !selectedCompany) {
      loadCompanyStats();
    }
  }, []);

  // Reload when selected company changes (listen to storage events)
  useEffect(() => {
    const handleStorageChange = () => {
      loadDashboardData();
      if (isSuperAdmin && !getSelectedCompany()) {
        loadCompanyStats();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isSuperAdmin]);

  const loadCompanyStats = async () => {
    try {
      setLoadingCompanyStats(true);
      const response = await dashboardService.getCompanyWiseSummary();
      if (response.success) {
        setCompanyStats(response.data);
      }
    } catch (error) {
      console.error('Failed to load company stats:', error);
    } finally {
      setLoadingCompanyStats(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading dashboard data...');
      const response = await dashboardService.getDashboardData();
      console.log('📊 Dashboard response:', response);

      if (response.success) {
        console.log('✅ Dashboard data loaded successfully');
        setDashboardData(response.data);
      } else {
        console.error('❌ Dashboard response not successful:', response);
      }
    } catch (error) {
      console.error('❌ Failed to load dashboard:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'RESIGNED':
        return 'bg-red-100 text-red-800';
      case 'ON_LEAVE':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'employee_joined':
        return '👤';
      case 'payment_completed':
        return '✅';
      case 'payslip_generated':
        return '📄';
      default:
        return '📌';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Failed to load dashboard data</p>
        <button
          onClick={loadDashboardData}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const { employees, salary, payslips, attendance, sites, recentActivities, upcomingBirthdays } = dashboardData;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold">Welcome to HRMS Dashboard</h1>
        <p className="mt-2 text-blue-100">
          {isSuperAdmin ? (
            selectedCompany
              ? `Viewing data for ${selectedCompany.company_name}`
              : 'Overview of all companies in your organization'
          ) : (
            `Overview of ${user?.company_name || 'your company'}'s staffing management`
          )}
        </p>
      </div>

      {/* Company-wise Breakdown - SUPER_ADMIN only when viewing all companies */}
      {isSuperAdmin && !selectedCompany && (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg shadow-lg p-6 border-2 border-purple-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <svg className="w-8 h-8 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Company Overview
              </h2>
              <p className="text-sm text-gray-600 mt-1">Performance breakdown by company</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-purple-600">{companyStats.length}</p>
              <p className="text-xs text-gray-600">Companies</p>
            </div>
          </div>

          {loadingCompanyStats ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <p className="mt-2 text-gray-600">Loading company stats...</p>
            </div>
          ) : (
            <>
              {/* Company Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {companyStats.map((company, index) => {
                  const colors = [
                    { bg: 'from-blue-500 to-blue-600', light: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' },
                    { bg: 'from-green-500 to-green-600', light: 'bg-green-50', border: 'border-green-200', text: 'text-green-600' },
                    { bg: 'from-purple-500 to-purple-600', light: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600' },
                    { bg: 'from-orange-500 to-orange-600', light: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600' },
                  ];
                  const color = colors[index % colors.length];

                  return (
                    <div
                      key={company.company_id}
                      className={`${color.light} rounded-lg shadow-md border-2 ${color.border} overflow-hidden hover:shadow-lg transition-shadow`}
                    >
                      {/* Company Header */}
                      <div className={`bg-gradient-to-r ${color.bg} p-4 text-white`}>
                        <h3 className="font-bold text-lg truncate">{company.company_name}</h3>
                        <p className="text-xs opacity-80">{company.company_code}</p>
                      </div>

                      {/* Company Stats */}
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Employees</span>
                          <span className={`text-xl font-bold ${color.text}`}>{company.employee_count}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Sites</span>
                          <span className={`text-lg font-semibold ${color.text}`}>{company.site_count}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Users</span>
                          <span className={`text-lg font-semibold ${color.text}`}>{company.user_count}</span>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Salary Cost</span>
                            <span className={`text-sm font-bold ${color.text}`}>
                              {formatCurrency(company.total_salary_cost)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary Bar */}
              <div className="bg-white rounded-lg p-4 shadow border border-purple-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {companyStats.reduce((sum, c) => sum + c.employee_count, 0)}
                    </p>
                    <p className="text-xs text-gray-600">Total Employees</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {companyStats.reduce((sum, c) => sum + c.site_count, 0)}
                    </p>
                    <p className="text-xs text-gray-600">Total Sites</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">
                      {companyStats.reduce((sum, c) => sum + c.user_count, 0)}
                    </p>
                    <p className="text-xs text-gray-600">Total Users</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(companyStats.reduce((sum, c) => sum + c.total_salary_cost, 0))}
                    </p>
                    <p className="text-xs text-gray-600">Total Salary Cost</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Quick Stats Cards - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Employees */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{employees.total}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-green-600 text-sm font-semibold">
              {employees.active} Active
            </span>
            <span className="text-gray-400 mx-2">•</span>
            <span className="text-red-600 text-sm">{employees.resigned} Resigned</span>
          </div>
        </div>

        {/* Monthly Salary */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Salary</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {formatCurrency(salary.totalMonthly)}
              </p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-gray-600 text-sm">Avg: {formatCurrency(salary.average)}</span>
          </div>
        </div>

        {/* Payslips This Month */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Payslips (This Month)</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {payslips.currentMonth.total}
              </p>
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <svg
                className="w-8 h-8 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-green-600 text-sm font-semibold">
              {payslips.currentMonth.paid} Paid
            </span>
            <span className="text-gray-400 mx-2">•</span>
            <span className="text-yellow-600 text-sm">
              {payslips.currentMonth.pending} Pending
            </span>
          </div>
        </div>

        {/* Pending Payments */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Payments</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {formatCurrency(payslips.currentMonth.pendingAmount)}
              </p>
            </div>
            <div className="bg-yellow-100 rounded-full p-3">
              <svg
                className="w-8 h-8 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-gray-600 text-sm">
              Paid: {formatCurrency(payslips.currentMonth.paidAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Stats Cards - Row 2: Attendance & Site Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Average Attendance */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Attendance</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {attendance.averagePercentage}%
              </p>
            </div>
            <div className="bg-indigo-100 rounded-full p-3">
              <svg
                className="w-8 h-8 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-indigo-600 text-sm font-semibold">
              {attendance.presentRecords} Present
            </span>
            <span className="text-gray-400 mx-2">•</span>
            <span className="text-gray-600 text-sm">
              {attendance.totalRecords} Total Records
            </span>
          </div>
        </div>

        {/* Employees on Leave Today */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">On Leave Today</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {attendance.employeesOnLeaveToday}
              </p>
            </div>
            <div className="bg-orange-100 rounded-full p-3">
              <svg
                className="w-8 h-8 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-gray-600 text-sm">
              {employees.onLeave} total on leave
            </span>
          </div>
        </div>

        {/* Active Sites */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Sites</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {sites.active}
              </p>
            </div>
            <div className="bg-teal-100 rounded-full p-3">
              <svg
                className="w-8 h-8 text-teal-600"
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
            </div>
          </div>
          <div className="mt-4">
            <span className="text-teal-600 text-sm font-semibold">
              {sites.total} Total
            </span>
            <span className="text-gray-400 mx-2">•</span>
            <span className="text-gray-600 text-sm">
              {sites.inactive} Inactive
            </span>
          </div>
        </div>

        {/* Total Pending Payments (Overdue) */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue Payments</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {payslips.currentMonth.pending}
              </p>
            </div>
            <div className="bg-red-100 rounded-full p-3">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-red-600 text-sm font-semibold">
              {formatCurrency(payslips.currentMonth.pendingAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Site-wise Breakdown - Comprehensive Construction Staffing View */}
      <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg shadow-lg p-6 border-2 border-blue-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <svg className="w-8 h-8 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Site-wise Breakdown
            </h2>
            <p className="text-sm text-gray-600 mt-1">Construction staffing and salary distribution by project/site</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-blue-600">{sites.active}</p>
            <p className="text-xs text-gray-600">Active Projects</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase">Total Sites</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{sites.total}</p>
              </div>
              <div className="text-3xl">🏗️</div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {sites.active} Active • {sites.inactive} Inactive
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase">Total Workforce</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{employees.active}</p>
              </div>
              <div className="text-3xl">👷</div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Deployed across all sites
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase">Total Payroll</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(sites.employeesPerSite.reduce((sum, s) => sum + s.totalNet, 0))}
                </p>
              </div>
              <div className="text-3xl">💰</div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Monthly salary burden
            </p>
          </div>
        </div>

        {/* Detailed Site Cards */}
        <div className="space-y-4">
          {sites.employeesPerSite.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center">
              <p className="text-gray-500">No sites available</p>
            </div>
          ) : (
            sites.employeesPerSite.map((site, index) => (
              <div
                key={site.siteId}
                className={`bg-white rounded-lg shadow-md border-2 overflow-hidden transition-all hover:shadow-lg ${
                  site.status === 'ACTIVE'
                    ? 'border-green-200 hover:border-green-400'
                    : 'border-gray-200 opacity-75'
                }`}
              >
                {/* Site Header */}
                <div className={`p-4 ${
                  site.status === 'ACTIVE'
                    ? 'bg-gradient-to-r from-green-50 to-teal-50'
                    : 'bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                        site.status === 'ACTIVE' ? 'bg-green-600' : 'bg-gray-400'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">{site.siteName}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded">
                            {site.siteCode}
                          </span>
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${
                            site.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-200 text-gray-700'
                          }`}>
                            {site.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-sm text-gray-600">{site.location || 'N/A'}</span>
                      </div>
                      {site.clientName && (
                        <p className="text-xs text-gray-500 mt-1">Client: {site.clientName}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Site Metrics Grid */}
                <div className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {/* Employees */}
                    <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <svg className="w-6 h-6 text-blue-600 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <p className="text-2xl font-bold text-blue-600">{site.employeeCount}</p>
                      <p className="text-xs text-gray-600 font-medium">Employees</p>
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all"
                          style={{
                            width: `${Math.min((site.employeeCount / employees.active) * 100, 100)}%`,
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {((site.employeeCount / employees.active) * 100).toFixed(1)}% of total
                      </p>
                    </div>

                    {/* Gross Salary */}
                    <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                      <svg className="w-6 h-6 text-green-600 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(site.totalGross)}</p>
                      <p className="text-xs text-gray-600 font-medium">Gross Salary</p>
                    </div>

                    {/* Deductions */}
                    <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                      <svg className="w-6 h-6 text-red-600 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                      <p className="text-xl font-bold text-red-600">{formatCurrency(site.totalDeductions)}</p>
                      <p className="text-xs text-gray-600 font-medium">Deductions</p>
                    </div>

                    {/* Net Salary */}
                    <div className="text-center p-3 bg-purple-50 rounded-lg border-2 border-purple-300">
                      <svg className="w-6 h-6 text-purple-600 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xl font-bold text-purple-600">{formatCurrency(site.totalNet)}</p>
                      <p className="text-xs text-gray-600 font-medium">Net Payable</p>
                      <p className="text-xs text-purple-600 font-semibold mt-1">
                        {((site.totalNet / sites.employeesPerSite.reduce((sum, s) => sum + s.totalNet, 0)) * 100).toFixed(1)}% of total
                      </p>
                    </div>

                    {/* Average Salary */}
                    <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <svg className="w-6 h-6 text-yellow-600 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <p className="text-xl font-bold text-yellow-600">{formatCurrency(site.avgSalary)}</p>
                      <p className="text-xs text-gray-600 font-medium">Avg per Employee</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary Stats */}
        {sites.employeesPerSite.length > 0 && (
          <div className="mt-6 p-4 bg-white rounded-lg shadow border-2 border-blue-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Overall Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-xs text-gray-600">Highest Workforce</p>
                <p className="text-lg font-bold text-blue-600">
                  {sites.employeesPerSite[0]?.siteName || 'N/A'}
                </p>
                <p className="text-sm text-gray-500">
                  {sites.employeesPerSite[0]?.employeeCount || 0} employees
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600">Highest Payroll</p>
                <p className="text-lg font-bold text-purple-600">
                  {formatCurrency(Math.max(...sites.employeesPerSite.map(s => s.totalNet), 0))}
                </p>
                <p className="text-sm text-gray-500">
                  {sites.employeesPerSite.find(s => s.totalNet === Math.max(...sites.employeesPerSite.map(s => s.totalNet)))?.siteName || 'N/A'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600">Average per Site</p>
                <p className="text-lg font-bold text-green-600">
                  {(employees.active / sites.active).toFixed(1)} employees
                </p>
                <p className="text-sm text-gray-500">
                  {formatCurrency(sites.employeesPerSite.reduce((sum, s) => sum + s.totalNet, 0) / sites.active)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600">Sites with Staff</p>
                <p className="text-lg font-bold text-teal-600">
                  {sites.employeesPerSite.filter(s => s.employeeCount > 0).length}
                </p>
                <p className="text-sm text-gray-500">
                  {sites.employeesPerSite.filter(s => s.employeeCount === 0).length} empty sites
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employee Status Distribution - PIE CHART */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Employee Status Distribution</h3>

          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={employees.statusDistribution.map(item => ({
                  name: item.status,
                  value: item.count,
                  percentage: item.percentage
                }))}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {employees.statusDistribution.map((entry, index) => {
                  const colors = {
                    'ACTIVE': '#10b981',
                    'INACTIVE': '#ef4444',
                    'ON_LEAVE': '#f59e0b'
                  };
                  return <Cell key={`cell-${index}`} fill={colors[entry.status] || '#6b7280'} />;
                })}
              </Pie>
              <Tooltip formatter={(value, name, props) => [`${value} employees (${props.payload.percentage.toFixed(1)}%)`, name]} />
            </PieChart>
          </ResponsiveContainer>

          <div className="mt-6 pt-6 border-t">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Quick Summary</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-600">{employees.active}</div>
                <div className="text-xs text-gray-600 mt-1">Active</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded">
                <div className="text-2xl font-bold text-yellow-600">{employees.onLeave}</div>
                <div className="text-xs text-gray-600 mt-1">On Leave</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded">
                <div className="text-2xl font-bold text-red-600">{employees.resigned}</div>
                <div className="text-xs text-gray-600 mt-1">Resigned</div>
              </div>
            </div>
          </div>
        </div>

        {/* Salary Overview */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Salary Overview</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Total Monthly Burden</span>
              <span className="text-lg font-bold text-blue-600">
                {formatCurrency(salary.totalMonthly)}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Average Salary</span>
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(salary.average)}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Highest Salary</span>
              <span className="text-lg font-bold text-green-600">
                {formatCurrency(salary.max)}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Lowest Salary</span>
              <span className="text-lg font-bold text-gray-600">
                {formatCurrency(salary.min)}
              </span>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Employees on Payroll</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {salary.employeesOnPayroll}
                </p>
              </div>
              <div className="text-4xl">💰</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section - Bar and Line Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BAR CHART - Salary Comparison */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Salary Comparison</h3>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={payslips.trend.map(month => ({
                month: month.monthName,
                amount: month.total,
                payslips: month.count
              }))}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'amount') return [formatCurrency(value), 'Salary Amount'];
                  return [value, 'Payslips Count'];
                }}
                labelStyle={{ color: '#000' }}
              />
              <Legend />
              <Bar dataKey="amount" fill="#3b82f6" name="Salary Amount" radius={[8, 8, 0, 0]} />
              <Bar dataKey="payslips" fill="#10b981" name="Payslips Count" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {payslips.trend.map((month) => (
              <div key={month.month} className="text-center p-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                <p className="text-xs font-semibold text-gray-600">{month.monthName}</p>
                <p className="text-sm font-bold text-blue-600">{formatCurrency(month.total)}</p>
                <p className="text-xs text-gray-500">{month.count} payslips</p>
              </div>
            ))}
          </div>
        </div>

        {/* LINE CHART - Salary Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Salary Disbursement Trend</h3>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={payslips.trend.map(month => ({
                month: month.monthName,
                amount: month.total,
                payslips: month.count
              }))}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis
                yAxisId="left"
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
              />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'Salary Amount') return [formatCurrency(value), name];
                  return [value, name];
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="amount"
                stroke="#3b82f6"
                strokeWidth={3}
                name="Salary Amount"
                dot={{ fill: '#3b82f6', r: 6 }}
                activeDot={{ r: 8 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="payslips"
                stroke="#10b981"
                strokeWidth={3}
                name="Payslips Count"
                dot={{ fill: '#10b981', r: 6 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>

          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average per Month</p>
                <p className="text-xl font-bold text-blue-600 mt-1">
                  {formatCurrency(payslips.trend.reduce((sum, m) => sum + m.total, 0) / payslips.trend.length)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total Payslips</p>
                <p className="text-xl font-bold text-green-600 mt-1">
                  {payslips.trend.reduce((sum, m) => sum + m.count, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities, Birthdays & Recent Payslips */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h3>
          <div className="space-y-3">
            {recentActivities.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No recent activities</p>
            ) : (
              recentActivities.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition"
                >
                  <div className="text-2xl">{getActivityIcon(activity.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-600 mt-1">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(activity.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Birthdays */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Birthdays</h3>
            <span className="text-2xl">🎂</span>
          </div>
          <div className="space-y-3">
            {!upcomingBirthdays || upcomingBirthdays.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No upcoming birthdays</p>
            ) : (
              upcomingBirthdays.slice(0, 5).map((birthday) => (
                <div
                  key={birthday.employeeId}
                  className={`flex items-start space-x-3 p-3 rounded-lg transition ${
                    birthday.isToday
                      ? 'bg-gradient-to-r from-pink-100 to-purple-100 border-2 border-purple-300'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      birthday.isToday
                        ? 'bg-gradient-to-br from-pink-500 to-purple-500 text-white'
                        : 'bg-blue-100 text-blue-600'
                    } font-bold text-sm flex-shrink-0`}
                  >
                    {birthday.employeeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {birthday.employeeName}
                      {birthday.isToday && (
                        <span className="ml-1 text-xs bg-purple-600 text-white px-2 py-1 rounded-full">
                          TODAY! 🎉
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {birthday.employeeCode} • Turning {birthday.age}
                    </p>
                    <p
                      className={`text-xs font-semibold mt-1 ${
                        birthday.isToday
                          ? 'text-purple-600'
                          : birthday.daysUntil <= 3
                          ? 'text-orange-600'
                          : 'text-gray-600'
                      }`}
                    >
                      {birthday.isToday
                        ? new Date(birthday.birthdayDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })
                        : birthday.daysUntil === 1
                        ? 'Tomorrow'
                        : `In ${birthday.daysUntil} days • ${new Date(birthday.birthdayDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}`}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Payslips */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Payslips</h3>
          <div className="space-y-3">
            {payslips.recent.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No payslips generated yet</p>
            ) : (
              payslips.recent.map((slip) => (
                <div
                  key={slip.payslipId}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{slip.employeeName}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {new Date(slip.month + '-01').toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      {formatCurrency(slip.netSalary)}
                    </p>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        slip.paymentStatus === 'PAID'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {slip.paymentStatus}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="text-center">
        <button
          onClick={loadDashboardData}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          Refresh Dashboard
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
