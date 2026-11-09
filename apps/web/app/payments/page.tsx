'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import { Plus, CreditCard, CheckCircle2, Receipt, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import api, { formatINR } from '@/lib/api';

export default function PaymentsPage() {
  const [settlements, setSettlements] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [bills, setBills] = useState<any[]>([]);
  const [unpaidBills, setUnpaidBills] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form
  const [formData, setFormData] = useState({
    billId: '',
    grossSettledAmount: '',
    netPaidToVendor: '',
    deductionsSettled: '0',
    tokenNumber: '',
    tokenDate: new Date().toISOString().split('T')[0],
    chequeNumber: '',
    chequeDate: new Date().toISOString().split('T')[0],
    utrNumber: '',
    utrDate: new Date().toISOString().split('T')[0],
    paymentDate: new Date().toISOString().split('T')[0],
    treasuryRemarks: '',
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
      const [settleRes, billsRes] = await Promise.all([
        api.get(`/payments?limit=50${q}`),
        api.get(`/bills?limit=100${q}`),
      ]);

      const allBills = billsRes.data.bills || [];
      setBills(allBills);
      setSettlements(settleRes.data.settlements || []);

      // Filter bills that have a balance due > 0 or are unpaid/partially paid
      const eligible = allBills.filter(
        (b: any) => Number(b.balanceDue) > 0.01 && b.status !== 'FULLY_PAID' && b.status !== 'CANCELLED'
      );
      setUnpaidBills(eligible);

      if (eligible.length > 0) {
        setFormData((prev) => ({
          ...prev,
          billId: String(eligible[0].id),
          grossSettledAmount: String(eligible[0].balanceDue),
          netPaidToVendor: String(eligible[0].netPayableAmount),
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBillSelect = (billId: string) => {
    const b = unpaidBills.find((x) => String(x.id) === billId) || bills.find((x) => String(x.id) === billId);
    if (b) {
      setFormData({
        ...formData,
        billId,
        grossSettledAmount: String(b.balanceDue || b.grossAmount),
        netPaidToVendor: String(b.netPayableAmount || b.grossAmount),
      });
    } else {
      setFormData({ ...formData, billId });
    }
  };

  const handleOpenModal = () => {
    if (unpaidBills.length > 0) {
      handleBillSelect(String(unpaidBills[0].id));
    }
    setShowModal(true);
  };

  const handleRecordSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.billId) {
      alert('Please select a bill to settle.');
      return;
    }
    try {
      await api.post('/payments/settlements', {
        billId: Number(formData.billId),
        grossSettledAmount: Number(formData.grossSettledAmount),
        netPaidToVendor: Number(formData.netPaidToVendor),
        deductionsSettled: Number(formData.deductionsSettled || 0),
        tokenNumber: formData.tokenNumber,
        tokenDate: formData.tokenDate,
        chequeNumber: formData.chequeNumber,
        chequeDate: formData.chequeDate,
        utrNumber: formData.utrNumber,
        utrDate: formData.utrDate,
        paymentDate: formData.paymentDate,
        treasuryRemarks: formData.treasuryRemarks,
      });

      setShowModal(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record Treasury payment');
    }
  };

  const filteredSettlements = settlements.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.settlementReference?.toLowerCase().includes(q) ||
      s.tokenNumber?.toLowerCase().includes(q) ||
      s.chequeNumber?.toLowerCase().includes(q) ||
      s.utrNumber?.toLowerCase().includes(q) ||
      s.bill?.internalBillNo?.toLowerCase().includes(q) ||
      s.bill?.billSubject?.toLowerCase().includes(q) ||
      s.bill?.vendor?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-semibold text-slate-900 tracking-tight">Treasury Settlements & Expenditure Posting</h1>
            <p className="text-[12px] text-slate-500 mt-1">
              Record Bank Settlements (Token, Cheque, UTR) - Directly Deducts From Available Budget
            </p>
          </div>

          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-[14px] font-medium shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>Record Treasury Settlement</span>
          </button>
        </div>

        {/* In-page Settlements Filter Bar */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder="Search by settlement ref, UTR, Token, Cheque, Bill or Vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-[14px] px-3.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 font-normal"
            />
          </div>

          <span className="text-[12px] text-slate-500 font-normal">
            Showing {filteredSettlements.length} of {settlements.length} Settlements
          </span>
        </div>

        {/* Notice if no unpaid bills */}
        {unpaidBills.length === 0 && !loading && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-[13px] text-amber-800">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              All recorded bills are currently settled. To execute a new Treasury payment, enter a bill first in <strong>Bills & Vouchers</strong>.
            </span>
          </div>
        )}

        {/* Settlement Register Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-[16px] text-slate-800">
              Completed Bank Settlements (Posted Expenditure)
            </h3>
            <span className="text-[12px] text-slate-500 font-normal">{filteredSettlements.length} Settlements</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[13px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Settlement Ref</th>
                  <th className="py-3 px-3">Bill Ref / Subject</th>
                  <th className="py-3 px-3">Vendor</th>
                  <th className="py-3 px-3">UTR / Token</th>
                  <th className="py-3 px-3">Payment Date</th>
                  <th className="py-3 px-3 text-right">Settled Gross</th>
                  <th className="py-3 px-3 text-right">Net Paid</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSettlements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-[13.5px]">
                      {searchQuery
                        ? `No settlements matching "${searchQuery}"`
                        : 'No payments processed yet. Click "Record Treasury Settlement" to disburse bills.'}
                    </td>
                  </tr>
                ) : (
                  filteredSettlements.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-3 font-mono font-semibold text-slate-900 text-[13px]">{s.settlementReference}</td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-800">{s.bill?.internalBillNo}</p>
                        <p className="text-[12px] text-slate-500 truncate max-w-xs">{s.bill?.billSubject}</p>
                      </td>
                      <td className="py-3 px-3 font-normal text-slate-700">{s.bill?.vendor?.name}</td>
                      <td className="py-3 px-3">
                        <p className="font-mono font-medium text-slate-800 text-[12px]">UTR: {s.utrNumber || 'N/A'}</p>
                        <p className="text-[12px] text-slate-400 font-mono">Token: {s.tokenNumber || 'N/A'}</p>
                      </td>
                      <td className="py-3 px-3 text-slate-600 tabular-nums">{new Date(s.paymentDate).toLocaleDateString()}</td>
                      <td className="py-3 px-3 text-right font-semibold text-amber-700 tabular-nums">{formatINR(s.grossSettledAmount)}</td>
                      <td className="py-3 px-3 text-right font-semibold text-blue-700 tabular-nums">{formatINR(s.netPaidToVendor)}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-0.5 rounded text-[12px] font-medium bg-blue-100 text-blue-800">
                          POSTED TO BUDGET
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Record Treasury Settlement */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="font-semibold text-[18px] text-slate-900">Record Treasury Settlement & Post Expenditure</h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
                  ✕
                </button>
              </div>

              {unpaidBills.length === 0 ? (
                <div className="py-6 text-center">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">No Pending or Unpaid Bills Available</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Every entered bill is already settled. Please create a new bill voucher first in the Bills module before recording a settlement.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="mt-4 px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRecordSettlement} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Select Bill to Settle</label>
                    <select
                      value={formData.billId}
                      onChange={(e) => handleBillSelect(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg font-medium"
                    >
                      {unpaidBills.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.internalBillNo} - {b.vendor?.name} (Balance Due: ₹{Number(b.balanceDue).toLocaleString('en-IN')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Gross Settled Amount (₹)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        step="0.01"
                        value={formData.grossSettledAmount}
                        onChange={(e) => setFormData({ ...formData, grossSettledAmount: e.target.value })}
                        className="w-full text-xs p-2 border border-slate-300 rounded-lg font-bold"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">Amount that reduces available budget</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Net Paid to Vendor (₹)</label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        value={formData.netPaidToVendor}
                        onChange={(e) => setFormData({ ...formData, netPaidToVendor: e.target.value })}
                        className="w-full text-xs p-2 border border-slate-300 rounded-lg font-bold text-blue-800"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">Disbursed to vendor bank account</p>
                    </div>
                  </div>

                  {/* Treasury References */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <h4 className="text-[11px] font-bold text-slate-700 uppercase">Treasury / Bank References</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-0.5">UTR / Reference Number</label>
                        <input
                          type="text"
                          placeholder="e.g. UTR-SBIN-88912"
                          value={formData.utrNumber}
                          onChange={(e) => setFormData({ ...formData, utrNumber: e.target.value })}
                          className="w-full text-xs p-1.5 border border-slate-300 rounded-lg font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-0.5">Token Number</label>
                        <input
                          type="text"
                          placeholder="e.g. TOK-4491"
                          value={formData.tokenNumber}
                          onChange={(e) => setFormData({ ...formData, tokenNumber: e.target.value })}
                          className="w-full text-xs p-1.5 border border-slate-300 rounded-lg font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-0.5">Cheque Number (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. CHQ-10029"
                          value={formData.chequeNumber}
                          onChange={(e) => setFormData({ ...formData, chequeNumber: e.target.value })}
                          className="w-full text-xs p-1.5 border border-slate-300 rounded-lg font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-0.5">Settlement / Payment Date</label>
                        <input
                          type="date"
                          required
                          value={formData.paymentDate}
                          onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                          className="w-full text-xs p-1.5 border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Treasury Remarks</label>
                    <input
                      type="text"
                      placeholder="Enter treasury remarks or bank reference..."
                      value={formData.treasuryRemarks}
                      onChange={(e) => setFormData({ ...formData, treasuryRemarks: e.target.value })}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow"
                    >
                      Post Treasury Settlement
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
