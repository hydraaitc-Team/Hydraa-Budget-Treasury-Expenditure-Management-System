'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import { FileSpreadsheet, Download, Calendar } from 'lucide-react';
import api, { formatINR } from '@/lib/api';

export default function ReportsPage() {
  const [fys, setFys] = useState<any[]>([]);
  const [selectedFy, setSelectedFy] = useState<string>('');

  useEffect(() => {
    const saved = localStorage.getItem('hydraa_selected_fy');
    api.get('/masters/financial-years').then((res) => {
      setFys(res.data);
      const chosen = saved || (res.data.length > 0 ? String(res.data[0].id) : '');
      setSelectedFy(chosen);
    });

    const onFy = (e: any) => setSelectedFy(e.detail);
    window.addEventListener('hydraa_fy_changed', onFy);
    return () => window.removeEventListener('hydraa_fy_changed', onFy);
  }, []);

  const handleExportExcel = () => {
    const url = `${api.defaults.baseURL}/reports/export/excel?financialYearId=${selectedFy}`;
    window.open(url, '_blank');
  };

  const handleExportPdf = () => {
    const url = `${api.defaults.baseURL}/reports/export/pdf?financialYearId=${selectedFy}`;
    window.open(url, '_blank');
  };

  const reportsList = [
    { title: 'HYDRAA Consolidated Financial Statement', desc: 'Combined HMDA and PD Budget, Releases, Actual Expenditure and Balance', hasExcel: true, hasPdf: true },
    { title: 'HMDA Source-wise Financial Ledger', desc: 'Independent HMDA releases and expenditure tracking', hasExcel: true, hasPdf: true },
    { title: 'PD Account Financial Statement', desc: 'Personal Deposit account treasury statement', hasExcel: true, hasPdf: true },
    { title: 'Wing-wise Expenditure Breakdown', desc: 'MTO, Admin, Legal, DTC, IT&C and PS HYDRAA bill settlements', hasExcel: true, hasPdf: true },
    { title: 'Purpose-wise Budget Utilisation Report', desc: 'Demolition, Fencing, Hiring, POL and civil restoration expenditures', hasExcel: true, hasPdf: true },
    { title: 'Vendor Disbursal Register', desc: 'Vendor-wise claims, deductions and bank disbursement details', hasExcel: true, hasPdf: true },
    { title: 'GST & TDS Deduction Statement', desc: 'Statutory tax deductions, CPIN, CRIN challans and remittance audit', hasExcel: true, hasPdf: true },
    { title: 'Unspent Budget Statement', desc: 'Head-wise remaining cash balances available for drawal', hasExcel: true, hasPdf: true },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-semibold text-slate-900 tracking-tight">Official Financial Reports & Exports</h1>
            <p className="text-[12px] text-slate-500 mt-1">
              Generate Formatted Excel (.xlsx) Ledgers and Certified PDF Statements
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[13.5px] font-medium text-slate-600">Select FY:</span>
            <select
              value={selectedFy}
              onChange={(e) => setSelectedFy(e.target.value)}
              className="text-[14px] font-medium p-2 bg-white border border-slate-300 rounded-lg cursor-pointer"
            >
              {fys.map((f) => (
                <option key={f.id} value={f.id}>{f.code}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportsList.map((r, i) => (
            <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 h-full hover:border-slate-300 transition">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-[16px] text-slate-900 break-words leading-snug">{r.title}</h3>
                <p className="text-[13px] text-slate-500 mt-1 break-words leading-relaxed">{r.desc}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                <button
                  onClick={handleExportExcel}
                  title="Export Excel Worksheet"
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-sm transition flex items-center gap-1.5 font-semibold text-xs"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Excel</span>
                </button>
                <button
                  onClick={handleExportPdf}
                  title="Export Official PDF"
                  className="px-3 py-1.5 bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-300 rounded-lg shadow-sm transition flex items-center gap-1.5 font-semibold text-xs"
                >
                  <Download className="w-4 h-4 text-rose-600" />
                  <span>PDF</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

