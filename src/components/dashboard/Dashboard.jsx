import { useState, useEffect } from 'react';
import { dashboardService } from '../../services/dashboardService';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await dashboardService.getDashboardData();
      if (response.success) {
        setDashboardData(response.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
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

  const { employees, salary, payslips, recentActivities, upcomingBirthdays } = dashboardData;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold">Welcome to HRMS Dashboard</h1>
        <p className="mt-2 text-blue-100">
          Overview of your construction staffing management system
        </p>
      </div>

      {/* Quick Stats Cards */}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employee Status Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Employee Status Distribution</h3>
          <div className="space-y-4">
            {employees.statusDistribution.map((item) => (
              <div key={item.status}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">{item.status}</span>
                  <span className="text-sm text-gray-600">
                    {item.count} ({item.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      item.status === 'ACTIVE'
                        ? 'bg-green-500'
                        : item.status === 'RESIGNED'
                        ? 'bg-red-500'
                        : 'bg-yellow-500'
                    }`}
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Quick Summary</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-600">{employees.active}</div>
                <div className="text-xs text-gray-600 mt-1">Active</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded">
                <div className="text-2xl font-bold text-yellow-600">{employees.onLeave}</div>
                <div className="text-xs text-gray-600 mt-1">On Leave</div>
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

      {/* Salary Trend (Last 3 Months) */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Salary Disbursement Trend</h3>
        <div className="grid grid-cols-3 gap-4">
          {payslips.trend.map((month, index) => (
            <div key={month.month} className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">{month.monthName}</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(month.total)}</p>
              <p className="text-xs text-gray-500 mt-2">{month.count} payslips</p>
              <div className="mt-3 h-24 flex items-end justify-center">
                <div
                  className="w-full bg-blue-500 rounded-t"
                  style={{
                    height: `${(month.total / Math.max(...payslips.trend.map((m) => m.total))) * 100}%`,
                    minHeight: '20%',
                  }}
                ></div>
              </div>
            </div>
          ))}
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
