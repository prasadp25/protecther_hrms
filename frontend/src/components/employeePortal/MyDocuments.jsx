import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { employeePortalService } from '../../services/employeePortalService';
import IDCardPDF from './IDCardPDF';

const MyDocuments = () => {
  const [documents, setDocuments] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showIDCard, setShowIDCard] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [docsRes, profileRes] = await Promise.all([
          employeePortalService.getDocuments(),
          employeePortalService.getProfile()
        ]);
        if (docsRes.success) setDocuments(docsRes.data);
        if (profileRes.success) setProfile(profileRes.data);
      } catch (error) {
        toast.error('Failed to load documents');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDownload = (url, filename) => {
    if (!url) {
      toast.error('Document not available');
      return;
    }
    // Open in new tab or download
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';
    window.open(`${baseUrl}${url}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (showIDCard && profile) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setShowIDCard(false)}
          className="flex items-center text-indigo-600 hover:text-indigo-800"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Documents
        </button>
        <IDCardPDF employee={profile.employee} site={profile.site} />
      </div>
    );
  }

  const documentItems = [
    {
      title: 'Offer Letter',
      description: 'Your official offer letter from the company',
      icon: (
        <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      url: documents?.offer_letter_url,
      available: !!documents?.offer_letter_url,
      action: () => handleDownload(documents?.offer_letter_url, 'Offer_Letter.pdf')
    },
    {
      title: 'Employee ID Card',
      description: 'Generate and download your employee ID card',
      icon: (
        <svg className="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
        </svg>
      ),
      available: true,
      action: () => setShowIDCard(true),
      buttonText: 'Generate ID Card'
    },
    {
      title: 'Aadhaar Card',
      description: 'Your uploaded Aadhaar card document',
      icon: (
        <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      url: documents?.aadhaar_card_url,
      available: !!documents?.aadhaar_card_url,
      action: () => handleDownload(documents?.aadhaar_card_url, 'Aadhaar_Card.pdf')
    },
    {
      title: 'PAN Card',
      description: 'Your uploaded PAN card document',
      icon: (
        <svg className="w-10 h-10 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      url: documents?.pan_card_url,
      available: !!documents?.pan_card_url,
      action: () => handleDownload(documents?.pan_card_url, 'PAN_Card.pdf')
    }
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Documents</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {documentItems.map((doc, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm p-6 flex items-start space-x-4"
          >
            <div className="flex-shrink-0">
              {doc.icon}
            </div>
            <div className="flex-grow">
              <h3 className="font-semibold text-gray-900">{doc.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{doc.description}</p>
              <button
                onClick={doc.action}
                disabled={!doc.available}
                className={`mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  doc.available
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {doc.available
                  ? (doc.buttonText || 'Download')
                  : 'Not Available'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyDocuments;
