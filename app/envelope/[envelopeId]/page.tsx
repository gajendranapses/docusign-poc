'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

interface SignerDocument {
  documentId: string;
  documentName: string;
  status: "signed" | "not_signed";
  signedDateTime?: string;
}

interface SignerStatus {
  email: string;
  name: string;
  signedCount: number;
  totalDocuments: number;
  documents: SignerDocument[];
}

interface TimelineEvent {
  status: "created" | "sent" | "delivered" | "signed" | "completed";
  dateTime: string;
  completed: boolean;
}

interface EnvelopeData {
  envelopeId: string;
  status: string;
  timeline: TimelineEvent[];
  signers: SignerStatus[];
}

const TimelineIcon = ({ status, completed }: { status: string; completed: boolean }) => {
  const getIcon = () => {
    switch (status) {
      case 'created':
        return '📄';
      case 'sent':
        return '📨';
      case 'delivered':
        return '📥';
      case 'signed':
        return '✍️';
      case 'completed':
        return '✅';
      default:
        return '⭕';
    }
  };

  return (
    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 ${
      completed 
        ? 'bg-green-500 border-green-500 text-white shadow-lg scale-110' 
        : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'
    }`}>
      <span className="text-lg">{getIcon()}</span>
    </div>
  );
};

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export default function EnvelopePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const envelopeId = params.envelopeId as string;
  const accountId = searchParams.get('accountId');
  const [envelopeData, setEnvelopeData] = useState<EnvelopeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSigners, setExpandedSigners] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (envelopeId) {
      fetchEnvelopeData();
    }
  }, [envelopeId]);


  const fetchEnvelopeData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const url = accountId 
        ? `/api/docusign-envelopes/${envelopeId}/signers-status?accountId=${accountId}`
        : `/api/docusign-envelopes/${envelopeId}/signers-status`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch envelope data');
      }
      const data = await response.json();
      setEnvelopeData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const toggleSigner = (email: string) => {
    const newExpanded = new Set(expandedSigners);
    if (newExpanded.has(email)) {
      newExpanded.delete(email);
    } else {
      newExpanded.add(email);
    }
    setExpandedSigners(newExpanded);
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      
      // Download combined PDF of all documents
      const downloadUrl = accountId 
        ? `/api/docusign-envelopes/${envelopeId}/download?type=combined&accountId=${accountId}`
        : `/api/docusign-envelopes/${envelopeId}/download?type=combined`;
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        throw new Error('Failed to download documents');
      }
      
      // Get the blob from response
      const blob = await response.blob();
      
      // Create a download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `envelope-${envelopeId}-documents.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download documents. Please try again.');
    } finally {
      setDownloading(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading envelope data...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 text-xl mb-4">❌ Error</div>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!envelopeData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">No envelope data found</p>
      </div>
    );
  }

  return (
    <div className="py-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Envelope Details</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center">
                    📥 {envelopeData.status.charAt(0).toUpperCase() + envelopeData.status.slice(1)}
                  </span>
                  <span>📋 {envelopeData.envelopeId.substring(0, 12)}...</span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={handleDownload}
                  disabled={downloading}
                  className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 text-gray-700 dark:text-gray-300"
                >
                  <span>📥</span>
                  <span>{downloading ? 'Downloading...' : 'Download'}</span>
                </button>
                <button 
                  onClick={() => fetchEnvelopeData(true)}
                  disabled={loading || refreshing}
                  className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 text-gray-700 dark:text-gray-300"
                >
                  <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
                  <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                </button>
              </div>
            </div>
          </div>

        {/* Timeline */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">📋 Timeline</h2>
          <div className="space-y-6">
            {envelopeData.timeline.map((event) => (
              <div key={event.status} className="flex items-center space-x-4">
                <TimelineIcon status={event.status} completed={event.completed} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`font-medium capitalize text-lg ${
                      event.completed 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {event.status}
                    </span>
                    <span className={`text-sm ${
                      event.completed 
                        ? 'text-green-500 dark:text-green-400' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {formatDate(event.dateTime)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Signatories */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">👥 Signatories</h2>
          <div className="space-y-4">
            {envelopeData.signers.map((signer) => (
              <div key={signer.email} className="border border-gray-200 dark:border-gray-600 rounded-lg">
                {/* Signer Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between transition-colors duration-200"
                  onClick={() => toggleSigner(signer.email)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {signer.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{signer.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{signer.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {signer.signedCount} of {signer.totalDocuments} Signed
                    </span>
                    <svg 
                      className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
                        expandedSigners.has(signer.email) ? 'rotate-180' : ''
                      }`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Signer Documents */}
                {expandedSigners.has(signer.email) && (
                  <div className="border-t border-gray-200 dark:border-gray-600">
                    {signer.documents.map((document) => (
                      <div key={document.documentId} className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                            📄
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white truncate max-w-md">
                              {decodeURIComponent(document.documentName)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Document ID: {document.documentId} • Size: 3.2 MB
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            document.status === 'signed' 
                              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}>
                            {document.status === 'signed' ? 'Signed' : 'Not Signed'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}