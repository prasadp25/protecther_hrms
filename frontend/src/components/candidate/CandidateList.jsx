import { useState, useEffect } from 'react';
import { candidateService } from '../../services/candidateService';
import { siteService } from '../../services/siteService';
import usePagination from '../../hooks/usePagination';
import Pagination from '../common/Pagination';

const CandidateList = ({ onEdit, onAddNew, onGenerateOfferLetter, onConvertToEmployee }) => {
  const [candidates, setCandidates] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState(null);

  const { page, limit, search, setPage, setLimit, setSearch, sortBy, sortOrder, getQueryParams } = usePagination(1, 10);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [siteFilter, setSiteFilter] = useState('ALL');

  useEffect(() => { loadCandidates(); }, [page, limit, search, sortBy, sortOrder, statusFilter, siteFilter]);
  useEffect(() => { loadSites(); }, []);

  const loadCandidates = async () => {
    try {
      setLoading(true);
      const params = getQueryParams();
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (siteFilter !== 'ALL') params.siteId = siteFilter;
      const response = await candidateService.getAllCandidates(params);
      if (response.success !== false) {
        setCandidates(response.data || []);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error('Failed to load candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSites = async () => {
    try {
      const response = await siteService.getActiveSites();
      if (response.success) setSites(response.data || []);
    } catch (error) {
      console.error('Failed to load sites:', error);
    }
  };

  const getSiteName = (siteId) => {
    if (!siteId) return '-';
    const site = sites.find(s => s.site_id === siteId);
    return site ? site.site_name : '-';
  };

  const handleDelete = async (id, name) => {
    if (window.confirm('Are you sure you want to delete candidate ' + name + '?')) {
      try {
        const response = await candidateService.deleteCandidate(id);
        if (response.success) { alert(response.message); loadCandidates(); }
      } catch (error) { alert('Failed to delete candidate'); }
    }
  };

  const getStatusBadgeClass = (status) => {
    const base = 'px-2 py-1 rounded-full text-xs font-semibold';
    const colors = {
      PENDING: 'bg-gray-100 text-gray-800',
      OFFERED: 'bg-blue-100 text-blue-800',
      ACCEPTED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      NEGOTIATING: 'bg-yellow-100 text-yellow-800',
      CONVERTED: 'bg-purple-100 text-purple-800'
    };
    return base + ' ' + (colors[status] || '');
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Candidate Management</h2>
          <p className="text-sm text-slate-500 mt-1">Track candidates and generate offer letters</p>
        </div>
        <button onClick={onAddNew} className="inline-flex items-center px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm hover:shadow-md font-medium">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Candidate
        </button>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <input type="text" placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
            <svg className="w-5 h-5 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="OFFERED">Offered</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
            <option value="NEGOTIATING">Negotiating</option>
            <option value="CONVERTED">Converted</option>
          </select>
          <select value={siteFilter} onChange={(e) => { setSiteFilter(e.target.value); setPage(1); }}
            className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="ALL">All Sites</option>
            {sites.map(site => <option key={site.site_id} value={site.site_id}>{site.site_name}</option>)}
          </select>
          <select value={limit} onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(1); }}
            className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : candidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <p className="text-lg font-medium">No candidates found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Code</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Candidate</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Position</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Site</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">CTC</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Net Salary</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Offer Ref</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {candidates.map((c) => (
                  <tr key={c.candidate_id} className="hover:bg-slate-50">
                    <td className="px-6 py-4"><span className="font-medium text-blue-600">{c.candidate_code}</span></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                          {c.first_name?.[0]}{c.last_name?.[0]}
                        </div>
                        <div className="ml-3">
                          <p className="font-medium text-slate-800">{c.first_name} {c.last_name}</p>
                          <p className="text-sm text-slate-500">{c.mobile}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><p className="font-medium">{c.designation}</p><p className="text-sm text-slate-500">{c.department}</p></td>
                    <td className="px-6 py-4 text-slate-600">{getSiteName(c.site_id)}</td>
                    <td className="px-6 py-4 font-medium">{formatCurrency(c.ctc)}</td>
                    <td className="px-6 py-4 font-medium text-green-600">{formatCurrency(c.net_salary)}</td>
                    <td className="px-6 py-4">{c.offer_letter_ref ? <span className="text-blue-600 font-medium">{c.offer_letter_ref}</span> : '-'}</td>
                    <td className="px-6 py-4"><span className={getStatusBadgeClass(c.status)}>{c.status}</span></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => onEdit(c)} className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        {c.status !== 'CONVERTED' && (
                          <button onClick={() => onGenerateOfferLetter(c)} className="p-2 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Offer Letter">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          </button>
                        )}
                        {c.status === 'ACCEPTED' && (
                          <button onClick={() => onConvertToEmployee(c)} className="p-2 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg" title="Convert">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                          </button>
                        )}
                        {c.status !== 'CONVERTED' && (
                          <button onClick={() => handleDelete(c.candidate_id, c.first_name + ' ' + c.last_name)} className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100">
            <Pagination currentPage={page} totalPages={pagination.totalPages} onPageChange={setPage} totalItems={pagination.total} itemsPerPage={limit} />
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidateList;
