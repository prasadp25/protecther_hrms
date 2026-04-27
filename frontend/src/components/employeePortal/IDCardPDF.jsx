import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const IDCardPDF = ({ employee, site }) => {
  const cardRef = useRef(null);

  const handleDownload = async () => {
    if (!cardRef.current) return;

    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [86, 54] // Standard ID card size in mm
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 86, 54);
      pdf.save(`ID_Card_${employee.employee_code}.pdf`);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    }
  };

  const verifyUrl = `${window.location.origin}/verify-employee/${employee.employee_code}`;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Employee ID Card Preview</h2>

        {/* ID Card Preview */}
        <div className="flex justify-center mb-6">
          <div
            ref={cardRef}
            className="w-[340px] h-[216px] bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 rounded-xl p-4 text-white relative overflow-hidden"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
            </div>

            {/* Header */}
            <div className="relative flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold tracking-wider">PROTECTHER</h3>
                <p className="text-[10px] text-indigo-200">EMPLOYEE ID CARD</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-indigo-200">Employee Code</p>
                <p className="text-sm font-bold">{employee.employee_code}</p>
              </div>
            </div>

            {/* Content */}
            <div className="relative flex gap-4">
              {/* Photo */}
              <div className="w-20 h-24 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                {employee.photo_url ? (
                  <img
                    src={employee.photo_url}
                    alt={employee.first_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-grow">
                <h4 className="font-bold text-lg leading-tight">
                  {employee.first_name} {employee.last_name}
                </h4>
                <p className="text-indigo-200 text-sm">{employee.designation || 'Employee'}</p>

                <div className="mt-2 space-y-1">
                  <div className="flex items-center text-[11px]">
                    <span className="text-indigo-200 w-16">Dept:</span>
                    <span>{employee.department || '-'}</span>
                  </div>
                  <div className="flex items-center text-[11px]">
                    <span className="text-indigo-200 w-16">Site:</span>
                    <span>{site?.site_name || '-'}</span>
                  </div>
                  <div className="flex items-center text-[11px]">
                    <span className="text-indigo-200 w-16">Blood:</span>
                    <span className="border border-dashed border-indigo-300 px-2 rounded">______</span>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="w-16 h-16 bg-white rounded p-1">
                <QRCodeSVG
                  value={verifyUrl}
                  size={56}
                  level="M"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-2 left-4 right-4 flex justify-between items-center text-[9px] text-indigo-200">
              <span>Valid Till: Dec 2025</span>
              <span>If found, please return to HR</span>
            </div>
          </div>
        </div>

        {/* Download Button */}
        <div className="flex justify-center">
          <button
            onClick={handleDownload}
            className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download ID Card (PDF)
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Instructions</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>Print this ID card on a standard ID card paper (CR80 - 86mm x 54mm)</li>
            <li>Fill in your blood group in the designated space</li>
            <li>Laminate the card for durability</li>
            <li>The QR code can be scanned to verify your employee details</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default IDCardPDF;
