'use client';

import React, { useState, useEffect, useRef } from 'react';
import AppShell from '@/components/layout/AppShell';
import {
  Plus,
  Receipt,
  CheckCircle,
  Clock,
  FileText,
  Trash2,
  Building,
  Upload,
  Download,
  Paperclip,
  Eye,
  FileCheck2,
  X,
  ExternalLink,
  Edit2,
  Percent,
  Search,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import api, { formatINR } from '@/lib/api';

export default function BillsPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [wings, setWings] = useState<any[]>([]);
  const [fundingSources, setFundingSources] = useState<any[]>([]);
  const [budgetHeads, setBudgetHeads] = useState<any[]>([]);
  const [financialYears, setFinancialYears] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingBill, setEditingBill] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Document upload modal states
  const [selectedBillForDocs, setSelectedBillForDocs] = useState<any>(null);
  const [billDocs, setBillDocs] = useState<any[]>([]);
  const [uploadCategory, setUploadCategory] = useState('INVOICE');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Document preview state
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // In-page table filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [wingFilter, setWingFilter] = useState('ALL');

  // Initial document attachment state during bill creation
  const [initialBillFile, setInitialBillFile] = useState<File | null>(null);
  const [initialDocCategory, setInitialDocCategory] = useState('INVOICE');
  const initialFileInputRef = useRef<HTMLInputElement>(null);

  // Form State (with percentage rates)
  const [formData, setFormData] = useState({
    financialYearId: '',
    wingId: '',
    vendorId: '',
    billSubject: '',
    billDescription: '',
    invoiceNo: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    grossAmount: '',
    cgstRate: '0',
    sgstRate: '0',
    tdsRate: '0',
    otherRate: '0',
    cgstAmount: '0',
    sgstAmount: '0',
    igstAmount: '0',
    tdsAmount: '0',
    otherDeductions: '0',
    gstCpin: '',
    gstChallanDate: '',
    tdsCrn: '', // CRI Number
    tdsChallanDate: '',
    remarks: '',
    allocations: [
      { fundingSourceId: '', budgetHeadId: '', allocatedAmount: '' }
    ]
  });

  // Edit Form State
  const [editFormData, setEditFormData] = useState<any | null>(null);

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
      const [billsRes, vRes, wRes, fsRes, bhRes, fyRes] = await Promise.all([
        api.get(`/bills?limit=100${q}`),
        api.get('/vendors'),
        api.get('/masters/wings'),
        api.get('/masters/funding-sources'),
        api.get('/masters/budget-heads'),
        api.get('/masters/financial-years'),
      ]);

      setBills(billsRes.data.bills || []);
      setVendors(vRes.data);
      setWings(wRes.data);
      setFundingSources(fsRes.data);
      setBudgetHeads(bhRes.data);
      setFinancialYears(fyRes.data);

      const currentFy = fyRes.data.find((f: any) => f.isCurrent);
      const activeFyId = fyId || (currentFy ? String(currentFy.id) : (fyRes.data.length > 0 ? String(fyRes.data[0].id) : ''));
      
      if (activeFyId && wRes.data.length > 0 && vRes.data.length > 0 && fsRes.data.length > 0 && bhRes.data.length > 0) {
        setFormData((prev) => ({
          ...prev,
          financialYearId: activeFyId,
          wingId: prev.wingId || String(wRes.data[0].id),
          vendorId: prev.vendorId || String(vRes.data[0].id),
          allocations: prev.allocations[0]?.allocatedAmount ? prev.allocations : [
            { fundingSourceId: String(fsRes.data[0].id), budgetHeadId: String(bhRes.data[0].id), allocatedAmount: '' }
          ]
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to recalculate taxes when rate or gross changes
  const calcTaxAmount = (gross: number, ratePct: number) => {
    if (isNaN(gross) || gross <= 0 || isNaN(ratePct) || ratePct <= 0) return '0';
    return ((gross * ratePct) / 100).toFixed(2);
  };

  const handleGrossChange = (val: string, isEdit = false) => {
    const gross = parseFloat(val) || 0;
    if (isEdit && editFormData) {
      const cgstAmt = calcTaxAmount(gross, parseFloat(editFormData.cgstRate) || 0);
      const sgstAmt = calcTaxAmount(gross, parseFloat(editFormData.sgstRate) || 0);
      const tdsAmt = calcTaxAmount(gross, parseFloat(editFormData.tdsRate) || 0);
      const otherAmt = calcTaxAmount(gross, parseFloat(editFormData.otherRate) || 0);
      setEditFormData({
        ...editFormData,
        grossAmount: val,
        cgstAmount: cgstAmt,
        sgstAmount: sgstAmt,
        tdsAmount: tdsAmt,
        otherDeductions: otherAmt,
      });
    } else {
      const cgstAmt = calcTaxAmount(gross, parseFloat(formData.cgstRate) || 0);
      const sgstAmt = calcTaxAmount(gross, parseFloat(formData.sgstRate) || 0);
      const tdsAmt = calcTaxAmount(gross, parseFloat(formData.tdsRate) || 0);
      const otherAmt = calcTaxAmount(gross, parseFloat(formData.otherRate) || 0);
      setFormData({
        ...formData,
        grossAmount: val,
        cgstAmount: cgstAmt,
        sgstAmount: sgstAmt,
        tdsAmount: tdsAmt,
        otherDeductions: otherAmt,
      });
    }
  };

  const handleRateChange = (field: 'cgst' | 'sgst' | 'tds' | 'other', rateVal: string, isEdit = false) => {
    const rate = parseFloat(rateVal) || 0;
    if (isEdit && editFormData) {
      const gross = parseFloat(editFormData.grossAmount) || 0;
      const amt = calcTaxAmount(gross, rate);
      if (field === 'cgst') setEditFormData({ ...editFormData, cgstRate: rateVal, cgstAmount: amt });
      if (field === 'sgst') setEditFormData({ ...editFormData, sgstRate: rateVal, sgstAmount: amt });
      if (field === 'tds') setEditFormData({ ...editFormData, tdsRate: rateVal, tdsAmount: amt });
      if (field === 'other') setEditFormData({ ...editFormData, otherRate: rateVal, otherDeductions: amt });
    } else {
      const gross = parseFloat(formData.grossAmount) || 0;
      const amt = calcTaxAmount(gross, rate);
      if (field === 'cgst') setFormData({ ...formData, cgstRate: rateVal, cgstAmount: amt });
      if (field === 'sgst') setFormData({ ...formData, sgstRate: rateVal, sgstAmount: amt });
      if (field === 'tds') setFormData({ ...formData, tdsRate: rateVal, tdsAmount: amt });
      if (field === 'other') setFormData({ ...formData, otherRate: rateVal, otherDeductions: amt });
    }
  };

  const applyTaxPreset = (cgst: number, sgst: number, tds: number, other: number, isEdit = false) => {
    if (isEdit && editFormData) {
      const gross = parseFloat(editFormData.grossAmount) || 0;
      setEditFormData({
        ...editFormData,
        cgstRate: String(cgst),
        sgstRate: String(sgst),
        tdsRate: String(tds),
        otherRate: String(other),
        cgstAmount: calcTaxAmount(gross, cgst),
        sgstAmount: calcTaxAmount(gross, sgst),
        tdsAmount: calcTaxAmount(gross, tds),
        otherDeductions: calcTaxAmount(gross, other),
      });
    } else {
      const gross = parseFloat(formData.grossAmount) || 0;
      setFormData({
        ...formData,
        cgstRate: String(cgst),
        sgstRate: String(sgst),
        tdsRate: String(tds),
        otherRate: String(other),
        cgstAmount: calcTaxAmount(gross, cgst),
        sgstAmount: calcTaxAmount(gross, sgst),
        tdsAmount: calcTaxAmount(gross, tds),
        otherDeductions: calcTaxAmount(gross, other),
      });
    }
  };

  const handleAddAllocation = (isEdit = false) => {
    const target = isEdit ? editFormData : formData;
    const setTarget = isEdit ? setEditFormData : setFormData;
    setTarget({
      ...target,
      allocations: [
        ...target.allocations,
        {
          fundingSourceId: fundingSources[0]?.id ? String(fundingSources[0].id) : '',
          budgetHeadId: budgetHeads[0]?.id ? String(budgetHeads[0].id) : '',
          allocatedAmount: ''
        }
      ]
    });
  };

  const handleRemoveAllocation = (index: number, isEdit = false) => {
    const target = isEdit ? editFormData : formData;
    const setTarget = isEdit ? setEditFormData : setFormData;
    const updated = target.allocations.filter((_: any, i: number) => i !== index);
    setTarget({ ...target, allocations: updated });
  };

  const handleAllocationChange = (index: number, field: string, value: string, isEdit = false) => {
    const target = isEdit ? editFormData : formData;
    const setTarget = isEdit ? setEditFormData : setFormData;
    const updated = [...target.allocations];
    updated[index] = { ...updated[index], [field]: value };
    setTarget({ ...target, allocations: updated });
  };

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();

    const gross = Number(formData.grossAmount);
    const sumAllocated = formData.allocations.reduce((sum, a) => sum + Number(a.allocatedAmount || 0), 0);

    if (Math.abs(gross - sumAllocated) > 0.01) {
      alert(`Validation Error: The sum of Budget Head Allocations (₹${formatINR(sumAllocated)}) must match the Gross Bill Amount (₹${formatINR(gross)}).`);
      return;
    }

    try {
      const res = await api.post('/bills', {
        financialYearId: Number(formData.financialYearId),
        wingId: Number(formData.wingId),
        vendorId: Number(formData.vendorId),
        billSubject: formData.billSubject,
        billDescription: formData.billDescription,
        invoiceNo: formData.invoiceNo,
        invoiceDate: formData.invoiceDate,
        grossAmount: Number(formData.grossAmount),
        cgstAmount: Number(formData.cgstAmount || 0),
        sgstAmount: Number(formData.sgstAmount || 0),
        igstAmount: 0,
        gstCpin: formData.gstCpin.trim().toUpperCase() || undefined,
        gstChallanDate: formData.gstChallanDate || undefined,
        tdsAmount: Number(formData.tdsAmount || 0),
        tdsCrn: formData.tdsCrn.trim().toUpperCase() || undefined,
        tdsChallanDate: formData.tdsChallanDate || undefined,
        otherDeductions: Number(formData.otherDeductions || 0),
        remarks: formData.remarks,
        allocations: formData.allocations.map((a) => ({
          fundingSourceId: Number(a.fundingSourceId),
          budgetHeadId: Number(a.budgetHeadId),
          allocatedAmount: Number(a.allocatedAmount)
        }))
      });

      const createdBill = res.data.bill || res.data;

      // If document was attached during bill creation, upload it immediately
      if (initialBillFile && createdBill?.id) {
        try {
          const docForm = new FormData();
          docForm.append('file', initialBillFile);
          docForm.append('category', initialDocCategory);
          docForm.append('billId', String(createdBill.id));
          await api.post('/documents/upload', docForm);
        } catch (uploadErr) {
          console.error('Initial document upload error:', uploadErr);
        }
      }

      setShowModal(false);
      setInitialBillFile(null);
      if (initialFileInputRef.current) initialFileInputRef.current.value = '';

      alert(`Bill ${createdBill.internalBillNo || 'voucher'} recorded successfully.`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create bill');
    }
  };

  const handleOpenEdit = (bill: any) => {
    const gross = Number(bill.grossAmount) || 0;
    const cgst = Number(bill.cgstAmount) || 0;
    const sgst = Number(bill.sgstAmount) || 0;
    const tds = Number(bill.tdsAmount) || 0;
    const other = Number(bill.otherDeductions) || 0;

    const cgstRate = gross > 0 ? ((cgst / gross) * 100).toFixed(2) : '0';
    const sgstRate = gross > 0 ? ((sgst / gross) * 100).toFixed(2) : '0';
    const tdsRate = gross > 0 ? ((tds / gross) * 100).toFixed(2) : '0';
    const otherRate = gross > 0 ? ((other / gross) * 100).toFixed(2) : '0';

    setEditFormData({
      id: bill.id,
      internalBillNo: bill.internalBillNo,
      financialYearId: String(bill.financialYearId),
      wingId: String(bill.wingId),
      vendorId: String(bill.vendorId),
      billSubject: bill.billSubject || '',
      billDescription: bill.billDescription || '',
      invoiceNo: bill.invoiceNo || '',
      invoiceDate: bill.invoiceDate ? new Date(bill.invoiceDate).toISOString().split('T')[0] : '',
      grossAmount: String(bill.grossAmount || ''),
      cgstRate,
      sgstRate,
      tdsRate,
      otherRate,
      cgstAmount: String(cgst),
      sgstAmount: String(sgst),
      tdsAmount: String(tds),
      otherDeductions: String(other),
      gstCpin: bill.gstCpin || '',
      gstChallanDate: bill.gstChallanDate ? new Date(bill.gstChallanDate).toISOString().split('T')[0] : '',
      tdsCrn: bill.tdsCrn || '',
      tdsChallanDate: bill.tdsChallanDate ? new Date(bill.tdsChallanDate).toISOString().split('T')[0] : '',
      remarks: bill.remarks || '',
      allocations: (bill.allocations || []).map((a: any) => ({
        fundingSourceId: String(a.fundingSourceId),
        budgetHeadId: String(a.budgetHeadId),
        allocatedAmount: String(a.allocatedAmount)
      }))
    });
    setEditingBill(bill);
  };

  const handleUpdateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData) return;

    const gross = Number(editFormData.grossAmount);
    const sumAllocated = editFormData.allocations.reduce((sum: number, a: any) => sum + Number(a.allocatedAmount || 0), 0);

    if (Math.abs(gross - sumAllocated) > 0.01) {
      alert(`Validation Error: The sum of Budget Head Allocations (₹${formatINR(sumAllocated)}) must match the Gross Bill Amount (₹${formatINR(gross)}).`);
      return;
    }

    try {
      await api.put(`/bills/${editFormData.id}`, {
        wingId: Number(editFormData.wingId),
        vendorId: Number(editFormData.vendorId),
        billSubject: editFormData.billSubject,
        billDescription: editFormData.billDescription,
        invoiceNo: editFormData.invoiceNo,
        invoiceDate: editFormData.invoiceDate,
        grossAmount: Number(editFormData.grossAmount),
        cgstAmount: Number(editFormData.cgstAmount || 0),
        sgstAmount: Number(editFormData.sgstAmount || 0),
        igstAmount: 0,
        gstCpin: editFormData.gstCpin.trim().toUpperCase() || undefined,
        gstChallanDate: editFormData.gstChallanDate || undefined,
        tdsAmount: Number(editFormData.tdsAmount || 0),
        tdsCrn: editFormData.tdsCrn.trim().toUpperCase() || undefined,
        tdsChallanDate: editFormData.tdsChallanDate || undefined,
        otherDeductions: Number(editFormData.otherDeductions || 0),
        remarks: editFormData.remarks,
        allocations: editFormData.allocations.map((a: any) => ({
          fundingSourceId: Number(a.fundingSourceId),
          budgetHeadId: Number(a.budgetHeadId),
          allocatedAmount: Number(a.allocatedAmount)
        }))
      });

      setEditingBill(null);
      setEditFormData(null);
      alert('Bill voucher updated successfully.');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update bill');
    }
  };

  const handleDeleteBill = async (id: number, billNo: string) => {
    if (!confirm(`Are you sure you want to delete Bill voucher "${billNo}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/bills/${id}`);
      alert(`Bill ${billNo} deleted successfully.`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete bill');
    }
  };

  const verifyBill = async (id: number) => {
    try {
      await api.post(`/bills/${id}/verify`);
      alert('Bill marked as verified by Officer.');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to verify bill');
    }
  };

  // Document Management Modal Handlers
  const openDocsModal = async (bill: any) => {
    setSelectedBillForDocs(bill);
    setPreviewDoc(null);
    try {
      const res = await api.get(`/documents/record/BILL/${bill.id}`);
      setBillDocs(res.data);
    } catch (err) {
      console.error(err);
      setBillDocs([]);
    }
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileInputRef.current?.files?.[0] || !selectedBillForDocs) return;

    const file = fileInputRef.current.files[0];
    const form = new FormData();
    form.append('file', file);
    form.append('category', uploadCategory);
    form.append('billId', String(selectedBillForDocs.id));

    try {
      setUploading(true);
      await api.post('/documents/upload', form);
      if (fileInputRef.current) fileInputRef.current.value = '';
      const res = await api.get(`/documents/record/BILL/${selectedBillForDocs.id}`);
      setBillDocs(res.data);
      alert('Supporting document uploaded and verified.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handlePreviewDoc = async (doc: any) => {
    setPreviewLoading(true);
    try {
      const res = await api.get(`/documents/view/${doc.documentUid}`, { responseType: 'blob' });
      const fileUrl = URL.createObjectURL(res.data);
      setPreviewDoc({
        ...doc,
        blobUrl: fileUrl,
        isPdf: doc.mimeType === 'application/pdf',
        isImage: doc.mimeType?.startsWith('image/'),
      });
    } catch (err: any) {
      alert('Failed to preview document.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const filteredBills = bills.filter((b) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      b.internalBillNo?.toLowerCase().includes(q) ||
      b.invoiceNo?.toLowerCase().includes(q) ||
      b.vendor?.name?.toLowerCase().includes(q) ||
      b.billSubject?.toLowerCase().includes(q) ||
      b.gstCpin?.toLowerCase().includes(q) ||
      b.tdsCrn?.toLowerCase().includes(q)
    );

    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    const matchesWing = wingFilter === 'ALL' || String(b.wingId) === wingFilter;

    return matchesSearch && matchesStatus && matchesWing;
  });

  // Render Status Badge with Professional Treasury Terminology
  const renderStatusBadge = (status: string) => {
    if (status === 'FULLY_PAID') {
      return (
        <span className="px-2.5 py-1 rounded text-[12px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center gap-1 shadow-sm">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          Treasury Settled
        </span>
      );
    }
    if (status === 'PARTIALLY_PAID') {
      return (
        <span className="px-2.5 py-0.5 rounded text-[12px] font-medium bg-blue-100 text-blue-800 border border-blue-300">
          Partially Settled
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded text-[12px] font-medium bg-amber-100 text-amber-800 border border-amber-300">
        Pending Settlement
      </span>
    );
  };

  // Net payable calculation helper
  const calcNetPayable = (gross: string, cgst: string, sgst: string, tds: string, other: string) => {
    const g = parseFloat(gross) || 0;
    const c = parseFloat(cgst) || 0;
    const s = parseFloat(sgst) || 0;
    const t = parseFloat(tds) || 0;
    const o = parseFloat(other) || 0;
    return Math.max(0, g - (c + s + t + o));
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-semibold text-slate-900 tracking-tight">Bills & Expenditure Claims</h1>
            <p className="text-[12px] text-slate-500 mt-1">
              Record Multi-Head Invoices, GST/TDS Breakdown Percentages, Challan CPIN/CRI References & Supporting Files
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-[14px] font-medium shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>Enter New Bill / Claim</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by Bill Ref, Invoice, Vendor, CPIN, or CRI No..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-[14px] border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 font-normal"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-[13.5px] p-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="UNPAID">Pending Settlement</option>
              <option value="PARTIALLY_PAID">Partially Settled</option>
              <option value="FULLY_PAID">Treasury Settled (Fully Paid)</option>
            </select>

            <select
              value={wingFilter}
              onChange={(e) => setWingFilter(e.target.value)}
              className="text-[13.5px] p-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 font-medium"
            >
              <option value="ALL">All Wings</option>
              {wings.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <span className="text-[12px] text-slate-500 font-normal">
            Showing {filteredBills.length} of {bills.length} Bills
          </span>
        </div>

        {/* Bill Register Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-[16px] text-slate-800">Official Bill Register</h3>
            <span className="text-[12px] text-slate-500 font-normal">{filteredBills.length} Records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[13px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Bill Ref / Subject</th>
                  <th className="py-3 px-3">Invoice & Tax Refs</th>
                  <th className="py-3 px-3">Vendor</th>
                  <th className="py-3 px-3">Originating Wing</th>
                  <th className="py-3 px-3 text-right">Gross Bill</th>
                  <th className="py-3 px-3 text-right">Deductions</th>
                  <th className="py-3 px-3 text-right">Net Payable</th>
                  <th className="py-3 px-3 text-right">Paid</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Files</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400 text-[13.5px]">
                      {searchQuery || statusFilter !== 'ALL' || wingFilter !== 'ALL'
                        ? 'No bills matching your selected filters.'
                        : 'No bills entered yet for this financial year. Click "Enter New Bill" to begin.'}
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-3">
                        <p className="font-semibold font-mono text-[13.5px] text-slate-900">{b.internalBillNo}</p>
                        <p className="text-[12px] text-slate-500 truncate max-w-xs">{b.billSubject}</p>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-medium text-[13.5px] text-slate-800">{b.invoiceNo}</p>
                        <p className="text-[12px] text-slate-400 tabular-nums">{new Date(b.invoiceDate).toLocaleDateString('en-IN')}</p>
                        {/* GST CPIN & TDS CRI badges */}
                        {(b.gstCpin || b.tdsCrn) && (
                          <div className="flex flex-wrap gap-1 mt-1 text-[11px] font-mono tabular-nums">
                            {b.gstCpin && (
                              <span className="px-1.5 py-0.2 bg-blue-50 text-blue-800 rounded border border-blue-200" title="GST CPIN Number">
                                CPIN: {b.gstCpin}
                              </span>
                            )}
                            {b.tdsCrn && (
                              <span className="px-1.5 py-0.2 bg-purple-50 text-purple-800 rounded border border-purple-200" title="TDS CRI Number">
                                CRI: {b.tdsCrn}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-medium text-[13.5px] text-slate-800">{b.vendor?.name}</p>
                        <p className="text-[12px] text-slate-400 font-mono">GST: {b.vendor?.gstin || 'N/A'}</p>
                      </td>
                      <td className="py-3 px-3 font-medium text-blue-800">{b.wing?.name}</td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-900 tabular-nums">{formatINR(b.grossAmount)}</td>
                      <td className="py-3 px-3 text-right text-amber-700 tabular-nums">{formatINR(b.totalDeductions)}</td>
                      <td className="py-3 px-3 text-right font-semibold text-blue-700 tabular-nums">{formatINR(b.netPayableAmount)}</td>
                      <td className="py-3 px-3 text-right text-slate-700 tabular-nums">{formatINR(b.paidAmount)}</td>
                      <td className="py-3 px-3 text-center">
                        {renderStatusBadge(b.status)}
                      </td>
                      {/* Documents Upload/View Button */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => openDocsModal(b)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-[12px] transition border border-indigo-200 shadow-sm"
                        >
                          <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Files</span>
                        </button>
                      </td>
                      {/* Actions: Edit, Delete, Verify */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(b)}
                            title="Edit Bill Details"
                            className="btn-action-edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteBill(b.id, b.internalBillNo)}
                            title="Delete Bill"
                            className="btn-action-delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {!b.isVerified && (
                            <button
                              onClick={() => verifyBill(b.id)}
                              title="Verify Bill Approval"
                              className="btn-action-verify"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Verify</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Bill Documents Management & Preview */}
        {selectedBillForDocs && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 flex flex-col max-h-[85vh]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="font-semibold text-[18px] text-slate-900">
                    Supporting Documents: {selectedBillForDocs.internalBillNo}
                  </h3>
                  <p className="text-[12px] text-slate-500">
                    Vendor: {selectedBillForDocs.vendor?.name} | Inv: {selectedBillForDocs.invoiceNo}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedBillForDocs(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Upload New Document Form */}
              <form onSubmit={handleUploadDoc} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl mb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide">Upload Supporting File</h4>
                  <span className="text-[12px] text-slate-400">PDF, PNG, JPG (Max 25MB)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[12px] font-medium text-slate-600 mb-0.5">Document Category</label>
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      className="w-full text-[13.5px] p-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="INVOICE">Vendor Invoice / Tax Bill</option>
                      <option value="WORK_ORDER">Work Order / Sanction GO</option>
                      <option value="MEASUREMENT_BOOK">Measurement Book (MB Record)</option>
                      <option value="TAX_CHALLAN">GST / TDS Challan (CPIN/CRI)</option>
                      <option value="SITE_PHOTO">Site Photos & Encroachment Inspection</option>
                      <option value="OTHER">Other Proof</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-slate-600 mb-0.5">Select File</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      required
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      className="w-full text-[13px] p-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-[13px] font-semibold shadow transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploading ? 'Uploading...' : 'Upload & Verify Attachment'}</span>
                  </button>
                </div>
              </form>

              {/* Attached Documents List */}
              <div className="flex-1 overflow-y-auto space-y-2">
                <h4 className="text-[14px] font-semibold text-slate-800">
                  Attached Files ({billDocs.length})
                </h4>

                {billDocs.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-[13px] border border-dashed border-slate-200 rounded-xl">
                    No documents attached yet for this bill. Choose a file above to upload.
                  </div>
                ) : (
                  billDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <FileCheck2 className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-[13.5px] font-semibold text-slate-800">{doc.originalFilename}</p>
                          <div className="flex items-center gap-2 text-[12px] text-slate-500 font-mono">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold text-[11px]">
                              {doc.category}
                            </span>
                            <span>{(Number(doc.fileSizeBytes) / 1024).toFixed(1)} KB</span>
                            <span>• {new Date(doc.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Preview button */}
                        <button
                          type="button"
                          onClick={() => handlePreviewDoc(doc)}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[13px] font-medium transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </button>

                        {/* Download button */}
                        <a
                          href={`http://localhost:4000/documents/download/${doc.documentUid}`}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-[13px] font-medium transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal: Document Preview */}
        {previewDoc && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full h-[85vh] border border-slate-200 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-3.5 bg-slate-900 text-white">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold truncate max-w-md">{previewDoc.originalFilename}</span>
                  <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded font-mono text-slate-300">
                    {previewDoc.category}
                  </span>
                </div>
                <button onClick={() => setPreviewDoc(null)} className="text-white/70 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 bg-slate-100 overflow-auto flex items-center justify-center p-4">
                {previewLoading ? (
                  <div className="text-xs text-slate-500 font-semibold">Loading document preview...</div>
                ) : previewDoc.isPdf ? (
                  <iframe src={previewDoc.blobUrl} className="w-full h-full rounded border border-slate-300" title="PDF Preview" />
                ) : previewDoc.isImage ? (
                  <img src={previewDoc.blobUrl} alt={previewDoc.originalFilename} className="max-h-full max-w-full object-contain rounded shadow" />
                ) : (
                  <div className="text-center p-6 bg-white rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-600 mb-2">Preview not available directly in browser for this file format.</p>
                    <a href={previewDoc.blobUrl} download={previewDoc.originalFilename} className="px-3 py-1.5 bg-blue-700 text-white text-xs font-semibold rounded">
                      Download File
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal: Enter New Bill */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 border border-slate-200 overflow-y-auto max-h-[92vh]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="font-semibold text-[18px] text-slate-900">Enter New Bill / Expense Claim</h3>
                  <p className="text-[12px] text-slate-500">Record claim with percentage tax calculations and supporting documents</p>
                </div>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateBill} className="space-y-4">
                {/* 1. Basic Bill Metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Originating Wing *</label>
                    <select
                      value={formData.wingId}
                      onChange={(e) => setFormData({ ...formData, wingId: e.target.value })}
                      className="w-full text-[14px] p-2 border border-slate-300 rounded-lg"
                    >
                      {wings.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Select Vendor *</label>
                    <select
                      value={formData.vendorId}
                      onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                      className="w-full text-[14px] p-2 border border-slate-300 rounded-lg font-medium"
                    >
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>{v.name} ({v.vendorCode})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Bill Subject / Purpose *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Demolition machinery hiring & clearance works at Errakunta lake"
                    value={formData.billSubject}
                    onChange={(e) => setFormData({ ...formData, billSubject: e.target.value })}
                    className="w-full text-[14px] p-2 border border-slate-300 rounded-lg font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Gross Bill Amount (₹) *</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      placeholder="e.g. 1000000"
                      value={formData.grossAmount}
                      onChange={(e) => handleGrossChange(e.target.value, false)}
                      className="w-full text-[14px] p-2 border border-slate-300 rounded-lg font-semibold text-slate-900 tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Vendor Invoice Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. INV-2026-998"
                      value={formData.invoiceNo}
                      onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                      className="w-full text-[14px] p-2 border border-slate-300 rounded-lg font-mono font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Invoice Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.invoiceDate}
                      onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                      className="w-full text-[14px] p-2 border border-slate-300 rounded-lg font-normal"
                    />
                  </div>
                </div>

                {/* 2. Statutory Deductions Breakdown with PERCENTAGE Calculations */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-700 uppercase">Applicable Deductions & Tax Details</h4>
                      <p className="text-[10px] text-slate-500">Calculated in percentage (%) of Gross Bill Amount</p>
                    </div>
                    <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                      <Percent className="w-3 h-3" /> Percentage Driven
                    </span>
                  </div>

                  {/* Standard Tax Presets */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="text-slate-500 font-semibold">Statutory Presets:</span>
                    <button
                      type="button"
                      onClick={() => applyTaxPreset(1, 1, 2, 0, false)}
                      className="px-2 py-0.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded font-medium shadow-sm"
                    >
                      GST TDS 2% + IT TDS 2%
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTaxPreset(9, 9, 2, 0, false)}
                      className="px-2 py-0.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded font-medium shadow-sm"
                    >
                      Works GST 18% + IT TDS 2%
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTaxPreset(0, 0, 10, 0, false)}
                      className="px-2 py-0.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded font-medium shadow-sm"
                    >
                      Prof. Services TDS 10%
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTaxPreset(0, 0, 0, 0, false)}
                      className="px-2 py-0.5 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 rounded font-medium shadow-sm"
                    >
                      Nil (0%)
                    </button>
                  </div>

                  {/* Percentage rate inputs with auto-calculated values */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] font-bold text-slate-700">CGST (%)</label>
                        <span className="text-[10px] font-mono text-blue-800 font-bold">₹{formData.cgstAmount}</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Rate %"
                          value={formData.cgstRate}
                          onChange={(e) => handleRateChange('cgst', e.target.value, false)}
                          className="w-full text-xs p-1.5 border border-slate-300 rounded font-semibold pr-6"
                        />
                        <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-bold">%</span>
                      </div>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] font-bold text-slate-700">SGST (%)</label>
                        <span className="text-[10px] font-mono text-blue-800 font-bold">₹{formData.sgstAmount}</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Rate %"
                          value={formData.sgstRate}
                          onChange={(e) => handleRateChange('sgst', e.target.value, false)}
                          className="w-full text-xs p-1.5 border border-slate-300 rounded font-semibold pr-6"
                        />
                        <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-bold">%</span>
                      </div>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] font-bold text-slate-700">IT TDS (%)</label>
                        <span className="text-[10px] font-mono text-blue-800 font-bold">₹{formData.tdsAmount}</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Rate %"
                          value={formData.tdsRate}
                          onChange={(e) => handleRateChange('tds', e.target.value, false)}
                          className="w-full text-xs p-1.5 border border-slate-300 rounded font-semibold pr-6"
                        />
                        <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-bold">%</span>
                      </div>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] font-bold text-slate-700">Others (%)</label>
                        <span className="text-[10px] font-mono text-blue-800 font-bold">₹{formData.otherDeductions}</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Rate %"
                          value={formData.otherRate}
                          onChange={(e) => handleRateChange('other', e.target.value, false)}
                          className="w-full text-xs p-1.5 border border-slate-300 rounded font-semibold pr-6"
                        />
                        <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-bold">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Net Payable Real-time summary */}
                  <div className="flex items-center justify-between text-xs pt-1 px-1 font-semibold text-slate-700">
                    <span>
                      Total Deductions: <strong className="text-amber-700">₹{formatINR(Number(formData.cgstAmount || 0) + Number(formData.sgstAmount || 0) + Number(formData.tdsAmount || 0) + Number(formData.otherDeductions || 0))}</strong>
                    </span>
                    <span>
                      Net Payable to Vendor: <strong className="text-blue-800 text-sm">₹{formatINR(calcNetPayable(formData.grossAmount, formData.cgstAmount, formData.sgstAmount, formData.tdsAmount, formData.otherDeductions))}</strong>
                    </span>
                  </div>

                  {/* Statutory Challan References: CPIN & CRI */}
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Statutory Challan References (CPIN & CRI)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-700">GST CPIN Number</label>
                        <input
                          type="text"
                          placeholder="e.g. 14-digit CPIN No (e.g. 24043600012345)"
                          value={formData.gstCpin}
                          onChange={(e) => setFormData({ ...formData, gstCpin: e.target.value.toUpperCase().trim() })}
                          className="w-full text-xs p-1.5 border border-slate-300 rounded font-mono uppercase"
                        />
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] text-slate-400">Challan Date:</span>
                          <input
                            type="date"
                            value={formData.gstChallanDate}
                            onChange={(e) => setFormData({ ...formData, gstChallanDate: e.target.value })}
                            className="text-[11px] p-1 border border-slate-200 rounded font-mono"
                          />
                        </div>
                      </div>

                      <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-700">TDS CRI Number</label>
                        <input
                          type="text"
                          placeholder="e.g. Challan Receipt Identification (CRI No)"
                          value={formData.tdsCrn}
                          onChange={(e) => setFormData({ ...formData, tdsCrn: e.target.value.toUpperCase().trim() })}
                          className="w-full text-xs p-1.5 border border-slate-300 rounded font-mono uppercase"
                        />
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] text-slate-400">Challan Date:</span>
                          <input
                            type="date"
                            value={formData.tdsChallanDate}
                            onChange={(e) => setFormData({ ...formData, tdsChallanDate: e.target.value })}
                            className="text-[11px] p-1 border border-slate-200 rounded font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Multiple Budget Head Allocations */}
                <div className="p-3 bg-blue-50/40 border border-blue-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-[11px] font-bold text-blue-950 uppercase">Budget Head Allocations</h4>
                      <p className="text-[10px] text-slate-500">
                        Sum of all allocated amounts must equal Gross Bill Amount
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddAllocation(false)}
                      className="px-2 py-1 bg-blue-700 hover:bg-blue-800 text-white text-[11px] font-bold rounded flex items-center gap-1 shadow-sm"
                    >
                      <Plus className="w-3 h-3" /> Add Head Allocation
                    </button>
                  </div>

                  <div className="space-y-2">
                    {formData.allocations.map((alloc, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white p-2 border border-blue-200 rounded-lg">
                        <div className="flex-1">
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Budget Head</label>
                          <select
                            value={alloc.budgetHeadId}
                            onChange={(e) => handleAllocationChange(idx, 'budgetHeadId', e.target.value, false)}
                            className="w-full text-xs p-1.5 border border-slate-200 rounded"
                          >
                            {budgetHeads.map((bh) => (
                              <option key={bh.id} value={bh.id}>{bh.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="w-36">
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Source</label>
                          <select
                            value={alloc.fundingSourceId}
                            onChange={(e) => handleAllocationChange(idx, 'fundingSourceId', e.target.value, false)}
                            className="w-full text-xs p-1.5 border border-slate-200 rounded"
                          >
                            {fundingSources.map((fs) => (
                              <option key={fs.id} value={fs.id}>{fs.code}</option>
                            ))}
                          </select>
                        </div>

                        <div className="w-36">
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Allocated (₹)</label>
                          <input
                            type="number"
                            required
                            step="0.01"
                            placeholder="Amount"
                            value={alloc.allocatedAmount}
                            onChange={(e) => handleAllocationChange(idx, 'allocatedAmount', e.target.value, false)}
                            className="w-full text-xs p-1.5 border border-slate-200 rounded font-bold"
                          />
                        </div>

                        {formData.allocations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAllocation(idx, false)}
                            className="p-1 text-slate-400 hover:text-rose-600 mt-4"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Supporting Document Attachment */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-blue-700" />
                      Attach Supporting Bill Document (Optional)
                    </h4>
                    <span className="text-[10px] text-slate-400">PDF, PNG, JPG</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Document Category</label>
                      <select
                        value={initialDocCategory}
                        onChange={(e) => setInitialDocCategory(e.target.value)}
                        className="w-full text-xs p-1.5 border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="INVOICE">Vendor Invoice / Tax Bill</option>
                        <option value="WORK_ORDER">Work Order / Sanction GO</option>
                        <option value="MEASUREMENT_BOOK">Measurement Book (MB Record)</option>
                        <option value="TAX_CHALLAN">GST / TDS Challan (CPIN/CRI)</option>
                        <option value="SITE_PHOTO">Site Photos & Encroachment Inspection</option>
                        <option value="OTHER">Other Proof</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Select File to Upload</label>
                      <input
                        ref={initialFileInputRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.webp"
                        onChange={(e) => setInitialBillFile(e.target.files?.[0] || null)}
                        className="w-full text-xs p-1 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow"
                  >
                    Save & Record Bill
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Bill */}
        {editingBill && editFormData && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 border border-slate-200 overflow-y-auto max-h-[92vh]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="font-semibold text-[18px] text-slate-900">Edit Bill Voucher: {editFormData.internalBillNo}</h3>
                  <p className="text-[12px] text-slate-500">Update invoice details, percentage deductions, CPIN/CRI and allocations</p>
                </div>
                <button onClick={() => setEditingBill(null)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateBill} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Originating Wing *</label>
                    <select
                      value={editFormData.wingId}
                      onChange={(e) => setEditFormData({ ...editFormData, wingId: e.target.value })}
                      className="w-full text-[14px] p-2 border border-slate-300 rounded-lg"
                    >
                      {wings.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Select Vendor *</label>
                    <select
                      value={editFormData.vendorId}
                      onChange={(e) => setEditFormData({ ...editFormData, vendorId: e.target.value })}
                      className="w-full text-[14px] p-2 border border-slate-300 rounded-lg font-medium"
                    >
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>{v.name} ({v.vendorCode})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Bill Subject / Purpose *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.billSubject}
                    onChange={(e) => setEditFormData({ ...editFormData, billSubject: e.target.value })}
                    className="w-full text-[14px] p-2 border border-slate-300 rounded-lg font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Gross Bill Amount (₹) *</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={editFormData.grossAmount}
                      onChange={(e) => handleGrossChange(e.target.value, true)}
                      className="w-full text-[14px] p-2 border border-slate-300 rounded-lg font-semibold text-slate-900 tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Vendor Invoice Number *</label>
                    <input
                      type="text"
                      required
                      value={editFormData.invoiceNo}
                      onChange={(e) => setEditFormData({ ...editFormData, invoiceNo: e.target.value })}
                      className="w-full text-[14px] p-2 border border-slate-300 rounded-lg font-mono font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Invoice Date *</label>
                    <input
                      type="date"
                      required
                      value={editFormData.invoiceDate}
                      onChange={(e) => setEditFormData({ ...editFormData, invoiceDate: e.target.value })}
                      className="w-full text-[14px] p-2 border border-slate-300 rounded-lg font-normal"
                    />
                  </div>
                </div>

                {/* Deductions with Percentages */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-700 uppercase">Applicable Deductions & Tax Details</h4>
                      <p className="text-[10px] text-slate-500">Calculated in percentage (%) of Gross Bill Amount</p>
                    </div>
                    <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                      <Percent className="w-3 h-3" /> Percentage Driven
                    </span>
                  </div>

                  {/* Quick Tax Rate Presets */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="text-slate-500 font-semibold">Statutory Presets:</span>
                    <button
                      type="button"
                      onClick={() => applyTaxPreset(1, 1, 2, 0, true)}
                      className="px-2 py-0.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded font-medium shadow-sm"
                    >
                      GST TDS 2% + IT TDS 2%
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTaxPreset(9, 9, 2, 0, true)}
                      className="px-2 py-0.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded font-medium shadow-sm"
                    >
                      Works GST 18% + IT TDS 2%
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTaxPreset(0, 0, 10, 0, true)}
                      className="px-2 py-0.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded font-medium shadow-sm"
                    >
                      Prof. Services TDS 10%
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTaxPreset(0, 0, 0, 0, true)}
                      className="px-2 py-0.5 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 rounded font-medium shadow-sm"
                    >
                      Nil (0%)
                    </button>
                  </div>

                  {/* Percentage inputs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] font-bold text-slate-700">CGST (%)</label>
                        <span className="text-[10px] font-mono text-blue-800 font-bold">₹{editFormData.cgstAmount}</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Rate %"
                          value={editFormData.cgstRate}
                          onChange={(e) => handleRateChange('cgst', e.target.value, true)}
                          className="w-full text-xs p-1.5 border border-slate-300 rounded font-semibold pr-6"
                        />
                        <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-bold">%</span>
                      </div>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] font-bold text-slate-700">SGST (%)</label>
                        <span className="text-[10px] font-mono text-blue-800 font-bold">₹{editFormData.sgstAmount}</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Rate %"
                          value={editFormData.sgstRate}
                          onChange={(e) => handleRateChange('sgst', e.target.value, true)}
                          className="w-full text-xs p-1.5 border border-slate-300 rounded font-semibold pr-6"
                        />
                        <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-bold">%</span>
                      </div>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] font-bold text-slate-700">IT TDS (%)</label>
                        <span className="text-[10px] font-mono text-blue-800 font-bold">₹{editFormData.tdsAmount}</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Rate %"
                          value={editFormData.tdsRate}
                          onChange={(e) => handleRateChange('tds', e.target.value, true)}
                          className="w-full text-xs p-1.5 border border-slate-300 rounded font-semibold pr-6"
                        />
                        <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-bold">%</span>
                      </div>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] font-bold text-slate-700">Others (%)</label>
                        <span className="text-[10px] font-mono text-blue-800 font-bold">₹{editFormData.otherDeductions}</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Rate %"
                          value={editFormData.otherRate}
                          onChange={(e) => handleRateChange('other', e.target.value, true)}
                          className="w-full text-xs p-1.5 border border-slate-300 rounded font-semibold pr-6"
                        />
                        <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-bold">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Statutory Challan References: CPIN & CRI */}
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Statutory Challan References (CPIN & CRI)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-700">GST CPIN Number</label>
                        <input
                          type="text"
                          placeholder="e.g. 14-digit CPIN No"
                          value={editFormData.gstCpin}
                          onChange={(e) => setEditFormData({ ...editFormData, gstCpin: e.target.value.toUpperCase().trim() })}
                          className="w-full text-xs p-1.5 border border-slate-300 rounded font-mono uppercase"
                        />
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] text-slate-400">Challan Date:</span>
                          <input
                            type="date"
                            value={editFormData.gstChallanDate}
                            onChange={(e) => setEditFormData({ ...editFormData, gstChallanDate: e.target.value })}
                            className="text-[11px] p-1 border border-slate-200 rounded font-mono"
                          />
                        </div>
                      </div>

                      <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-700">TDS CRI Number</label>
                        <input
                          type="text"
                          placeholder="e.g. CRI Challan Number"
                          value={editFormData.tdsCrn}
                          onChange={(e) => setEditFormData({ ...editFormData, tdsCrn: e.target.value.toUpperCase().trim() })}
                          className="w-full text-xs p-1.5 border border-slate-300 rounded font-mono uppercase"
                        />
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] text-slate-400">Challan Date:</span>
                          <input
                            type="date"
                            value={editFormData.tdsChallanDate}
                            onChange={(e) => setEditFormData({ ...editFormData, tdsChallanDate: e.target.value })}
                            className="text-[11px] p-1 border border-slate-200 rounded font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Multiple Budget Head Allocations */}
                <div className="p-3 bg-blue-50/40 border border-blue-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-[11px] font-bold text-blue-950 uppercase">Budget Head Allocations</h4>
                      <p className="text-[10px] text-slate-500">
                        Sum of all allocated amounts must equal Gross Bill Amount
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddAllocation(true)}
                      className="px-2 py-1 bg-blue-700 hover:bg-blue-800 text-white text-[11px] font-bold rounded flex items-center gap-1 shadow-sm"
                    >
                      <Plus className="w-3 h-3" /> Add Head Allocation
                    </button>
                  </div>

                  <div className="space-y-2">
                    {editFormData.allocations.map((alloc: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 bg-white p-2 border border-blue-200 rounded-lg">
                        <div className="flex-1">
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Budget Head</label>
                          <select
                            value={alloc.budgetHeadId}
                            onChange={(e) => handleAllocationChange(idx, 'budgetHeadId', e.target.value, true)}
                            className="w-full text-xs p-1.5 border border-slate-200 rounded"
                          >
                            {budgetHeads.map((bh) => (
                              <option key={bh.id} value={bh.id}>{bh.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="w-36">
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Source</label>
                          <select
                            value={alloc.fundingSourceId}
                            onChange={(e) => handleAllocationChange(idx, 'fundingSourceId', e.target.value, true)}
                            className="w-full text-xs p-1.5 border border-slate-200 rounded"
                          >
                            {fundingSources.map((fs) => (
                              <option key={fs.id} value={fs.id}>{fs.code}</option>
                            ))}
                          </select>
                        </div>

                        <div className="w-36">
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Allocated (₹)</label>
                          <input
                            type="number"
                            required
                            step="0.01"
                            value={alloc.allocatedAmount}
                            onChange={(e) => handleAllocationChange(idx, 'allocatedAmount', e.target.value, true)}
                            className="w-full text-xs p-1.5 border border-slate-200 rounded font-bold"
                          />
                        </div>

                        {editFormData.allocations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAllocation(idx, true)}
                            className="p-1 text-slate-400 hover:text-rose-600 mt-4"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingBill(null)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow"
                  >
                    Update Bill Voucher
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
