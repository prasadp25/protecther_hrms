import { useState, useEffect } from 'react';
import api from '../../config/api';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    table_name: '',
    action: '',
    page: 1
  });
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    fetchLogs();
  }, [filter.page, filter.table_name, filter.action]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', filter.page);
      params.append('limit', 20);
      if (filter.table_name) params.append('table_name', filter.table_name);
      if (filter.action) params.append('action', filter.action);

      const response = await api.get(`/audit-logs?${params.toString()}`);
      if (response.data.success) {
        setLogs(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionBadge = (action) => {
    const colors = {
      CREATE: 'bg-green-100 text-green-800',
      UPDATE: 'bg-blue-100 text-blue-800',
      DELETE: 'bg-red-100 text-red-800',
      LOGIN: 'bg-purple-100 text-purple-800',
      APPROVE: 'bg-yellow-100 text-yellow-800'
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  const formatChanges = (oldValues, newValues) => {
    if (!oldValues && !newValues) return '-';

    try {
      const oldObj = oldValues ? JSON.parse(oldValues) : {};
      const newObj = newValues ? JSON.parse(newValues) : {};

      const changes = [];
      const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

      for (const key of allKeys) {
        if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
          changes.push(
            <div key={key} className="text-xs">
              <span className="font-medium">{key}:</span>{' '}
              <span className="text-red-600 line-through">{oldObj[key] ?? 'null'}</span>
              {' → '}
              <span className="text-green-600">{newObj[key] ?? 'null'}</span>
            </div>
          );
        }
      }

      return changes.length > 0 ? changes : '-';
    } catch {
      return '-';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Audit Logs</h1>
        <p className="text-sm text-slate-500 mt-1">Track all system changes and user activities</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex gap-4 flex-wrap items-center">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="text-sm font-medium text-slate-600">Filters:</span>
        </div>

        <select
          value={filter.table_name}
          onChange={(e) => setFilter({ ...filter, table_name: e.target.value, page: 1 })}
          className="rounded-xl border-slate-200 px-4 py-2.5 border text-slate-700 text-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">All Tables</option>
          <option value="employees">Employees</option>
          <option value="salaries">Salaries</option>
          <option value="attendance">Attendance</option>
          <option value="payslips">Payslips</option>
          <option value="users">Users</option>
        </select>

        <select
          value={filter.action}
          onChange={(e) => setFilter({ ...filter, action: e.target.value, page: 1 })}
          className="rounded-xl border-slate-200 px-4 py-2.5 border text-slate-700 text-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
          <option value="LOGIN">Login</option>
          <option value="APPROVE">Approve</option>
        </select>

        <button
          onClick={() => setFilter({ table_name: '', action: '', page: 1 })}
          className="inline-flex items-center px-4 py-2.5 text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <p className="mt-3 text-slate-500">Loading audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-4 text-slate-500 font-medium">No audit logs found</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Table</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Record ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Changes</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.log_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{formatDate(log.created_at)}</td>
                  <td className="px-4 py-3 text-sm">
                    <div>{log.user_name}</div>
                    <div className="text-xs text-gray-500">{log.user_role}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getActionBadge(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{log.table_name}</td>
                  <td className="px-4 py-3 text-sm">{log.record_id}</td>
                  <td className="px-4 py-3 text-sm max-w-xs">
                    {formatChanges(log.old_values, log.new_values)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{log.ip_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-5 py-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
            <span className="text-sm text-slate-600">
              Page <span className="font-semibold">{pagination.page}</span> of <span className="font-semibold">{pagination.totalPages}</span> ({pagination.total} records)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter({ ...filter, page: filter.page - 1 })}
                disabled={filter.page === 1}
                className="inline-flex items-center px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
              <button
                onClick={() => setFilter({ ...filter, page: filter.page + 1 })}
                disabled={filter.page >= pagination.totalPages}
                className="inline-flex items-center px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
