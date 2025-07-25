'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { STATIC_USERS } from '@/lib/auth/users';

export default function LoginPage() {
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: selectedUser,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Redirect to home or the page they were trying to access
      const returnUrl = new URLSearchParams(window.location.search).get('returnUrl') || '/';
      router.push(returnUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Sign in to DocuSign POC
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Select a demo user to continue
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="user-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select User
              </label>
              <select
                id="user-select"
                required
                value={selectedUser}
                onChange={(e) => {
                  setSelectedUser(e.target.value);
                  // Auto-fill password for demo
                  if (e.target.value) {
                    setPassword('demo123');
                  }
                }}
                className="appearance-none rounded-t-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              >
                <option value="">-- Select a user --</option>
                {STATIC_USERS.map((user) => (
                  <option key={user.id} value={user.email}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-b-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <div className="text-sm text-red-800 dark:text-red-300">{error}</div>
            </div>
          )}

          <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
            <p className="font-medium">Demo Credentials:</p>
            <p>Password for all users: <code className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200 px-1 py-0.5 rounded">demo123</code></p>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !selectedUser}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}