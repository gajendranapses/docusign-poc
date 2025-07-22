'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Envelope {
  envelopeId: string;
  emailSubject: string;
  status: string;
  createdDateTime: string;
  sentDateTime?: string;
  recipients?: {
    signers?: Array<{
      email: string;
      name: string;
      status: string;
    }>;
  };
}

interface Account {
  accountId: string;
  email: string;
  isDefault: boolean;
}

interface EnvelopeResponse {
  envelopes: Envelope[];
  totalResults: number;
  currentAccount: Account;
  availableAccounts: Account[];
}

export default function Home() {
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [availableAccounts, setAvailableAccounts] = useState<Account[]>([]);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const router = useRouter();

  const fetchEnvelopes = async (accountId?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const url = accountId 
        ? `/api/docusign-envelopes/list?accountId=${accountId}`
        : '/api/docusign-envelopes/list';
      
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'NO_ACCOUNTS') {
          setError('no_accounts');
          setEnvelopes([]);
          setAvailableAccounts([]);
          return;
        } else if (data.code === 'TOKEN_EXPIRED') {
          setError('token_expired');
          return;
        }
        throw new Error(data.error || 'Failed to fetch envelopes');
      }

      const envelopeData = data as EnvelopeResponse;
      setEnvelopes(envelopeData.envelopes);
      setCurrentAccount(envelopeData.currentAccount);
      setAvailableAccounts(envelopeData.availableAccounts);
      setSelectedAccount(envelopeData.currentAccount.accountId);
    } catch (err) {
      console.error('Error fetching envelopes:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch envelopes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnvelopes();
  }, []);

  const handleAccountChange = (accountId: string) => {
    setSelectedAccount(accountId);
    fetchEnvelopes(accountId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      sent: 'bg-blue-100 text-blue-800',
      delivered: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      signed: 'bg-green-100 text-green-800',
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error === 'no_accounts') {
    return (
      <div className="flex items-center justify-center py-20 px-4">
        <div className="text-center">
          <div className="mb-4">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No DocuSign Accounts Connected</h3>
          <p className="text-gray-500 mb-4">Connect your DocuSign account to view and manage envelopes.</p>
          <button 
            onClick={() => {
              // This will trigger the settings drawer in navbar
              const settingsBtn = document.querySelector('[title="Settings"]') as HTMLButtonElement;
              settingsBtn?.click();
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Add DocuSign Account
          </button>
        </div>
      </div>
    );
  }

  if (error === 'token_expired') {
    return (
      <div className="flex items-center justify-center py-20 px-4">
        <div className="text-center">
          <div className="mb-4">
            <svg className="mx-auto h-16 w-16 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Token Expired</h3>
          <p className="text-gray-500 mb-4">Your DocuSign access token has expired. Please reconnect your account.</p>
          <button 
            onClick={() => {
              // This will trigger the settings drawer in navbar
              const settingsBtn = document.querySelector('[title="Settings"]') as HTMLButtonElement;
              settingsBtn?.click();
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Reconnect Account
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20 px-4">
        <div className="text-center">
          <div className="mb-4">
            <svg className="mx-auto h-16 w-16 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Envelopes</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button 
            onClick={() => fetchEnvelopes()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">DocuSign Envelopes</h1>
          <p className="mt-2 text-gray-600">Manage and track your document signing requests</p>
        </div>

        {/* Account Selector */}
        {availableAccounts.length > 1 && (
          <div className="mb-6">
            <label htmlFor="account-select" className="block text-sm font-medium text-gray-700 mb-2">
              Select DocuSign Account:
            </label>
            <select
              id="account-select"
              value={selectedAccount}
              onChange={(e) => handleAccountChange(e.target.value)}
              className="block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {availableAccounts.map((account) => (
                <option key={account.accountId} value={account.accountId}>
                  {account.email} {account.isDefault ? '(Default)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Current Account Info */}
        {currentAccount && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Active Account:</span> {currentAccount.email}
              {currentAccount.isDefault && <span className="ml-2 text-xs bg-blue-200 px-2 py-1 rounded">(Default)</span>}
            </p>
          </div>
        )}

        {/* Envelopes List */}
        {envelopes.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No envelopes found</h3>
            <p className="mt-1 text-sm text-gray-500">No envelopes have been created for this account yet.</p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {envelopes.map((envelope) => (
                <li key={envelope.envelopeId}>
                  <Link
                    href={`/envelope/${envelope.envelopeId}`}
                    className="block hover:bg-gray-50 transition-colors duration-200"
                  >
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {envelope.emailSubject || 'Untitled Document'}
                          </h3>
                          <div className="mt-2 flex items-center text-sm text-gray-500">
                            <span>ID: {envelope.envelopeId}</span>
                            <span className="mx-2">•</span>
                            <span>Created: {formatDate(envelope.createdDateTime)}</span>
                            {envelope.sentDateTime && (
                              <>
                                <span className="mx-2">•</span>
                                <span>Sent: {formatDate(envelope.sentDateTime)}</span>
                              </>
                            )}
                          </div>
                          {envelope.recipients?.signers && envelope.recipients.signers.length > 0 && (
                            <div className="mt-2">
                              <span className="text-sm text-gray-500">Recipients: </span>
                              <span className="text-sm text-gray-900">
                                {envelope.recipients.signers.map(s => s.name).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          {getStatusBadge(envelope.status)}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Add Account Link */}
        <div className="mt-8 text-center">
          <button
            onClick={() => {
              // This will trigger the settings drawer in navbar
              const settingsBtn = document.querySelector('[title="Settings"]') as HTMLButtonElement;
              settingsBtn?.click();
            }}
            className="text-blue-600 hover:text-blue-500 text-sm font-medium"
          >
            Manage DocuSign Accounts
          </button>
        </div>
      </div>
    </div>
  );
}
