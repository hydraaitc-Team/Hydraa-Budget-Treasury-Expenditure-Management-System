'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import {
  Wallet,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  FileSpreadsheet,
  Download,
  Building,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import api, { formatINR } from '@/lib/api';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentFyId, setCurrentFyId] = useState<string>('');

  useEffect(() => {
    const savedFy = localStorage.getItem('hydraa_selected_fy') || '';
    setCurrentFyId(savedFy);
    loadDashboard(savedFy || undefined);

    const onFyChange = (e: any) => {
      setCurrentFyId(e.detail);
      loadDashboard(e.detail);
    };
    window.addEventListener('hydraa_fy_changed', onFyChange);
    return () => window.removeEventListener('hydraa_fy_changed', onFyChange);
  }, []);

  const loadDashboard = async (fyId?: string) => {
    try {
      setLoading(true);
      const url = fyId ? `/reports/dashboard?financialYearId=${fyId}` : '/reports/dashboard';
      const res = await api.get(url);
      setData(res.data);
      if (!fyId && res.data?.selectedFinancialYear?.id) {
        const idStr = String(res.data.selectedFinancialYear.id);
        setCurrentFyId(idStr);
        localStorage.setItem('hydraa_selected_fy', idStr);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectYear = (fyId: number) => {
    const idStr = String(fyId);
    setCurrentFyId(idStr);
    localStorage.setItem('hydraa_selected_fy', idStr);
    window.dispatchEvent(new CustomEvent('hydraa_fy_changed', { detail: idStr }));
  };

  const handleExportExcel = () => {
    const savedFy = localStorage.getItem('hydraa_selected_fy');
    const q = savedFy ? `?financialYearId=${savedFy}` : '';
    window.open(`${api.defaults.baseURL}/reports/export/excel${q}`, '_blank');
  };

  const handleExportPdf = () => {
    const savedFy = localStorage.getItem('hydraa_selected_fy');
    const q = savedFy ? `?financialYearId=${savedFy}` : '';
    window.open(`${api.defaults.baseURL}/reports/export/pdf${q}`, '_blank');
  };

  if (loading && !data) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">Reconciling HYDRAA Financial Ledgers...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const s = data?.summary || {};
  const selectedFy = data?.selectedFinancialYear;
  const yearlyComparison = data?.yearlyComparison || [];
  const sourceWiseList = data?.sourceWiseList || [];

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Title & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-semibold text-slate-900 tracking-tight">HYDRAA Consolidated Financial Dashboard</h1>
            <p className="text-[12px] text-slate-500 mt-1">
              Live Reconciliation of Budget Releases, Bank Settlements & Available Balances
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[14px] font-semibold shadow-sm transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
            <button
              onClick={handleExportPdf}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[14px] font-semibold shadow-sm transition"
            >
              <Download className="w-4 h-4" />
              <span>Official PDF</span>
            </button>
          </div>
        </div>

        {/* Financial Year Switcher Bar */}
        <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-100 text-blue-700 border border-blue-200 rounded-lg shadow-sm">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider block">
                Selected Financial Year View
              </span>
              <span className="text-[16px] font-semibold text-blue-900">
                {selectedFy ? selectedFy.name : 'Loading...'} {selectedFy?.isCurrent ? '(Active Year)' : ''}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-[13px] font-medium text-slate-600 mr-1 hidden sm:inline">Switch Year:</span>
            {yearlyComparison.map((fy: any) => {
              const isSelected = String(fy.id) === String(selectedFy?.id || currentFyId);
              return (
                <button
                  key={fy.id}
                  onClick={() => handleSelectYear(fy.id)}
                  className={`px-3 py-1.5 rounded-lg text-[13px] transition flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-blue-700 text-white border-blue-700 shadow font-semibold'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200 font-medium'
                  }`}
                >
                  <span>{fy.code}</span>
                  {fy.isCurrent && (
                    <span className={`text-[11px] px-1.5 py-0.2 rounded font-semibold ${isSelected ? 'bg-blue-800 text-white' : 'bg-blue-100 text-blue-800'}`}>
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 1. SEPARATE COMPARATIVE TABLE FOR ALL FINANCIAL YEARS */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-600 shadow-sm" />
              <h3 className="font-semibold text-[16px] text-slate-800">
                Financial Years Overview & Comparison Table
              </h3>
            </div>
            <span className="text-[12px] text-slate-500 font-normal">Click any year row to view details</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[13px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Financial Year</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Total Released (₹)</th>
                  <th className="py-3 px-3 text-right">Actual Expenditure (₹)</th>
                  <th className="py-3 px-3 text-right">Unspent Balance (₹)</th>
                  <th className="py-3 px-3 text-center">Bills Count</th>
                  <th className="py-3 px-3 text-right">Total Bills (₹)</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {yearlyComparison.map((fy: any) => {
                  const isSelected = String(fy.id) === String(selectedFy?.id || currentFyId);
                  return (
                    <tr
                      key={fy.id}
                      onClick={() => handleSelectYear(fy.id)}
                      className={`cursor-pointer transition ${
                        isSelected ? 'bg-blue-50/80 font-semibold' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{fy.code}</span>
                          <span className="text-[12px] text-slate-500">({fy.name})</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {fy.isCurrent ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[12px] font-semibold bg-blue-100 text-blue-800 border border-blue-300 shadow-sm">
                            Current Active
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[12px] font-medium bg-slate-100 text-slate-600">
                            Closed / Past
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-900 tabular-nums">{formatINR(fy.released)}</td>
                      <td className="py-3 px-3 text-right font-semibold text-amber-700 tabular-nums">{formatINR(fy.expenditure)}</td>
                      <td className="py-3 px-3 text-right font-semibold text-blue-900 tabular-nums">{formatINR(fy.unspent)}</td>
                      <td className="py-3 px-3 text-center text-slate-700 font-medium tabular-nums">{fy.billsCount}</td>
                      <td className="py-3 px-3 text-right font-medium text-slate-700 tabular-nums">{formatINR(fy.billsAmount)}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectYear(fy.id);
                          }}
                          className={`px-3 py-1 text-[12px] font-semibold rounded flex items-center justify-center gap-1 mx-auto transition ${
                            isSelected
                              ? 'bg-blue-700 text-white shadow-sm'
                              : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
                          }`}
                        >
                          <span>{isSelected ? 'Viewing' : 'Select'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. YEAR-SPECIFIC KPI METRICS FOR SELECTED YEAR */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[20px] font-semibold text-slate-800 tracking-tight flex items-center gap-2">
              <span>Financial Status for {selectedFy?.code || 'Selected Year'}</span>
              <span className="text-[12px] px-2.5 py-0.5 rounded font-medium bg-blue-100 text-blue-800">
                {selectedFy?.isCurrent ? 'Active Year' : 'Historical Year'}
              </span>
            </h2>
            <span className="text-[12px] text-slate-500">Only showing data for {selectedFy?.code}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Released */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-full min-h-[125px] hover:border-slate-300 transition">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-slate-600 uppercase tracking-wider">Total Released Budget</span>
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 border border-blue-200 flex items-center justify-center shrink-0 shadow-sm">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[20px] sm:text-[22px] lg:text-[24px] font-semibold text-slate-900 mt-2 tabular-nums break-words leading-tight">{formatINR(s.totalReleased)}</p>
              <p className="text-[12px] text-blue-600 font-medium mt-1 flex items-center gap-1 break-words">
                <ArrowUpRight className="w-3 h-3 shrink-0" /> Inflow for {selectedFy?.code}
              </p>
            </div>

            {/* Expenditure */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-full min-h-[125px] hover:border-slate-300 transition">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-slate-600 uppercase tracking-wider">Actual Expenditure</span>
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0 shadow-sm">
                  <TrendingDown className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[20px] sm:text-[22px] lg:text-[24px] font-semibold text-slate-900 mt-2 tabular-nums break-words leading-tight">{formatINR(s.totalExpenditure)}</p>
              <p className="text-[12px] text-slate-500 font-normal mt-1 break-words">
                Settled in Treasury for {selectedFy?.code}
              </p>
            </div>

            {/* Available Balance */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-full min-h-[125px] hover:border-slate-300 transition">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-slate-600 uppercase tracking-wider">Available Unspent Balance</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center shrink-0 shadow-sm">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[20px] sm:text-[22px] lg:text-[24px] font-semibold text-blue-900 mt-2 tabular-nums break-words leading-tight">{formatINR(s.totalUnspent)}</p>
              <p className="text-[12px] text-blue-600 font-medium mt-1 break-words">
                Net official Treasury Liquidity
              </p>
            </div>

            {/* Pending Bills */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-full min-h-[125px] hover:border-slate-300 transition">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-slate-600 uppercase tracking-wider">Pending Bills Queue</span>
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-800 border border-rose-200 flex items-center justify-center shrink-0 shadow-sm">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[20px] sm:text-[22px] lg:text-[24px] font-semibold text-slate-900 mt-2 tabular-nums break-words leading-tight">{s.pendingBillsCount || 0} Bills</p>
              <p className="text-[12px] text-rose-600 font-medium mt-1 tabular-nums break-words">
                Committed: {formatINR(s.pendingBillsAmount)}
              </p>
            </div>
          </div>
        </div>

        {/* 3. DYNAMIC FUNDING SOURCES (NOT HARDCODED) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-[16px] text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-700 shrink-0" />
              <span>Funding Sources Breakdown ({selectedFy?.code})</span>
            </h3>
            <span className="text-[12px] text-slate-500">{sourceWiseList.length} Active Funding Source(s)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sourceWiseList.map((fs: any) => (
              <div key={fs.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-full hover:border-slate-300 transition">
                <div>
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-md bg-blue-700 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        {fs.code.substring(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-[15px] sm:text-[16px] text-slate-900 break-words leading-snug">{fs.name}</h4>
                        <p className="text-[12px] text-slate-500 break-words mt-0.5">{fs.description || fs.code}</p>
                      </div>
                    </div>
                    <span className="text-[12px] font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 shrink-0">
                      {fs.code}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 text-center">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex flex-col justify-center min-w-0">
                    <p className="text-[12px] text-slate-500 font-medium uppercase tracking-wide">Released</p>
                    <p className="text-[13.5px] sm:text-[14px] font-semibold text-slate-800 mt-0.5 tabular-nums break-words">{formatINR(fs.released)}</p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex flex-col justify-center min-w-0">
                    <p className="text-[12px] text-slate-500 font-medium uppercase tracking-wide">Expended</p>
                    <p className="text-[13.5px] sm:text-[14px] font-semibold text-amber-700 mt-0.5 tabular-nums break-words">{formatINR(fs.expenditure)}</p>
                  </div>
                  <div className="bg-blue-50/60 p-2.5 rounded-lg border border-blue-100 flex flex-col justify-center min-w-0">
                    <p className="text-[12px] text-blue-700 font-medium uppercase tracking-wide">Balance</p>
                    <p className="text-[13.5px] sm:text-[14px] font-semibold text-blue-800 mt-0.5 tabular-nums break-words">{formatINR(fs.unspent)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Purpose-wise Expenditure & Recent Settlements for Selected Year */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Purpose Breakdown Table */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-semibold text-[16px] text-slate-900 mb-3">
              Expenditure by Budget Purpose ({selectedFy?.code})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13.5px]">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[13px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Budget Purpose / Head</th>
                    <th className="py-2.5 px-3 text-right">Actual Expenditure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.purposeBreakdown?.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-4 text-center text-slate-400 text-[13.5px]">
                        No expenditure recorded for {selectedFy?.code} yet
                      </td>
                    </tr>
                  ) : (
                    data?.purposeBreakdown?.map((p: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-3 font-normal text-slate-800">{p.name}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-900 tabular-nums">{formatINR(p.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Settlements for Selected Year */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-semibold text-[16px] text-slate-900 mb-3">
              Recent Treasury Settlements ({selectedFy?.code})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13.5px]">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[13px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Settlement / UTR</th>
                    <th className="py-2.5 px-3">Bill Ref / Wing</th>
                    <th className="py-2.5 px-3 text-right">Paid Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.recentSettlements?.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-slate-400 text-[13.5px]">
                        No settlements processed for {selectedFy?.code} yet
                      </td>
                    </tr>
                  ) : (
                    data?.recentSettlements?.map((s: any) => (
                      <tr key={s.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-slate-800">{s.settlementRef}</p>
                          <p className="text-[12px] text-slate-400 font-mono">UTR: {s.utr || 'N/A'}</p>
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-normal text-slate-700">{s.billRef}</p>
                          <p className="text-[12px] text-blue-600 font-medium">{s.wing}</p>
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-blue-700 tabular-nums">
                          {formatINR(s.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
