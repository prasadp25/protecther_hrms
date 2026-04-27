import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { noticeService } from '../../services/noticeService';
import NoticeForm from './NoticeForm';

const NoticeList = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [filter, setFilter] = useState({ is_active: '', category: '' });

  useEffect(() => {
    fetchNotices();
  }, [filter]);

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter.is_active !== '') params.is_active = filter.is_active;
      if (filter.category !== '') params.category = filter.category;

      const response = await noticeService.getAllNotices(params);
      if (response.success) {
        setNotices(response.data || []);
      }
    } catch (error) {
      toast.error('Failed to load notices');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingNotice(null);
    setShowForm(true);
  };

  const handleEdit = (notice) => {
    setEditingNotice(notice);
    setShowForm(true);
  };

  const handleDelete = async (noticeId) => {
    if (!window.confirm('Are you sure you want to delete this notice?')) return;

    try {
      const response = await noticeService.deleteNotice(noticeId);
      if (response.success) {
        toast.success('Notice deleted successfully');
        fetchNotices();
      }
    } catch (error) {
      toast.error('Failed to delete notice');
    }
  };

  const handleToggleActive = async (notice) => {
    try {
      const response = await noticeService.updateNotice(notice.notice_id, {
        is_active: !notice.is_active
      });
      if (response.success) {
        toast.success(`Notice ${notice.is_active ? 'deactivated' : 'activated'}`);
        fetchNotices();
      }
    } catch (error) {
      toast.error('Failed to update notice');
    }
  };

  const handleFormClose = (saved) => {
    setShowForm(false);
    setEditingNotice(null);
    if (saved) fetchNotices();
  };

  const getCategoryBadge = (category) => {
    const colors = {
      URGENT: 'bg-red-100 text-red-800',
      POLICY: 'bg-blue-100 text-blue-800',
      HOLIDAY: 'bg-green-100 text-green-800',
      GENERAL: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.GENERAL;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (showForm) {
    return (
      <NoticeForm
        notice={editingNotice}
        onClose={handleFormClose}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Notices Management</h1>
        <button
          onClick={handleCreateNew}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Notice
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 flex flex-wrap gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Status</label>
          <select
            value={filter.is_active}
            onChange={(e) => setFilter({ ...filter, is_active: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Category</label>
          <select
            value={filter.category}
            onChange={(e) => setFilter({ ...filter, category: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">All</option>
            <option value="URGENT">Urgent</option>
            <option value="POLICY">Policy</option>
            <option value="HOLIDAY">Holiday</option>
            <option value="GENERAL">General</option>
          </select>
        </div>
      </div>

      {/* Notices Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : notices.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No notices</h3>
          <p className="mt-2 text-gray-500">Create your first notice to get started</p>
          <button
            onClick={handleCreateNew}
            className="mt-4 inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Create Notice
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {notices.map((notice) => (
                  <tr key={notice.notice_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{notice.title}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {notice.content.substring(0, 100)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryBadge(notice.category)}`}>
                        {notice.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(notice)}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          notice.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {notice.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{formatDate(notice.created_at)}</div>
                      <div className="text-xs">by {notice.created_by_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(notice)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(notice.notice_id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoticeList;
