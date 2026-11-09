'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import { Plus, Wallet, FileText, ArrowRight, CheckCircle } from 'lucide-react';
import api, { formatINR } from '@/lib/api';

export default function BudgetsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [fundingSources, setFundingSources] = useState<any[]>([]);
  const [budgetHeads, setBudgetHeads] = useState<any[]>([]);
  const [financialYears, setFinancialYears] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    financialYearId: '',
    fundingSourceId: '',
    budgetHeadId: '',
    txType: 'BUDGET_RELEASE',
    amount: '',
    txDate: new Date().toISOString().split('T')[0],
    orderType: 'GO',
    orderNumber: '',
    orderDate: new Date().toISOString().split('T')[0],
    quarter: 'Q1',
    remarks: '',
  });

  useEffect(() => {
    const savedFy = localStorage.getItem('hydraa_selected_fy');
    loadData(savedFy || undefined);

    const onFyChange = (e: any) => {
      loadData(e.detail);
    };
    window.addEventListener('hydraa_fy_changed', onFyChange);
    return () => window.removeEventListener('hydraa_fy_changed', onFyChange);
  }, []);

  const loadData = async (fyId?: string) => {
    try {
      setLoading(true);
      const q = fyId ? `?financialYearId=${fyId}` : '';
      const [sumRes, txRes, fsRes, bhRes, fyRes] = await Promise.all([
        api.get(`/budgets/summary${q}`),
        api.get(`/budgets/transactions?limit=50${fyId ? `&financialYearId=${fyId}` : ''}`),
        api.get('/masters/funding-sources'),
        api.get('/masters/budget-heads'),
        api.get('/masters/financial-years'),
      ]);

      setSummary(sumRes.data);
      setTransactions(txRes.data.transactions || []);
      setFundingSources(fsRes.data);
      setBudgetHeads(bhRes.data);
      setFinancialYears(fyRes.data);

      const activeFyId = fyId || (fyRes.data.length > 0 ? String(fyRes.data[0].id) : '');
      if (activeFyId && fsRes.data.length > 0 && bhRes.data.length > 0) {
        setFormData((prev) => ({
          ...prev,
          financialYearId: activeFyId,
          fundingSourceId: String(fsRes.data[0].id),
          budgetHeadId: String(bhRes.data[0].id),
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordTx = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/budgets/transactions', {
        financialYearId: Number(formData.financialYearId),
        fundingSourceId: Number(formData.fundingSourceId),
        budgetHeadId: formData.budgetHeadId ? Number(formData.budgetHeadId) : undefined,
        txType: formData.txType,
        amount: Number(formData.amount),
        txDate: formData.txDate,
        orderType: formData.orderType,
        orderNumber: formData.orderNumber,
        orderDate: formData.orderDate,
        quarter: formData.quarter,
        remarks: formData.remarks,
      });

      setShowModal(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record budget transaction');
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-semibold text-slate-900 tracking-tight">Budget & Sanction Order Management</h1>
            <p className="text-[12px] text-slate-500 mt-1">
              Record GO/BRO Releases, Additional Allotments & Track Immutable Account Ledgers
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-[14px] font-medium shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>Record Budget Release / Order</span>
          </button>
        </div>

        {/* Budget Accounts Matrix */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-[16px] text-slate-800">
              Active Budget Accounts by Head & Source
            </h3>
            <span className="text-[12px] text-slate-500 font-normal">
              Total Released: <strong className="text-blue-700 font-semibold tabular-nums">{formatINR(summary?.totals?.released)}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[13px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Budget Head</th>
                  <th className="py-3 px-3">Funding Source</th>
                  <th className="py-3 px-3 text-right">Initial Allotted</th>
                  <th className="py-3 px-3 text-right">Total Released</th>
                  <th className="py-3 px-3 text-right">Additional</th>
                  <th className="py-3 px-3 text-right">Actual Expenditure</th>
                  <th className="py-3 px-3 text-right">Unspent Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary?.accounts?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400 text-[13.5px]">
                      No budget accounts initialized. Record a release to open ledger accounts.
                    </td>
                  </tr>
                ) : (
                  summary?.accounts?.map((acc: any) => (
                    <tr key={acc.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-3 font-medium text-slate-800">{acc.budgetHead}</td>
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-0.5 rounded text-[12px] font-medium bg-slate-100 text-slate-700">
                          {acc.fundingSource}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600 tabular-nums">{formatINR(acc.allotted)}</td>
                      <td className="py-3 px-3 text-right font-semibold text-blue-800 tabular-nums">{formatINR(acc.released)}</td>
                      <td className="py-3 px-3 text-right text-blue-600 tabular-nums">{formatINR(acc.additional)}</td>
                      <td className="py-3 px-3 text-right text-amber-700 font-medium tabular-nums">{formatINR(acc.expenditure)}</td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-900 tabular-nums">{formatINR(acc.unspent)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Transactions Register */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-[16px] text-slate-800">
              Audit Trail of Budget Orders & Transactions
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[13px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Tx Number</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Head & Source</th>
                  <th className="py-3 px-3">Order (GO/BRO)</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Officer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t: any) => (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-3 font-mono font-medium text-slate-800 text-[13px]">{t.transactionNumber}</td>
                    <td className="py-3 px-3">
                      <span className="px-2.5 py-0.5 rounded text-[12px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        {t.txType}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700">
                      {t.budgetHead?.name} ({t.fundingSource?.code})
                    </td>
                    <td className="py-3 px-3">
                      {t.governmentOrder ? (
                        <span className="font-medium text-slate-800">
                          {t.governmentOrder.orderType}: {t.governmentOrder.orderNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400">Direct Entry</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-blue-700 tabular-nums">{formatINR(t.amount)}</td>
                    <td className="py-3 px-3 text-slate-500 tabular-nums">{new Date(t.txDate).toLocaleDateString()}</td>
                    <td className="py-3 px-3 text-slate-600 font-normal">{t.createdBy || 'Treasury Staff'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Record Budget Transaction */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="font-semibold text-[18px] text-slate-900">Record Budget Sanction / Release</h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
                  ✕
                </button>
              </div>

              <form onSubmit={handleRecordTx} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Financial Year</label>
                    <select
                      value={formData.financialYearId}
                      onChange={(e) => setFormData({ ...formData, financialYearId: e.target.value })}
                      className="w-full text-[14px] p-2 border border-slate-300 rounded-lg"
                    >
                      {financialYears.map((fy) => (
                        <option key={fy.id} value={fy.id}>{fy.code}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Funding Source</label>
                    <select
                      value={formData.fundingSourceId}
                      onChange={(e) => setFormData({ ...formData, fundingSourceId: e.target.value })}
                      className="w-full text-[14px] p-2 border border-slate-300 rounded-lg"
                    >
                      {fundingSources.map((fs) => (
                        <option key={fs.id} value={fs.id}>{fs.code} - {fs.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Transaction Type</label>
                  <select
                    value={formData.txType}
                    onChange={(e) => setFormData({ ...formData, txType: e.target.value })}
                    className="w-full text-[14px] p-2 border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="BUDGET_RELEASE">BUDGET RELEASE (Initial Sanction)</option>
                    <option value="ADDITIONAL_RELEASE">ADDITIONAL RELEASE (Emergency/Top-up)</option>
                    <option value="INITIAL_ALLOTMENT">INITIAL ALLOTMENT</option>
                    <option value="REVISED_ESTIMATE">REVISED ESTIMATE</option>
                    <option value="OPENING_BALANCE">OPENING BALANCE</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Sanctioned Amount (₹)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="e.g. 50000000"
                      className="w-full text-[14px] p-2 border border-slate-300 rounded-lg font-semibold tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Order Date</label>
                    <input
                      type="date"
                      required
                      value={formData.txDate}
                      onChange={(e) => setFormData({ ...formData, txDate: e.target.value })}
                      className="w-full text-[14px] p-2 border border-slate-300 rounded-lg font-normal"
                    />
                  </div>
                </div>

                {/* GO/BRO Information */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <h4 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide">Government Order (GO / BRO) Details</h4>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[12px] text-slate-600 mb-0.5 font-medium">Order Type</label>
                      <select
                        value={formData.orderType}
                        onChange={(e) => setFormData({ ...formData, orderType: e.target.value })}
                        className="w-full text-[13.5px] p-2 border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="GO">Government Order (GO)</option>
                        <option value="BRO">Budget Release Order (BRO)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[12px] text-slate-600 mb-0.5 font-medium">Order Number</label>
                      <input
                        type="text"
                        placeholder="e.g. GO-MS-101"
                        value={formData.orderNumber}
                        onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                        className="w-full text-[13.5px] p-2 border border-slate-300 rounded-lg font-mono font-medium bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] text-slate-600 mb-0.5 font-medium">Quarter</label>
                      <select
                        value={formData.quarter}
                        onChange={(e) => setFormData({ ...formData, quarter: e.target.value })}
                        className="w-full text-[13.5px] p-2 border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="Q1">Quarter 1</option>
                        <option value="Q2">Quarter 2</option>
                        <option value="Q3">Quarter 3</option>
                        <option value="Q4">Quarter 4</option>
                        <option value="FULL_YEAR">Full Financial Year</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Remarks / Sanction Purpose</label>
                  <textarea
                    rows={2}
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="Enter sanction purpose, official reference or approval remarks..."
                    className="w-full text-[14px] p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-3.5 py-2 text-[14px] text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-[14px] font-semibold rounded-lg shadow transition"
                  >
                    Post Budget Transaction
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

