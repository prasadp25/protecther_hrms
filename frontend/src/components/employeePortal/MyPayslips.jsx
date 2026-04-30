import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { pdf } from '@react-pdf/renderer';
import { employeePortalService } from '../../services/employeePortalService';
import PayslipPDFTemplateNew from '../salary/PayslipPDFTemplateNew';

const MyPayslips = () => {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'detail'

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  useEffect(() => {
    fetchPayslips();
  }, [selectedYear]);

  const fetchPayslips = async () => {
    setLoading(true);
    try {
      const response = await employeePortalService.getPayslips({ year: selectedYear });
      if (response.success) {
        setPayslips(response.data || []);
      }
    } catch (error) {
      toast.error('Failed to load payslips');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPayslip = async (payslipId) => {
    try {
      const response = await employeePortalService.getPayslipById(payslipId);
      if (response.success) {
        setSelectedPayslip(response.data);
        setViewMode('detail');
      }
    } catch (error) {
      toast.error('Failed to load payslip details');
    }
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatMonth = (monthStr) => {
    if (!monthStr) return '-';
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  const getPaymentStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDownloadPDF = async (payslip) => {
    try {
      const blob = await pdf(<PayslipPDFTemplateNew payslip={payslip} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Payslip_${payslip.month}_${payslip.employee_code || 'employee'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Payslip downloaded successfully');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    }
  };

  if (viewMode === 'detail' && selectedPayslip) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => {
            setViewMode('list');
            setSelectedPayslip(null);
          }}
          className="flex items-center text-indigo-600 hover:text-indigo-800"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Payslips
        </button>

        {/* Payslip Details Card */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Payslip for {formatMonth(selectedPayslip.month)}
              </h2>
              <p className="text-gray-500 mt-1">
                {selectedPayslip.first_name} {selectedPayslip.last_name} ({selectedPayslip.employee_code})
              </p>
            </div>
            <button
              onClick={() => handleDownloadPDF(selectedPayslip)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download PDF
            </button>
          </div>

          {/* Earnings & Deductions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Earnings */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-700 mb-4 pb-2 border-b">Earnings</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Basic Salary</span>
                  <span className="font-medium">{formatCurrency(selectedPayslip.basic_salary)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">HRA</span>
                  <span className="font-medium">{formatCurrency(selectedPayslip.hra)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Other Allowances</span>
                  <span className="font-medium">{formatCurrency(selectedPayslip.other_allowances)}</span>
                </div>
                {selectedPayslip.bonus > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bonus</span>
                    <span className="font-medium">{formatCurrency(selectedPayslip.bonus)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t font-semibold text-green-700">
                  <span>Gross Salary</span>
                  <span>{formatCurrency(selectedPayslip.gross_salary)}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-red-700 mb-4 pb-2 border-b">Deductions</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">PF Deduction</span>
                  <span className="font-medium">{formatCurrency(selectedPayslip.pf_deduction)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ESI Deduction</span>
                  <span className="font-medium">{formatCurrency(selectedPayslip.esi_deduction)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Professional Tax</span>
                  <span className="font-medium">{formatCurrency(selectedPayslip.professional_tax)}</span>
                </div>
                {selectedPayslip.tds > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">TDS</span>
                    <span className="font-medium">{formatCurrency(selectedPayslip.tds)}</span>
                  </div>
                )}
                {selectedPayslip.advance_deduction > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Advance Deduction</span>
                    <span className="font-medium">{formatCurrency(selectedPayslip.advance_deduction)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t font-semibold text-red-700">
                  <span>Total Deductions</span>
                  <span>{formatCurrency(selectedPayslip.total_deductions)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Salary */}
          <div className="mt-6 bg-indigo-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-lg font-semibold text-gray-700">Net Salary</span>
                <p className="text-sm text-gray-500">
                  {selectedPayslip.days_present} / {selectedPayslip.total_working_days} days worked
                </p>
              </div>
              <span className="text-3xl font-bold text-indigo-600">
                {formatCurrency(selectedPayslip.net_salary)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">My Payslips</h1>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">Year:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Payslips List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : payslips.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No payslips found</h3>
          <p className="mt-2 text-gray-500">No payslips available for {selectedYear}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Month
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gross Salary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deductions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Salary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payslips.map((payslip) => (
                  <tr key={payslip.payslip_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">
                        {formatMonth(payslip.month)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {formatCurrency(payslip.gross_salary)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-red-600">
                      {formatCurrency(payslip.total_deductions)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-green-600">
                        {formatCurrency(payslip.net_salary)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusBadge(payslip.payment_status)}`}>
                        {payslip.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleViewPayslip(payslip.payslip_id)}
                        className="text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        View / Download
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

export default MyPayslips;
