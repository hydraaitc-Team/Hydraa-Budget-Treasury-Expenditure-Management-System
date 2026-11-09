'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import { History, Shield, Filter, Search, RefreshCw } from 'lucide-react';
import api from '@/lib/api';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAuditLogs();
  }, [moduleFilter]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const q = moduleFilter !== 'ALL' ? `&module=${moduleFilter}` : '';
      const res = await api.get(`/audit/logs?limit=100${q}`);
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((l) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      l.action?.toLowerCase().includes(q) ||
      l.module?.toLowerCase().includes(q) ||
      l.recordId?.toLowerCase().includes(q) ||
      l.details?.toLowerCase().includes(q) ||
      l.user?.fullName?.toLowerCase().includes(q) ||
      l.user?.username?.toLowerCase().includes(q)
    );
  });

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Title */}
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-semibold text-slate-900 tracking-tight">System Audit & Security Trail</h1>
            <p className="text-[12px] text-slate-500 mt-1">
              Immutable Records of Financial Transactions, Modifications, User Logins & Exports
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium px-3 py-1 bg-slate-200 text-slate-800 rounded-lg">
              {total} Total Audit Events Recorded
            </span>
            <button
              onClick={loadAuditLogs}
              className="px-3 py-1.5 text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 shadow-sm transition flex items-center gap-1.5 text-xs font-semibold"
              title="Refresh Audit Logs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-700" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Audit Filter Controls */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search action, officer, module or details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-[14px] border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 font-normal"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="text-[13.5px] p-1.5 border border-slate-200 rounded-lg bg-white font-medium"
              >
                <option value="ALL">All Modules</option>
                <option value="BILLS">Bills & Vouchers</option>
                <option value="PAYMENTS">Treasury Settlements</option>
                <option value="BUDGET">Budget Transactions</option>
                <option value="DOCUMENTS">Documents & Proofs</option>
                <option value="VENDORS">Vendors Master</option>
                <option value="MASTERS_FY">Financial Years</option>
                <option value="MASTERS_FUNDING_SOURCE">Funding Sources</option>
                <option value="USERS">User Accounts</option>
                <option value="ROLES_PERMISSIONS">Roles & Permissions</option>
                <option value="AUTH">Authentication</option>
              </select>
            </div>
          </div>

          <span className="text-[12px] text-slate-500 font-normal">
            Showing {filteredLogs.length} of {logs.length} loaded records
          </span>
        </div>

        {/* Audit Log Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-[16px] text-slate-800">Audit Events Log</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[13px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Officer / User</th>
                  <th className="py-3 px-3">Action</th>
                  <th className="py-3 px-3">Module</th>
                  <th className="py-3 px-3">Record ID</th>
                  <th className="py-3 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-[13.5px]">
                      {searchQuery || moduleFilter !== 'ALL' ? 'No audit events matching criteria' : 'No audit events found.'}
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-3 text-slate-500 font-mono text-[12px] tabular-nums">
                        {new Date(l.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-900">{l.user?.fullName || 'System'}</p>
                        <p className="text-[12px] text-slate-400 font-mono">{l.user?.username || 'ANON'}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded text-[12px] font-medium font-mono ${
                            l.action.includes('CREATE') || l.action.includes('UPLOAD')
                              ? 'bg-blue-100 text-blue-800'
                              : l.action.includes('DELETE')
                              ? 'bg-red-100 text-red-800'
                              : l.action.includes('PAYMENT') || l.action.includes('VERIFY')
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {l.action}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-700">{l.module}</td>
                      <td className="py-2 px-3 font-mono text-slate-500">#{l.recordId || '-'}</td>
                      <td className="py-2 px-3 text-slate-600 max-w-md truncate" title={l.details}>
                        {l.details || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
