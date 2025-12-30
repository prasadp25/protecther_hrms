import { useState, useEffect } from 'react';
import { employeeService } from '../../services/employeeService';
import { siteService } from '../../services/siteService';
import usePagination from '../../hooks/usePagination';
import Pagination from '../common/Pagination';

const EmployeeList = ({ onEdit, onAddNew }) => {
  const [employees, setEmployees] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState(null);

  // Use pagination hook
  const {
    page,
    limit,
    search,
    setPage,
    setLimit,
    setSearch,
    toggleSort,
    sortBy,
    sortOrder,
    setFilters,
    filters,
    getQueryParams
  } = usePagination(1, 10);

  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    loadEmployees();
  }, [page, limit, search, sortBy, sortOrder, statusFilter]);

  useEffect(() => {
    loadSites();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const params = getQueryParams();

      // Add status filter if not ALL
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

      const response = await employeeService.getAllEmployees(params);
      if (response.success) {
        setEmployees(response.data);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error('Failed to load employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSites = async () => {
    try {
      const response = await siteService.getAllSites();
      if (response.success) {
        setSites(response.data);
      }
    } catch (error) {
      console.error('Failed to load sites:', error);
    }
  };

  const getSiteName = (siteId) => {
    if (!siteId) return '-';
    const site = sites.find(s => s.site_id === siteId);
    return site ? `${site.site_code} - ${site.site_name}` : '-';
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    setPage(1); // Reset to first page when changing filter
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to mark ${name} as resigned?`)) {
      try {
        const response = await employeeService.deleteEmployee(id);
        if (response.success) {
          alert(response.message);
          loadEmployees();
        }
      } catch (error) {
        alert('Failed to delete employee');
      }
    }
  };

  const handleViewDocument = (url, type) => {
    if (!url) return;
    const backendUrl = 'http://localhost:5000';

    // If URL already starts with /uploads/, use it directly
    if (url.startsWith('/uploads/')) {
      window.open(`${backendUrl}${url}`, '_blank');
    } else {
      // Otherwise, construct the full path
      let folderPath = '';
      switch(type) {
        case 'offer-letter':
          folderPath = 'offer-letters';
          break;
        case 'aadhaar':
          folderPath = 'aadhaar-cards';
          break;
        case 'pan':
          folderPath = 'pan-cards';
          break;
        default:
          folderPath = '';
      }
      window.open(`${backendUrl}/uploads/${folderPath}/${url}`, '_blank');
    }
  };

  const handleStatusChange = async (employeeId, newStatus, employeeName) => {
    if (window.confirm(`Are you sure you want to change status of ${employeeName} to ${newStatus}?`)) {
      try {
        const response = await employeeService.updateEmployee(employeeId, { status: newStatus });
        if (response.success) {
          alert('Status updated successfully');
          loadEmployees();
        }
      } catch (error) {
        alert('Failed to update status');
      }
    }
  };

  const getStatusBadgeClass = (status) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-semibold';
    switch (status) {
      case 'ACTIVE':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'RESIGNED':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'TERMINATED':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      case 'ON_LEAVE':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      default:
        return baseClasses;
    }
  };

  const getStatusSelectClass = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'RESIGNED':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'TERMINATED':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'ON_LEAVE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Employee Management</h2>
          <p className="text-sm text-slate-500 mt-1">Manage your workforce efficiently</p>
        </div>
        <button
          onClick={onAddNew}
          className="inline-flex items-center px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm hover:shadow-md font-medium"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Employee
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, code, mobile, or email..."
                value={search}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border-slate-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 border text-slate-700 placeholder-slate-400"
              />
            </div>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border-slate-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2.5 border text-slate-700"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="RESIGNED">Resigned</option>
              <option value="TERMINATED">Terminated</option>
              <option value="ON_LEAVE">On Leave</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex items-center text-sm text-slate-500">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Showing <span className="font-semibold text-slate-700 mx-1">{employees.length}</span> employees
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <p className="mt-3 text-slate-500">Loading employees...</p>
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-16 h-16 mx-auto text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="mt-4 text-slate-500 font-medium">No employees found</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 table-auto">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Emp Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    First Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Last Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Mobile
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    DOB
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Aadhaar No
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    PAN No
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Qualification
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Account No
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    IFSC Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Bank Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    UAN No
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    PF No
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Joining Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Leaving Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Offer Letter Issue Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Offer Letter
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Emergency Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Emergency Mobile
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Relationship
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Designation
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Department
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Site/Client
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    WP Policy
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Hospital Insurance ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap sticky bg-gray-50 shadow-[-2px_0_4px_rgba(0,0,0,0.1)]" style={{ right: '90px' }}>
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap sticky right-0 bg-gray-50 shadow-[-2px_0_4px_rgba(0,0,0,0.1)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((employee) => (
                  <tr key={employee.employee_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {employee.employee_code}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {employee.first_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {employee.last_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {employee.mobile}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {employee.email || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {employee.dob ? new Date(employee.dob).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {employee.aadhaar_no || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {employee.pan_no || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {employee.qualification || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {employee.account_number || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {employee.ifsc_code || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {employee.bank_name || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {employee.uan_no || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {employee.pf_no || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate" title={employee.address}>
                      {employee.address || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {new Date(employee.date_of_joining).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {employee.date_of_leaving ? new Date(employee.date_of_leaving).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {employee.offer_letter_issue_date ? new Date(employee.offer_letter_issue_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {employee.offer_letter_url ? (
                        <button
                          onClick={() => handleViewDocument(employee.offer_letter_url, 'offer-letter')}
                          className="text-blue-600 hover:text-blue-800 cursor-pointer underline"
                          title={employee.offer_letter_url}
                        >
                          📄 View
                        </button>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {employee.emergency_contact_name || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {employee.emergency_contact_mobile || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {employee.emergency_contact_relationship || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {employee.designation || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {employee.department || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {getSiteName(employee.site_id)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        employee.wp_policy === 'Yes'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {employee.wp_policy || 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {employee.hospital_insurance_id || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap sticky bg-white shadow-[-2px_0_4px_rgba(0,0,0,0.1)]" style={{ right: '90px' }}>
                      <select
                        value={employee.status}
                        onChange={(e) => handleStatusChange(employee.employee_id, e.target.value, `${employee.first_name} ${employee.last_name}`)}
                        className={`text-xs font-semibold rounded-full px-2 py-1 border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${getStatusSelectClass(employee.status)}`}
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="ON_LEAVE">ON_LEAVE</option>
                        <option value="RESIGNED">RESIGNED</option>
                        <option value="TERMINATED">TERMINATED</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-2 sticky right-0 bg-white shadow-[-2px_0_4px_rgba(0,0,0,0.1)]">
                      <button
                        onClick={() => onEdit(employee.employee_id)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="Edit"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button
                        onClick={() =>
                          handleDelete(
                            employee.employee_id,
                            `${employee.first_name} ${employee.last_name}`
                          )
                        }
                        className="text-red-600 hover:text-red-900 p-1"
                        title="Delete"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && (
          <Pagination
            pagination={pagination}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        )}
      </div>
    </div>
  );
};

export default EmployeeList;
