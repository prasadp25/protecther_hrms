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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Audit Logs</h1>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 flex gap-4 flex-wrap">
        <select
          value={filter.table_name}
          onChange={(e) => setFilter({ ...filter, table_name: e.target.value, page: 1 })}
          className="border rounded px-3 py-2"
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
          className="border rounded px-3 py-2"
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
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Clear Filters
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No audit logs found</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
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
          <div className="px-4 py-3 border-t flex justify-between items-center">
            <span className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter({ ...filter, page: filter.page - 1 })}
                disabled={filter.page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setFilter({ ...filter, page: filter.page + 1 })}
                disabled={filter.page >= pagination.totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
