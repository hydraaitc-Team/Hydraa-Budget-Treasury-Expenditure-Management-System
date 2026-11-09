'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import { FileCheck, FileSpreadsheet, Download, Receipt, Edit2, Search, Calendar, CheckCircle, X } from 'lucide-react';
import api, { formatINR } from '@/lib/api';

export default function GstTdsPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTaxBill, setEditingTaxBill] = useState<any | null>(null);

  // Modal form for CPIN & CRI
  const [taxForm, setTaxForm] = useState({
    gstCpin: '',
    gstChallanDate: '',
    tdsCrn: '',
    tdsChallanDate: '',
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
      const q = fyId ? `&financialYearId=${fyId}` : '';
      const res = await api.get(`/bills?limit=100${q}`);
      // Filter bills that have GST or TDS deductions
      const taxBills = (res.data.bills || []).filter(
        (b: any) => Number(b.totalGst) > 0 || Number(b.tdsAmount) > 0
      );
      setBills(taxBills);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditTax = (bill: any) => {
    setTaxForm({
      gstCpin: bill.gstCpin || '',
      gstChallanDate: bill.gstChallanDate ? new Date(bill.gstChallanDate).toISOString().split('T')[0] : '',
      tdsCrn: bill.tdsCrn || '',
      tdsChallanDate: bill.tdsChallanDate ? new Date(bill.tdsChallanDate).toISOString().split('T')[0] : '',
    });
    setEditingTaxBill(bill);
  };

  const handleSaveTaxReferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTaxBill) return;

    try {
      await api.put(`/bills/${editingTaxBill.id}/tax-references`, {
        gstCpin: taxForm.gstCpin.trim().toUpperCase() || '',
        gstChallanDate: taxForm.gstChallanDate || '',
        tdsCrn: taxForm.tdsCrn.trim().toUpperCase() || '',
        tdsChallanDate: taxForm.tdsChallanDate || '',
      });

      setEditingTaxBill(null);
      alert('Statutory CPIN and CRI Challan references recorded successfully.');
      const savedFy = localStorage.getItem('hydraa_selected_fy');
      loadData(savedFy || undefined);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update tax references');
    }
  };

  const filteredBills = bills.filter((b) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      b.internalBillNo?.toLowerCase().includes(q) ||
      b.invoiceNo?.toLowerCase().includes(q) ||
      b.vendor?.name?.toLowerCase().includes(q) ||
      b.vendor?.gstin?.toLowerCase().includes(q) ||
      b.gstCpin?.toLowerCase().includes(q) ||
      b.tdsCrn?.toLowerCase().includes(q)
    );
  });

  const totalGst = filteredBills.reduce((sum, b) => sum + Number(b.totalGst || 0), 0);
  const totalTds = filteredBills.reduce((sum, b) => sum + Number(b.tdsAmount || 0), 0);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-semibold text-slate-900 tracking-tight">GST & TDS Statutory Deduction Registers</h1>
            <p className="text-[12px] text-slate-500 mt-1">
              Statutory Tax Withholding, GST CPIN Challans, TDS CRI References & Remittance Audit Records
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-full min-h-[120px] hover:border-slate-300 transition">
            <span className="text-[13px] font-semibold text-slate-600 uppercase tracking-wide">Total GST TDS Withheld</span>
            <p className="text-[20px] sm:text-[22px] lg:text-[24px] font-semibold text-slate-900 mt-2 tabular-nums break-words leading-tight">{formatINR(totalGst)}</p>
            <p className="text-[12px] text-slate-500 mt-1.5 break-words">CGST + SGST + IGST components (Remittable via CPIN)</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-full min-h-[120px] hover:border-slate-300 transition">
            <span className="text-[13px] font-semibold text-slate-600 uppercase tracking-wide">Total IT TDS Deductions</span>
            <p className="text-[20px] sm:text-[22px] lg:text-[24px] font-semibold text-blue-900 mt-2 tabular-nums break-words leading-tight">{formatINR(totalTds)}</p>
            <p className="text-[12px] text-slate-500 mt-1.5 break-words">Statutory Income Tax Withholding (Remittable via CRI)</p>
          </div>
        </div>

        {/* In-page Filter Bar */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by CPIN No, CRI No, Bill Ref, Vendor or Invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-[14px] border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 font-normal"
            />
          </div>
          <span className="text-[12px] text-slate-500 font-normal">
            Showing {filteredBills.length} of {bills.length} Tax Records
          </span>
        </div>

        {/* Tax Register Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-[16px] text-slate-800">
              Tax Deduction & Challan Audit Register
            </h3>
            <span className="text-[12px] text-slate-500 font-normal">{filteredBills.length} Invoices</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[13px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Bill / Invoice Ref</th>
                  <th className="py-3 px-3">Vendor & GSTIN</th>
                  <th className="py-3 px-3 text-right">Gross Invoice</th>
                  <th className="py-3 px-3 text-right">Total GST</th>
                  <th className="py-3 px-3">GST CPIN No & Date</th>
                  <th className="py-3 px-3 text-right">IT TDS</th>
                  <th className="py-3 px-3">TDS CRI No & Date</th>
                  <th className="py-3 px-3 text-right">Net Payable</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 text-[13.5px]">
                      {searchQuery ? 'No tax records matching your search.' : 'No tax withholding records present in current financial period.'}
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-800">{b.internalBillNo}</p>
                        <p className="text-[12px] text-slate-400 font-mono">Inv: {b.invoiceNo}</p>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-medium text-slate-700">{b.vendor?.name}</p>
                        <p className="text-[12px] font-mono text-slate-400">{b.vendor?.gstin || 'N/A'}</p>
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-900 tabular-nums">{formatINR(b.grossAmount)}</td>
                      <td className="py-3 px-3 text-right font-semibold text-amber-700 tabular-nums">
                        {formatINR(b.totalGst)}
                        <span className="block text-[11px] text-slate-500 font-normal">
                          CGST: {formatINR(b.cgstAmount)} | SGST: {formatINR(b.sgstAmount)}
                        </span>
                      </td>
                      {/* GST CPIN Column */}
                      <td className="py-3 px-3">
                        {b.gstCpin ? (
                          <div>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-900 font-mono font-medium rounded text-[12px] border border-blue-200 tabular-nums">
                              {b.gstCpin}
                            </span>
                            {b.gstChallanDate && (
                              <p className="text-[12px] text-slate-500 mt-0.5 tabular-nums">
                                {new Date(b.gstChallanDate).toLocaleDateString('en-IN')}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[12px] text-slate-400 italic">Pending CPIN</span>
                        )}
                      </td>
                      {/* IT TDS Column */}
                      <td className="py-3 px-3 text-right font-semibold text-blue-700 tabular-nums">{formatINR(b.tdsAmount)}</td>
                      {/* TDS CRI Column */}
                      <td className="py-3 px-3">
                        {b.tdsCrn ? (
                          <div>
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-900 font-mono font-medium rounded text-[12px] border border-purple-200 tabular-nums">
                              {b.tdsCrn}
                            </span>
                            {b.tdsChallanDate && (
                              <p className="text-[12px] text-slate-500 mt-0.5 tabular-nums">
                                {new Date(b.tdsChallanDate).toLocaleDateString('en-IN')}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[12px] text-slate-400 italic">Pending CRI</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-blue-800 tabular-nums">{formatINR(b.netPayableAmount)}</td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleOpenEditTax(b)}
                          title="Record / Edit CPIN and CRI numbers"
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[12px] font-medium border border-blue-200 transition flex items-center gap-1 mx-auto"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>CPIN/CRI</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Record / Update GST CPIN & TDS CRI */}
        {editingTaxBill && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="font-semibold text-[18px] text-slate-900">Record Statutory Tax References</h3>
                  <p className="text-[12px] text-slate-500 font-mono">
                    Bill: {editingTaxBill.internalBillNo} | Vendor: {editingTaxBill.vendor?.name}
                  </p>
                </div>
                <button onClick={() => setEditingTaxBill(null)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
                  ✕
                </button>
              </div>

              {/* Tax summary banner */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mb-4 grid grid-cols-2 gap-2 text-[13px]">
                <div>
                  <span className="text-slate-500 text-[12px]">Total GST Withheld:</span>
                  <p className="font-semibold text-amber-700 tabular-nums">{formatINR(editingTaxBill.totalGst)}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[12px]">Total IT TDS Deducted:</span>
                  <p className="font-semibold text-blue-800 tabular-nums">{formatINR(editingTaxBill.tdsAmount)}</p>
                </div>
              </div>

              <form onSubmit={handleSaveTaxReferences} className="space-y-4">
                <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200/80 space-y-2">
                  <label className="block text-[13.5px] font-medium text-blue-950">GST CPIN Number</label>
                  <input
                    type="text"
                    placeholder="Enter 14-digit GST CPIN Number"
                    value={taxForm.gstCpin}
                    onChange={(e) => setTaxForm({ ...taxForm, gstCpin: e.target.value.toUpperCase().trim() })}
                    className="w-full text-[14px] p-2 border border-slate-300 rounded-lg font-mono uppercase font-semibold bg-white"
                  />
                  <div>
                    <label className="block text-[12px] text-slate-600 mb-0.5 font-medium">GST Challan Deposit Date</label>
                    <input
                      type="date"
                      value={taxForm.gstChallanDate}
                      onChange={(e) => setTaxForm({ ...taxForm, gstChallanDate: e.target.value })}
                      className="w-full text-[13.5px] p-1.5 border border-slate-200 rounded font-mono bg-white"
                    />
                  </div>
                </div>

                <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-200/80 space-y-2">
                  <label className="block text-[13.5px] font-medium text-purple-950">TDS CRI Number</label>
                  <input
                    type="text"
                    placeholder="Enter Challan Receipt Identification (CRI No)"
                    value={taxForm.tdsCrn}
                    onChange={(e) => setTaxForm({ ...taxForm, tdsCrn: e.target.value.toUpperCase().trim() })}
                    className="w-full text-[14px] p-2 border border-slate-300 rounded-lg font-mono uppercase font-semibold bg-white"
                  />
                  <div>
                    <label className="block text-[12px] text-slate-600 mb-0.5 font-medium">TDS Challan Deposit Date</label>
                    <input
                      type="date"
                      value={taxForm.tdsChallanDate}
                      onChange={(e) => setTaxForm({ ...taxForm, tdsChallanDate: e.target.value })}
                      className="w-full text-[13.5px] p-1.5 border border-slate-200 rounded font-mono bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingTaxBill(null)}
                    className="px-3.5 py-2 text-[14px] text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-[14px] font-semibold shadow transition"
                  >
                    Save CPIN & CRI
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
