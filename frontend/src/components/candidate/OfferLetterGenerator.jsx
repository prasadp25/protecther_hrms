import { useState, useEffect } from 'react';
import { candidateService } from '../../services/candidateService';

const OfferLetterGenerator = ({ candidate: initialCandidate, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [candidate, setCandidate] = useState(initialCandidate);
  const [offerData, setOfferData] = useState({
    offer_letter_ref: '',
    offer_letter_date: new Date().toISOString().split('T')[0],
    expected_joining_date: '',
    reporting_manager: '',
    site_name: '',
    site_location: ''
  });

  // Fetch fresh candidate data on mount
  useEffect(() => {
    const fetchCandidate = async () => {
      try {
        const response = await candidateService.getCandidateById(initialCandidate.candidate_id);
        if (response.success) {
          const freshCandidate = response.data;
          setCandidate(freshCandidate);
          setOfferData({
            offer_letter_ref: freshCandidate.offer_letter_ref || '',
            offer_letter_date: freshCandidate.offer_letter_date ? freshCandidate.offer_letter_date.split('T')[0] : new Date().toISOString().split('T')[0],
            expected_joining_date: freshCandidate.expected_joining_date ? freshCandidate.expected_joining_date.split('T')[0] : '',
            reporting_manager: freshCandidate.reporting_manager || '',
            site_name: freshCandidate.site_name || '',
            site_location: freshCandidate.site_location || ''
          });
        }
      } catch (error) {
        console.error('Failed to fetch candidate:', error);
      }
    };
    fetchCandidate();
  }, [initialCandidate.candidate_id]);

  const formatCurrency = (amount) => {
    if (!amount) return '0';
    return new Intl.NumberFormat('en-IN').format(amount);
  };

  // Auto-generate offer letter reference if not exists (after candidate data is loaded)
  useEffect(() => {
    const autoGenerateRef = async () => {
      if (candidate && !candidate.offer_letter_ref && !offerData.offer_letter_ref) {
        setLoading(true);
        try {
          const response = await candidateService.generateOfferLetter(candidate.candidate_id, {
            offer_letter_date: offerData.offer_letter_date
          });
          if (response.success) {
            setOfferData(prev => ({ ...prev, offer_letter_ref: response.data.offer_letter_ref }));
          }
        } catch (error) {
          console.error('Failed to auto-generate offer letter reference:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    autoGenerateRef();
  }, [candidate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setOfferData(prev => ({ ...prev, [name]: value }));
  };

  // The PDF is generated and stored on the server; this asks the backend to
  // (re)generate with the current form values, then downloads the stored copy
  const generatePDF = async () => {
    setDownloading(true);
    try {
      const response = await candidateService.generateOfferLetter(candidate.candidate_id, {
        offer_letter_date: offerData.offer_letter_date,
        expected_joining_date: offerData.expected_joining_date || null,
        reporting_manager: offerData.reporting_manager || null,
        site_name: offerData.site_name || offerData.site_location || null
      });
      if (response.success) {
        setOfferData(prev => ({ ...prev, offer_letter_ref: response.data.offer_letter_ref }));
      }

      const blob = await candidateService.downloadOfferLetter(candidate.candidate_id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Offer_Letter_' + candidate.candidate_code + '_' + candidate.first_name + '_' + candidate.last_name + '.pdf';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to generate offer letter');
    } finally {
      setDownloading(false);
    }
  };

  const handleMarkAsOffered = async () => {
    try {
      await candidateService.updateCandidateStatus(candidate.candidate_id, 'OFFERED');
      alert('Candidate marked as OFFERED');
      onSuccess();
    } catch (error) {
      alert('Failed to update status');
    }
  };

  const inputClass = 'w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Generate Offer Letter</h2>
          <button onClick={onCancel} className="text-slate-500 hover:text-slate-700 text-2xl">&times;</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-slate-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Candidate Details</h3>
            <p><span className="text-slate-500">Code:</span> <span className="font-medium">{candidate.candidate_code}</span></p>
            <p><span className="text-slate-500">Name:</span> <span className="font-medium">{candidate.first_name} {candidate.last_name}</span></p>
            <p><span className="text-slate-500">Position:</span> <span className="font-medium">{candidate.designation}</span></p>
            <p><span className="text-slate-500">Department:</span> <span className="font-medium">{candidate.department}</span></p>
            <p><span className="text-slate-500">Mobile:</span> <span className="font-medium">{candidate.mobile}</span></p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Salary Summary</h3>
            <p><span className="text-slate-500">CTC:</span> <span className="font-bold text-blue-600">{formatCurrency(candidate.ctc)}</span></p>
            <p><span className="text-slate-500">Gross:</span> <span className="font-medium">{formatCurrency(candidate.gross_salary)}</span></p>
            <p><span className="text-slate-500">Deductions:</span> <span className="font-medium text-red-600">{formatCurrency(candidate.total_deductions)}</span></p>
            <p><span className="text-slate-500">Net Salary:</span> <span className="font-bold text-green-600">{formatCurrency(candidate.net_salary)}</span></p>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold mb-4">Offer Letter Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Offer Reference (Auto-generated)</label>
              <input
                type="text"
                value={loading ? 'Generating...' : (offerData.offer_letter_ref || 'Error generating')}
                readOnly
                className={inputClass + ' bg-slate-50 font-semibold ' + (offerData.offer_letter_ref ? 'text-blue-600' : 'text-slate-400')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Offer Date</label>
              <input type="date" name="offer_letter_date" value={offerData.offer_letter_date} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Joining Date</label>
              <input type="date" name="expected_joining_date" value={offerData.expected_joining_date} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Reporting Manager</label>
              <input type="text" name="reporting_manager" value={offerData.reporting_manager} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Site/Location</label>
              <input type="text" name="site_name" value={offerData.site_name || offerData.site_location} onChange={handleChange} className={inputClass} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <button onClick={onCancel} className="px-6 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={generatePDF} disabled={downloading} className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            {downloading ? 'Generating...' : 'Download PDF'}
          </button>
          {candidate.status === 'PENDING' && (
            <button onClick={handleMarkAsOffered} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Mark as Offered</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfferLetterGenerator;
