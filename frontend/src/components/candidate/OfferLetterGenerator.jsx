import { useState, useEffect } from 'react';
import { candidateService } from '../../services/candidateService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const OfferLetterGenerator = ({ candidate, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [logoBase64, setLogoBase64] = useState(null);
  const [offerData, setOfferData] = useState({
    offer_letter_ref: candidate?.offer_letter_ref || '',
    offer_letter_date: candidate?.offer_letter_date ? candidate.offer_letter_date.split('T')[0] : new Date().toISOString().split('T')[0],
    expected_joining_date: candidate?.expected_joining_date ? candidate.expected_joining_date.split('T')[0] : '',
    reporting_manager: candidate?.reporting_manager || '',
    site_name: candidate?.site_name || '',
    site_location: candidate?.site_location || ''
  });

  const formatCurrency = (amount) => {
    if (!amount) return '0';
    return new Intl.NumberFormat('en-IN').format(amount);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Load logo and auto-generate reference on mount
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const response = await fetch('/protecther-logo.png');
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoBase64(reader.result);
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error('Failed to load logo:', error);
      }
    };
    loadLogo();

    // Auto-generate offer letter reference if not exists
    const autoGenerateRef = async () => {
      if (!candidate?.offer_letter_ref) {
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
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setOfferData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerateOfferLetter = async () => {
    setLoading(true);
    try {
      const response = await candidateService.generateOfferLetter(candidate.candidate_id, {
        offer_letter_date: offerData.offer_letter_date
      });
      if (response.success) {
        setOfferData(prev => ({ ...prev, offer_letter_ref: response.data.offer_letter_ref }));
        alert('Offer letter reference generated: ' + response.data.offer_letter_ref);
      }
    } catch (error) {
      alert('Failed to generate offer letter reference');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 15;

    // Header with Logo
    if (logoBase64) {
      // Add logo on the left side (width: 50, height: auto based on aspect ratio ~2.5:1)
      doc.addImage(logoBase64, 'PNG', margin, y, 50, 20);
    }

    // Company details on the right side
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.text('PROTECTHER LLP', pageWidth - margin, y + 5, { align: 'right' });
    doc.text('CIN: AAR-2877', pageWidth - margin, y + 10, { align: 'right' });
    doc.text('+91 9699791896 | hr@protecther.in', pageWidth - margin, y + 15, { align: 'right' });
    doc.text('Pune, Maharashtra, India', pageWidth - margin, y + 20, { align: 'right' });

    y += 30;

    // Horizontal line separator
    doc.setDrawColor(150, 180, 80); // Green color from logo
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Reference and Date
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Ref. No: ' + (offerData.offer_letter_ref || 'PLLP-XXXX-XXX'), margin, y);
    doc.text('Date: ' + formatDate(offerData.offer_letter_date), pageWidth - margin, y, { align: 'right' });
    y += 15;

    // To Section
    doc.setFont('helvetica', 'normal');
    doc.text('To,', margin, y); y += 6;
    const prefix = candidate.gender === 'Female' ? 'Ms.' : 'Mr.';
    doc.text(prefix + ' ' + candidate.first_name + ' ' + candidate.last_name, margin, y); y += 6;
    if (candidate.address) { doc.text(candidate.address, margin, y); y += 6; }
    if (candidate.city || candidate.state) { doc.text((candidate.city || '') + (candidate.city && candidate.state ? ', ' : '') + (candidate.state || '') + (candidate.pincode ? ' - ' + candidate.pincode : ''), margin, y); y += 6; }
    doc.text('Contact No.: ' + candidate.mobile, margin, y); y += 6;
    if (candidate.email) { doc.text('E Mail ID - ' + candidate.email, margin, y); y += 6; }
    y += 8;

    // Subject
    doc.setFont('helvetica', 'bold');
    doc.text('Subject: Offer of Employment for the Position - ' + candidate.designation, margin, y);
    y += 12;

    // Dear Section
    doc.setFont('helvetica', 'normal');
    doc.text('Dear ' + candidate.first_name + ' Congratulations!', margin, y);
    y += 8;
    const intro = 'We are pleased to offer you the position for ' + candidate.designation + ' and welcome you to the PROTECTHER LLP.';
    const introLines = doc.splitTextToSize(intro, pageWidth - 2 * margin);
    doc.text(introLines, margin, y);
    y += introLines.length * 6 + 6;

    // Terms and Conditions
    doc.setFont('helvetica', 'bold');
    doc.text('Here with attached terms and conditions:', margin, y);
    y += 8;
    doc.setFont('helvetica', 'normal');

    const terms = [
      '1. Your date of joining will be ' + formatDate(offerData.expected_joining_date) + '. You will initially be reporting to ' + (offerData.reporting_manager || 'your manager') + ' at ' + (offerData.site_name || offerData.site_location || 'the assigned site') + '. Based on operational requirements, you may be transferred to other project sites across PAN India as per management decision.',
      '2. You will be paid a total remuneration of Rs. ' + formatCurrency(candidate.ctc) + '/- (CTC), which includes the employer\'s contributions towards PF/Mediclaim, if applicable etc. The allowances, benefits and other terms and conditions of your employment will be as per Company policies as applicable from time to time. Minimum ' + (candidate.notice_period || 15) + ' days of notice period will be considered for your notice period in case of letter of resignation.',
      '3. We expect you to join on or before the date mentioned above, in line with discussion with you, otherwise this offer will stand withdrawn automatically. We also reserve to cancel this offer in case any information furnished by you is found to be false.',
      '4. On joining the company, you shall be on probation for ' + (candidate.probation_period || 6) + ' months, this may be reduced or extended based on your performance or conduct. You will abide by the rules and regulations of the Company as may be in force from time to time.',
      '5. Failed to serve the notice period and probation period will go for further legal proceeding such as termination or suspension.',
      '6. Any employee going on unapproved leaves of more than 15 days will go for the legal proceeding direct termination/suspension.'
    ];

    terms.forEach(term => {
      const lines = doc.splitTextToSize(term, pageWidth - 2 * margin);
      if (y + lines.length * 5 > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(lines, margin, y);
      y += lines.length * 5 + 4;
    });

    // Page 2 - Documents and Salary
    doc.addPage();
    y = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('DOCUMENTS REQUIRED BEFORE JOINING', margin, y);
    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const documents = [
      'Updated CV',
      'Proof for Birth date (PAN Card / ADHAR Card / Birth Certificate / Leaving Certificate / Transfer Certificate)',
      'Proof of Identity (Passport / Driving License / Voter ID Card)',
      'Academic and Professional Certificates',
      'Softcopy of recent photograph in JPEG format',
      'Release Certificate / Resignation acceptance from last employer',
      'Pay slip and bank statement for last 3 months',
      'UAN or PF details'
    ];

    documents.forEach(docItem => {
      doc.text('• ' + docItem, margin + 5, y);
      y += 6;
    });

    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Your tentative salary break-up as below:', margin, y);
    y += 10;

    // Salary Table
    autoTable(doc, {
      startY: y,
      head: [['Particulars', 'Amount', 'Deductions', 'Amount']],
      body: [
        ['Basic', formatCurrency(candidate.basic_salary), 'PF', formatCurrency(candidate.pf_deduction)],
        ['HRA', formatCurrency(candidate.hra), 'PT', formatCurrency(candidate.pt_deduction)],
        ['Conveyance', formatCurrency(candidate.conveyance_allowance), 'Mediclaim', formatCurrency(candidate.mediclaim_deduction)],
        ['Other Allowances', formatCurrency(candidate.other_allowances), '', ''],
        ['Gross Salary', formatCurrency(candidate.gross_salary), 'Total Deductions', formatCurrency(candidate.total_deductions)],
        ['', '', 'Net Payment', formatCurrency(candidate.net_salary)]
      ],
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 3 },
      margin: { left: margin, right: margin }
    });

    y = doc.lastAutoTable.finalY + 15;

    // Note
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('Note - This is for your reference, if any changes it will be as per the government statutory norms.', margin, y);
    y += 6;
    doc.text('PT will be 300 for month of February.', margin, y);
    y += 15;

    // Signature Section
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Thanking you,', margin, y);
    doc.text('Agreed and Accepted', pageWidth - margin - 50, y);
    y += 6;
    doc.text('For PROTECTHER LLP', margin, y);
    y += 15;
    doc.setFont('helvetica', 'bold');
    doc.text('Ms. Ayushi Shukla', margin, y);
    doc.text(prefix + ' ' + candidate.first_name + ' ' + candidate.last_name, pageWidth - margin - 50, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.text('HR Head and Talent Acquisition', margin, y);
    doc.text('(Signature & Date)', pageWidth - margin - 50, y);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('www.protecther.in | hr@protecther.in | +91 9699791896', pageWidth / 2, 285, { align: 'center' });

    // Save PDF
    const fileName = 'Offer_Letter_' + candidate.candidate_code + '_' + candidate.first_name + '_' + candidate.last_name + '.pdf';
    doc.save(fileName);
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
          <button onClick={generatePDF} className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Download PDF
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
