'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string;
}

interface DocuSignAccount {
  id?: number;
  user_id: string;
  email: string;
  name: string;
  account_id: string;
  account_name: string;
  is_default: boolean;
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [docusignAccounts, setDocusignAccounts] = useState<DocuSignAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Get user from API since cookie is httpOnly
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();
        if (data.user) {
          setUser(data.user);
        } else {
          // No user session, redirect to login
          router.push('/login');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        router.push('/login');
      }
    };

    fetchUser();
  }, [router]);

  const fetchDocusignAccounts = async () => {
    if (!user) return;
    
    setIsLoadingAccounts(true);
    try {
      const response = await fetch('/api/docusign/accounts');
      if (response.ok) {
        const accounts = await response.json();
        setDocusignAccounts(accounts);
      }
    } catch (error) {
      console.error('Error fetching DocuSign accounts:', error);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const handleSettingsOpen = () => {
    setShowSettings(true);
    fetchDocusignAccounts();
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if API fails
      router.push('/login');
    }
  };

  const handleConnectAccount = () => {
    const currentUrl = window.location.pathname;
    window.location.href = `/api/docusign/authorize?returnUrl=${encodeURIComponent(currentUrl)}`;
  };

  const handleSetDefaultAccount = async (accountId: string) => {
    try {
      const response = await fetch('/api/docusign/accounts/set-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });

      if (response.ok) {
        fetchDocusignAccounts(); // Refresh the list
      }
    } catch (error) {
      console.error('Error setting default account:', error);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to remove this DocuSign account?')) {
      return;
    }

    try {
      const response = await fetch(`/api/docusign/accounts/${accountId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchDocusignAccounts(); // Refresh the list
      }
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  if (!user) {
    return (
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-xl font-semibold text-gray-900 dark:text-white">DocuSign POC</span>
              </Link>
            </div>

            {/* Loading User Menu */}
            <div className="flex items-center space-x-4">
              <div className="animate-pulse bg-gray-200 dark:bg-gray-600 h-4 w-20 rounded"></div>
              <div className="animate-pulse bg-gray-200 dark:bg-gray-600 h-8 w-8 rounded"></div>
              <div className="animate-pulse bg-gray-200 dark:bg-gray-600 h-8 w-16 rounded"></div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <>
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-xl font-semibold text-gray-900 dark:text-white">DocuSign POC</span>
              </Link>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Welcome, <span className="font-medium">{user.name}</span>
              </span>
              
              <button
                onClick={handleSettingsOpen}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-300 dark:border-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Settings Drawer */}
      {showSettings && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75" onClick={() => setShowSettings(false)}></div>
          
          <div className="absolute right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* User Info */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">User Information</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Name: {user.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Email: {user.email}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">ID: {user.id}</p>
              </div>

              {/* DocuSign Accounts */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900 dark:text-white">DocuSign Accounts</h3>
                  <button
                    onClick={handleConnectAccount}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Account
                  </button>
                </div>

                {isLoadingAccounts ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : docusignAccounts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <p className="text-sm">No DocuSign accounts connected</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Click "Add Account" to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {docusignAccounts.map((account) => (
                      <div key={account.account_id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">{account.account_name}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{account.email}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">ID: {account.account_id}</p>
                          </div>
                          {account.is_default && (
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full">
                              Default
                            </span>
                          )}
                        </div>
                        
                        <div className="flex space-x-2">
                          {!account.is_default && (
                            <button
                              onClick={() => handleSetDefaultAccount(account.account_id)}
                              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-500"
                            >
                              Set Default
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteAccount(account.account_id)}
                            className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}