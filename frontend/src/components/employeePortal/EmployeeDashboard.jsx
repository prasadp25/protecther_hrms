import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { employeePortalService } from '../../services/employeePortalService';

const EmployeeDashboard = () => {
  const [profile, setProfile] = useState(null);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const employee = employeePortalService.getStoredEmployee();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, noticesRes] = await Promise.all([
          employeePortalService.getProfile(),
          employeePortalService.getNotices()
        ]);
        if (profileRes.success) setProfile(profileRes.data);
        if (noticesRes.success) setNotices(noticesRes.data.slice(0, 3)); // Show only 3 recent
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const quickLinks = [
    {
      title: 'My Payslips',
      description: 'View and download your monthly payslips',
      path: '/employee-portal/payslips',
      icon: (
        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'bg-green-50 hover:bg-green-100'
    },
    {
      title: 'My Profile',
      description: 'View your personal and salary details',
      path: '/employee-portal/profile',
      icon: (
        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      color: 'bg-blue-50 hover:bg-blue-100'
    },
    {
      title: 'My Documents',
      description: 'Download offer letter and ID card',
      path: '/employee-portal/documents',
      icon: (
        <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      ),
      color: 'bg-purple-50 hover:bg-purple-100'
    },
    {
      title: 'Insurance',
      description: 'View insurance details and hospital list',
      path: '/employee-portal/insurance',
      icon: (
        <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      color: 'bg-indigo-50 hover:bg-indigo-100'
    }
  ];

  const getCategoryColor = (category) => {
    switch (category) {
      case 'URGENT': return 'bg-red-100 text-red-800';
      case 'POLICY': return 'bg-blue-100 text-blue-800';
      case 'HOLIDAY': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
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
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">
          Welcome, {employee?.first_name}!
        </h1>
        <p className="text-indigo-200 mt-1">
          {profile?.employee?.designation || 'Employee'} at {employee?.company_name}
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`p-6 rounded-xl ${link.color} transition-colors`}
          >
            <div className="flex items-start space-x-4">
              {link.icon}
              <div>
                <h3 className="font-semibold text-gray-900">{link.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{link.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Profile Summary & Notices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Summary */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Summary</h2>
          {profile?.employee && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Employee Code</span>
                <span className="font-medium">{profile.employee.employee_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Department</span>
                <span className="font-medium">{profile.employee.department || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Designation</span>
                <span className="font-medium">{profile.employee.designation || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date of Joining</span>
                <span className="font-medium">
                  {profile.employee.date_of_joining
                    ? new Date(profile.employee.date_of_joining).toLocaleDateString('en-IN')
                    : '-'}
                </span>
              </div>
              {profile.site && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Site</span>
                  <span className="font-medium">{profile.site.site_name}</span>
                </div>
              )}
            </div>
          )}
          <Link
            to="/employee-portal/profile"
            className="block text-center mt-4 text-indigo-600 hover:underline text-sm"
          >
            View Full Profile
          </Link>
        </div>

        {/* Recent Notices */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Notices</h2>
            <Link
              to="/employee-portal/notices"
              className="text-indigo-600 hover:underline text-sm"
            >
              View All
            </Link>
          </div>
          {notices.length > 0 ? (
            <div className="space-y-3">
              {notices.map((notice) => (
                <div key={notice.notice_id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(notice.category)}`}>
                      {notice.category}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(notice.created_at).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <h4 className="font-medium text-gray-900">{notice.title}</h4>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No notices at this time</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
