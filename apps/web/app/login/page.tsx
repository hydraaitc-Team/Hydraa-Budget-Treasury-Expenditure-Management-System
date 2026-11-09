'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, User, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { username, password });
      localStorage.setItem('hydraa_token', res.data.access_token);
      localStorage.setItem('hydraa_user', JSON.stringify(res.data.user));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 font-sans relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-700/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-700/50 z-10">
        {/* Header with ONLY HYDRAA logo */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 p-6 text-white text-center border-b border-blue-800/40">
          <div className="flex items-center justify-center mb-3">
            <div className="w-20 h-20 bg-white rounded-2xl p-2 shadow-lg flex items-center justify-center ring-2 ring-blue-500/30">
              <img
                src="/logos/hydraa-logo.png"
                alt="HYDRAA Official Emblem"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">HYDRAA</h2>
          <p className="text-xs text-blue-300 font-semibold tracking-wide uppercase mt-0.5">
            Hyderabad Disaster Response & Asset Protection Agency
          </p>
          <p className="text-[11px] text-slate-300 mt-1 font-mono">
            Government of Telangana | Treasury & Expenditure System
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="p-6 space-y-4">
          <div className="text-center mb-4">
            <h3 className="text-sm font-bold text-slate-800">Authorized Treasury Officers Portal</h3>
            <p className="text-xs text-slate-500">Local Secure Sign In</p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Treasury Username or Email</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter authorized username or official email"
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Secure Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs rounded-lg transition shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Sign In to Treasury System</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
