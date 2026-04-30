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
        scale: 3,
        backgroundColor: null,
        useCORS: true
      });

      const imgData = canvas.toDataURL('image/png');

      // Standard CR80 ID card size: 85.6mm x 53.98mm
      // Using landscape orientation (width > height)
      const cardWidth = 85.6;
      const cardHeight = 54;

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [cardHeight, cardWidth] // [height, width] for landscape
      });

      pdf.addImage(imgData, 'PNG', 0, 0, cardWidth, cardHeight);
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
            className="w-[340px] h-[216px] rounded-xl overflow-hidden relative bg-white border border-gray-200"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            {/* Top Section - White Header with Logo */}
            <div className="h-[60px] bg-white px-4 py-2 flex items-center justify-between border-b-2 border-purple-600">
              <div className="flex items-center gap-2">
                <img
                  src="/protecther-logo.png"
                  alt="ProtectHer"
                  className="h-12 w-auto object-contain"
                  crossOrigin="anonymous"
                />
              </div>
              <div className="text-right">
                <p className="text-[9px] text-gray-500 uppercase tracking-wide">Employee ID</p>
                <p className="text-sm font-bold text-purple-700">{employee.employee_code}</p>
              </div>
            </div>

            {/* Main Content - White Background */}
            <div className="h-[148px] bg-white px-4 py-3 flex gap-3">
              {/* Photo */}
              <div className="w-[72px] h-[90px] border-2 border-purple-300 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 bg-gray-50">
                {employee.photo_url ? (
                  <img
                    src={employee.photo_url}
                    alt={employee.first_name}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-grow min-w-0">
                <h4 className="font-bold text-base text-gray-800 leading-tight truncate">
                  {employee.first_name} {employee.last_name}
                </h4>
                <p className="text-purple-600 text-xs font-medium">{employee.designation || 'Employee'}</p>

                <div className="mt-2 space-y-0.5">
                  <div className="flex items-center text-[10px]">
                    <span className="text-gray-500 w-14">Dept:</span>
                    <span className="text-gray-700 font-medium">{employee.department || '-'}</span>
                  </div>
                  <div className="flex items-center text-[10px]">
                    <span className="text-gray-500 w-14">Site:</span>
                    <span className="text-gray-700 font-medium truncate">{site?.site_name || '-'}</span>
                  </div>
                  <div className="flex items-center text-[10px]">
                    <span className="text-gray-500 w-14">Blood:</span>
                    <span className="text-gray-400 border border-dashed border-gray-300 px-1.5 rounded text-[9px]">_____</span>
                  </div>
                </div>

                {/* Footer inside content */}
                <div className="mt-2 pt-1 border-t border-gray-100 flex justify-between items-center text-[8px] text-gray-400">
                  <span>Valid: Dec 2026</span>
                  <span>If found, return to HR</span>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex-shrink-0 flex flex-col items-center">
                <div className="w-[56px] h-[56px] bg-white border border-purple-200 rounded p-1">
                  <QRCodeSVG
                    value={verifyUrl}
                    size={48}
                    level="M"
                    fgColor="#7c3aed"
                  />
                </div>
                <p className="text-[7px] text-gray-400 mt-1">Scan to verify</p>
              </div>
            </div>

            {/* Bottom accent line */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600"></div>
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
