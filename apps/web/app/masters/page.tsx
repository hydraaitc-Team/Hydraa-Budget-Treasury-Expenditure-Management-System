'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import {
  Layers,
  Building,
  Calendar,
  Tag,
  Plus,
  CheckCircle,
  ShieldCheck,
  Search,
  ArrowRight,
  Edit2,
  Trash2,
  Clock,
  X,
  AlertTriangle,
  FolderPlus
} from 'lucide-react';
import api from '@/lib/api';

export default function MastersPage() {
  const [fys, setFys] = useState<any[]>([]);
  const [wings, setWings] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [heads, setHeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Creation Modals
  const [showFyModal, setShowFyModal] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showHeadModal, setShowHeadModal] = useState(false);
  const [showWingModal, setShowWingModal] = useState(false);
  const [showSubHeadModal, setShowSubHeadModal] = useState<any | null>(null);

  // Edit Modals
  const [editingFy, setEditingFy] = useState<any | null>(null);
  const [editingSource, setEditingSource] = useState<any | null>(null);
  const [editingWing, setEditingWing] = useState<any | null>(null);
  const [editingHead, setEditingHead] = useState<any | null>(null);

  // FY Timeline Form state (dates only)
  const [fyForm, setFyForm] = useState({
    startDate: '2026-04-01',
    endDate: '2027-03-31',
    setAsCurrent: false,
  });

  // Source form
  const [sourceForm, setSourceForm] = useState({
    code: '',
    name: '',
    description: '',
  });

  // Wing form
  const [wingForm, setWingForm] = useState({
    code: '',
    name: '',
    headPerson: '',
    contactNo: '',
  });

  // Budget Head form
  const [headForm, setHeadForm] = useState({
    code: '',
    name: '',
    category: 'Operational',
    description: '',
  });

  // Sub-head form
  const [subHeadForm, setSubHeadForm] = useState({
    code: '',
    name: '',
  });

  // In-page search filters
  const [searchHead, setSearchHead] = useState('');
  const [searchWing, setSearchWing] = useState('');

  useEffect(() => {
    loadMasters();
  }, []);

  const loadMasters = async () => {
    try {
      setLoading(true);
      const [fyRes, wRes, sRes, hRes] = await Promise.all([
        api.get('/masters/financial-years'),
        api.get('/masters/wings'),
        api.get('/masters/funding-sources'),
        api.get('/masters/budget-heads'),
      ]);
      setFys(fyRes.data);
      setWings(wRes.data);
      setSources(sRes.data);
      setHeads(hRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to auto-calculate FY code & title from dates
  const calculateFyMeta = (startDateStr: string, endDateStr: string) => {
    if (!startDateStr || !endDateStr) {
      return { code: '----', name: 'Please select start and end dates', durationDays: 0 };
    }
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { code: '----', name: 'Invalid dates', durationDays: 0 };
    }
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    const durationDays = Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    let code = `${startYear}-${String(endYear).slice(-2)}`;
    if (startYear === endYear) {
      code = `${startYear}`;
    }
    const name = `Financial Year ${startYear}-${endYear}`;

    return { code, name, durationDays, startYear, endYear };
  };

  // -------------------------------------------------------------
  // FINANCIAL YEARS HANDLERS
  // -------------------------------------------------------------
  const handleOpenAddFy = () => {
    const nextStartYear = 2026;
    setFyForm({
      startDate: `${nextStartYear}-04-01`,
      endDate: `${nextStartYear + 1}-03-31`,
      setAsCurrent: false,
    });
    setShowFyModal(true);
  };

  const handleOpenEditFy = (fy: any) => {
    const sDate = fy.startDate ? new Date(fy.startDate).toISOString().split('T')[0] : '';
    const eDate = fy.endDate ? new Date(fy.endDate).toISOString().split('T')[0] : '';
    setEditingFy({
      id: fy.id,
      code: fy.code,
      name: fy.name,
      startDate: sDate,
      endDate: eDate,
      isCurrent: fy.isCurrent,
    });
  };

  const handleSaveFinancialYear = async (e: React.FormEvent) => {
    e.preventDefault();
    const meta = calculateFyMeta(fyForm.startDate, fyForm.endDate);
    if (!meta.code || meta.code === '----') {
      alert('Please select valid start and end dates.');
      return;
    }
    try {
      const res = await api.post('/masters/financial-years', {
        code: meta.code,
        name: meta.name,
        startDate: fyForm.startDate,
        endDate: fyForm.endDate,
        isCurrent: fyForm.setAsCurrent,
      });

      if (fyForm.setAsCurrent && res.data?.id) {
        localStorage.setItem('hydraa_selected_fy', String(res.data.id));
        window.dispatchEvent(new CustomEvent('hydraa_fy_changed', { detail: String(res.data.id) }));
      }

      setShowFyModal(false);
      alert(`Financial Year ${meta.code} created successfully.`);
      loadMasters();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create financial year');
    }
  };

  const handleUpdateFinancialYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFy) return;
    const meta = calculateFyMeta(editingFy.startDate, editingFy.endDate);
    try {
      await api.put(`/masters/financial-years/${editingFy.id}`, {
        code: meta.code,
        name: meta.name,
        startDate: editingFy.startDate,
        endDate: editingFy.endDate,
        isCurrent: editingFy.isCurrent,
      });

      if (editingFy.isCurrent) {
        localStorage.setItem('hydraa_selected_fy', String(editingFy.id));
        window.dispatchEvent(new CustomEvent('hydraa_fy_changed', { detail: String(editingFy.id) }));
      }

      setEditingFy(null);
      alert(`Financial Year ${meta.code} updated successfully.`);
      loadMasters();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update financial year');
    }
  };

  const handleDeleteFinancialYear = async (id: number, code: string, isCurrent: boolean) => {
    if (isCurrent) {
      alert(`Cannot delete Financial Year ${code} because it is the currently active year. Please set another year as active first.`);
      return;
    }
    if (!confirm(`Are you sure you want to delete Financial Year ${code}? This action cannot be undone.`)) return;

    try {
      await api.delete(`/masters/financial-years/${id}`);
      alert(`Financial Year ${code} deleted successfully.`);
      loadMasters();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete financial year');
    }
  };

  const handleSetCurrentFy = async (id: number, code: string) => {
    if (!confirm(`Set Financial Year ${code} as the system-wide active current year?`)) return;
    try {
      await api.put(`/masters/financial-years/${id}/set-current`);
      localStorage.setItem('hydraa_selected_fy', String(id));
      window.dispatchEvent(new CustomEvent('hydraa_fy_changed', { detail: String(id) }));
      alert(`Financial Year ${code} is now the active current financial year.`);
      loadMasters();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to set active financial year');
    }
  };

  // -------------------------------------------------------------
  // FUNDING SOURCES HANDLERS
  // -------------------------------------------------------------
  const handleSaveFundingSource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/masters/funding-sources', {
        code: sourceForm.code.trim().toUpperCase(),
        name: sourceForm.name.trim(),
        description: sourceForm.description.trim(),
      });
      setShowSourceModal(false);
      setSourceForm({ code: '', name: '', description: '' });
      alert(`Funding source ${sourceForm.code} added successfully.`);
      loadMasters();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create funding source');
    }
  };

  const handleUpdateFundingSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSource) return;
    try {
      await api.put(`/masters/funding-sources/${editingSource.id}`, {
        code: editingSource.code.trim().toUpperCase(),
        name: editingSource.name.trim(),
        description: editingSource.description.trim(),
      });
      setEditingSource(null);
      alert(`Funding source ${editingSource.code} updated successfully.`);
      loadMasters();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update funding source');
    }
  };

  const handleDeleteFundingSource = async (id: number, code: string) => {
    if (!confirm(`Delete Funding Source ${code}? Budgets and bills attached to this ledger cannot exist.`)) return;
    try {
      await api.delete(`/masters/funding-sources/${id}`);
      alert(`Funding source ${code} deleted successfully.`);
      loadMasters();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete funding source');
    }
  };

  // -------------------------------------------------------------
  // WINGS HANDLERS
  // -------------------------------------------------------------
  const handleSaveWing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/masters/wings', {
        code: wingForm.code.trim().toUpperCase(),
        name: wingForm.name.trim(),
        headPerson: wingForm.headPerson.trim(),
        contactNo: wingForm.contactNo.trim(),
      });
      setShowWingModal(false);
      setWingForm({ code: '', name: '', headPerson: '', contactNo: '' });
      alert(`Wing ${wingForm.name} created successfully.`);
      loadMasters();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create wing');
    }
  };

  const handleUpdateWing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWing) return;
    try {
      await api.put(`/masters/wings/${editingWing.id}`, {
        code: editingWing.code.trim().toUpperCase(),
        name: editingWing.name.trim(),
        headPerson: editingWing.headPerson?.trim(),
        contactNo: editingWing.contactNo?.trim(),
      });
      setEditingWing(null);
      alert(`Wing ${editingWing.name} updated successfully.`);
      loadMasters();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update wing');
    }
  };

  const handleDeleteWing = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete Wing "${name}"?`)) return;
    try {
      await api.delete(`/masters/wings/${id}`);
      alert(`Wing "${name}" deleted successfully.`);
      loadMasters();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete wing');
    }
  };

  // -------------------------------------------------------------
  // BUDGET HEADS & SUB-HEADS HANDLERS
  // -------------------------------------------------------------
  const handleSaveHead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/masters/budget-heads', {
        code: headForm.code.trim().toUpperCase(),
        name: headForm.name.trim(),
        category: headForm.category,
        description: headForm.description.trim(),
      });
      setShowHeadModal(false);
      setHeadForm({ code: '', name: '', category: 'Operational', description: '' });
      alert(`Budget Head created successfully.`);
      loadMasters();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create budget head');
    }
  };

  const handleUpdateHead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHead) return;
    try {
      await api.put(`/masters/budget-heads/${editingHead.id}`, {
        code: editingHead.code.trim().toUpperCase(),
        name: editingHead.name.trim(),
        category: editingHead.category,
        description: editingHead.description?.trim(),
      });
      setEditingHead(null);
      alert(`Budget Head updated successfully.`);
      loadMasters();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update budget head');
    }
  };

  const handleDeleteHead = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete Budget Head "${name}" and all its sub-heads?`)) return;
    try {
      await api.delete(`/masters/budget-heads/${id}`);
      alert(`Budget Head "${name}" deleted.`);
      loadMasters();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete budget head');
    }
  };

  const handleSaveSubHead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showSubHeadModal) return;
    try {
      await api.post('/masters/budget-sub-heads', {
        budgetHeadId: showSubHeadModal.id,
        code: subHeadForm.code.trim().toUpperCase(),
        name: subHeadForm.name.trim(),
      });
      setShowSubHeadModal(null);
      setSubHeadForm({ code: '', name: '' });
      alert(`Sub-head added successfully.`);
      loadMasters();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create sub-head');
    }
  };

  const handleDeleteSubHead = async (subId: number, subName: string) => {
    if (!confirm(`Delete sub-head "${subName}"?`)) return;
    try {
      await api.delete(`/masters/budget-sub-heads/${subId}`);
      alert(`Sub-head deleted.`);
      loadMasters();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete sub-head');
    }
  };

  const filteredHeads = heads.filter((h) =>
    h.name.toLowerCase().includes(searchHead.toLowerCase()) ||
    h.code.toLowerCase().includes(searchHead.toLowerCase())
  );

  const filteredWings = wings.filter((w) =>
    w.name.toLowerCase().includes(searchWing.toLowerCase()) ||
    w.code.toLowerCase().includes(searchWing.toLowerCase())
  );

  // Live computed metadata for Add FY modal
  const addFyComputed = calculateFyMeta(fyForm.startDate, fyForm.endDate);
  // Live computed metadata for Edit FY modal
  const editFyComputed = editingFy ? calculateFyMeta(editingFy.startDate, editingFy.endDate) : null;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-[24px] font-semibold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Layers className="w-6 h-6 text-blue-700" />
              Treasury Masters & System Timelines
            </h1>
            <p className="text-[12px] text-slate-500 mt-1">
              Configure Financial Years, Funding Source Ledgers, Operational Wings, and Budget Purpose Codes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-50 text-blue-800 rounded-lg text-[12px] font-medium border border-blue-200 flex items-center gap-1.5 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              Treasury Officer Control
            </span>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SECTION 1: FINANCIAL YEARS TIMELINE CONFIGURATION              */}
        {/* ------------------------------------------------------------- */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-blue-700" />
              <div>
                <h2 className="text-[18px] font-semibold text-slate-800">Financial Years & Timelines</h2>
                <p className="text-[12px] text-slate-500">
                  Select start and end dates with calendar controls. The system automatically structures the financial year.
                </p>
              </div>
            </div>
            <button
              onClick={handleOpenAddFy}
              className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-[13.5px] font-medium transition flex items-center gap-1.5 shadow-sm"
            >
              <Calendar className="w-4 h-4" />
              + Set New Timeline (Year)
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px] border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 text-[13px] uppercase font-semibold">
                  <th className="py-3 px-3">Financial Year</th>
                  <th className="py-3 px-3">Timeline Span (Start - End)</th>
                  <th className="py-3 px-3">Active Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {fys.map((fy) => (
                  <tr key={fy.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        {fy.code}
                        {fy.isCurrent && (
                          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-medium rounded-full text-[12px] border border-emerald-300">
                            Active System Year
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-slate-500">{fy.name}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span>
                          {new Date(fy.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {new Date(fy.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      {fy.isCurrent ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium text-[12px]">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          Current Active
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[12px]">Archived / Secondary</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!fy.isCurrent && (
                          <button
                            onClick={() => handleSetCurrentFy(fy.id, fy.code)}
                            className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[12px] font-semibold border border-blue-200 transition"
                          >
                            Set Active
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEditFy(fy)}
                          title="Edit Timeline Dates"
                          className="btn-action-edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!fy.isCurrent && (
                          <button
                            onClick={() => handleDeleteFinancialYear(fy.id, fy.code, fy.isCurrent)}
                            title="Delete Financial Year"
                            className="btn-action-delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SECTION 2: FUNDING SOURCE LEDGERS                             */}
        {/* ------------------------------------------------------------- */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-700" />
              <div>
                <h2 className="text-sm font-bold text-slate-800">Funding Sources & Treasury Ledgers</h2>
                <p className="text-xs text-slate-500">
                  Manage all active source ledgers. Multiple funding sources can be configured, edited, or removed.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setSourceForm({ code: '', name: '', description: '' });
                setShowSourceModal(true);
              }}
              className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              + Add Funding Source
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sources.map((src) => (
              <div
                key={src.id}
                className="p-5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition shadow-sm flex flex-col justify-between h-full"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2.5 py-1 bg-blue-100 text-blue-900 rounded-md font-mono text-xs font-bold border border-blue-200 shrink-0">
                      {src.code}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setEditingSource({ id: src.id, code: src.code, name: src.name, description: src.description || '' })}
                        title="Edit Funding Source"
                        className="btn-action-edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteFundingSource(src.id, src.code)}
                        title="Delete Funding Source"
                        className="btn-action-delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-900 text-[15px] sm:text-[16px] break-words leading-snug">{src.name}</h3>
                  <p className="text-xs text-slate-500 mt-1.5 break-words leading-relaxed">
                    {src.description || 'No detailed description provided for this ledger.'}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Ledger Status</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-600" /> Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SECTION 3: OPERATIONAL WINGS & BUDGET HEADS (GRID)            */}
        {/* ------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Wings Section */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-700" />
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Originating Wings</h2>
                  <p className="text-xs text-slate-500">Government departments and wings submitting claims</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setWingForm({ code: '', name: '', headPerson: '', contactNo: '' });
                  setShowWingModal(true);
                }}
                className="px-2.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Wing
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search wings by name or code..."
                value={searchWing}
                onChange={(e) => setSearchWing(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div className="overflow-y-auto max-h-80 border border-slate-100 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Code</th>
                    <th className="py-2 px-3">Wing Name</th>
                    <th className="py-2 px-3">Head Officer</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredWings.map((wing) => (
                    <tr key={wing.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-bold text-blue-800">{wing.code}</td>
                      <td className="py-2 px-3 font-semibold text-slate-800">{wing.name}</td>
                      <td className="py-2 px-3 text-slate-500">{wing.headPerson || '---'}</td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingWing({ id: wing.id, code: wing.code, name: wing.name, headPerson: wing.headPerson || '', contactNo: wing.contactNo || '' })}
                            title="Edit Wing"
                            className="btn-action-edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteWing(wing.id, wing.name)}
                            title="Delete Wing"
                            className="btn-action-delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Budget Heads Section */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-blue-700" />
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Budget Heads & Purposes</h2>
                  <p className="text-xs text-slate-500">Major heads and sub-heads for accounting classifications</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setHeadForm({ code: '', name: '', category: 'Operational', description: '' });
                  setShowHeadModal(true);
                }}
                className="px-2.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Head
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search budget heads by code or purpose..."
                value={searchHead}
                onChange={(e) => setSearchHead(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div className="overflow-y-auto max-h-80 border border-slate-100 rounded-lg divide-y divide-slate-100">
              {filteredHeads.map((head) => (
                <div key={head.id} className="p-3 hover:bg-slate-50 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-xs text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 mr-2">
                        {head.code}
                      </span>
                      <span className="font-semibold text-slate-800 text-xs">{head.name}</span>
                      <span className="ml-2 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {head.category || 'Operational'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setSubHeadForm({ code: '', name: '' });
                          setShowSubHeadModal(head);
                        }}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 rounded-lg text-xs font-semibold border border-indigo-200 transition shadow-sm"
                      >
                        + Sub-Head
                      </button>
                      <button
                        onClick={() => setEditingHead({ id: head.id, code: head.code, name: head.name, category: head.category || 'Operational', description: head.description || '' })}
                        title="Edit Budget Head"
                        className="btn-action-edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteHead(head.id, head.name)}
                        title="Delete Budget Head"
                        className="btn-action-delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Sub-heads list */}
                  {head.subHeads && head.subHeads.length > 0 && (
                    <div className="mt-2 pl-4 border-l-2 border-blue-200 flex flex-wrap gap-1.5">
                      {head.subHeads.map((sub: any) => (
                        <span
                          key={sub.id}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-mono border border-slate-200"
                        >
                          <span className="font-bold text-blue-700">{sub.code}:</span>
                          <span>{sub.name}</span>
                          <button
                            onClick={() => handleDeleteSubHead(sub.id, sub.name)}
                            title="Delete Sub-Head"
                            className="text-slate-400 hover:text-rose-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* MODAL 1: ADD FINANCIAL YEAR (DATES ONLY - NO MANUAL CODE/TITLE) */}
        {/* ------------------------------------------------------------- */}
        {showFyModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white p-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-300" />
                  <div>
                    <h3 className="font-bold text-sm">Add Financial Year Timeline</h3>
                    <p className="text-[11px] text-blue-200">
                      Select start and end dates. Code & title are generated automatically.
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowFyModal(false)} className="text-white/70 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveFinancialYear} className="p-6 space-y-5">
                {/* Calendar Date Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      Timeline Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={fyForm.startDate}
                      onChange={(e) => setFyForm({ ...fyForm, startDate: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono shadow-sm bg-white"
                    />
                    <p className="text-[10px] text-slate-500">Beginning of fiscal accounting (e.g. 01-04-2026)</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      Timeline End Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={fyForm.endDate}
                      onChange={(e) => setFyForm({ ...fyForm, endDate: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono shadow-sm bg-white"
                    />
                    <p className="text-[10px] text-slate-500">Closing of fiscal accounting (e.g. 31-03-2027)</p>
                  </div>
                </div>

                {/* Date Presets for Fast Setup */}
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500">Quick Timeline Presets:</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setFyForm({ ...fyForm, startDate: '2026-04-01', endDate: '2027-03-31' })}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded text-xs font-medium border border-slate-200 transition"
                    >
                      FY 2026-27 (Current)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFyForm({ ...fyForm, startDate: '2027-04-01', endDate: '2028-03-31' })}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded text-xs font-medium border border-slate-200 transition"
                    >
                      FY 2027-28 (Upcoming)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFyForm({ ...fyForm, startDate: '2025-04-01', endDate: '2026-03-31' })}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded text-xs font-medium border border-slate-200 transition"
                    >
                      FY 2025-26
                    </button>
                  </div>
                </div>

                {/* Auto-Calculated Details Card */}
                <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 space-y-2">
                  <div className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-blue-700" />
                    Auto-Configured System Classification
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Financial Year Code:</span>
                      <span className="font-mono font-bold text-blue-950 text-sm">{addFyComputed.code}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Official Title:</span>
                      <span className="font-semibold text-slate-800">{addFyComputed.name}</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-blue-800 font-medium pt-1 border-t border-blue-200/60 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Duration: {addFyComputed.durationDays} days</span>
                  </div>
                </div>

                {/* Current Active Checkbox */}
                <label className="flex items-center gap-2.5 cursor-pointer p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={fyForm.setAsCurrent}
                    onChange={(e) => setFyForm({ ...fyForm, setAsCurrent: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800">Set as Active Current Year immediately</span>
                    <p className="text-[11px] text-slate-500">
                      All new budget allocations and claims will anchor to this timeline by default.
                    </p>
                  </div>
                </label>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowFyModal(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-md transition flex items-center gap-1.5"
                  >
                    <Calendar className="w-4 h-4" />
                    Save Financial Year
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL 2: EDIT FINANCIAL YEAR (DATES ONLY)                     */}
        {/* ------------------------------------------------------------- */}
        {editingFy && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white p-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-blue-300" />
                  <div>
                    <h3 className="font-bold text-sm">Edit Financial Year Timeline ({editingFy.code})</h3>
                    <p className="text-[11px] text-blue-200">
                      Update start and end calendar dates. System classifications recalculate automatically.
                    </p>
                  </div>
                </div>
                <button onClick={() => setEditingFy(null)} className="text-white/70 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateFinancialYear} className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      Timeline Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={editingFy.startDate}
                      onChange={(e) => setEditingFy({ ...editingFy, startDate: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono shadow-sm bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      Timeline End Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={editingFy.endDate}
                      onChange={(e) => setEditingFy({ ...editingFy, endDate: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono shadow-sm bg-white"
                    />
                  </div>
                </div>

                {editFyComputed && (
                  <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 space-y-2">
                    <div className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-blue-700" />
                      Updated System Classification
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Financial Year Code:</span>
                        <span className="font-mono font-bold text-blue-950 text-sm">{editFyComputed.code}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Official Title:</span>
                        <span className="font-semibold text-slate-800">{editFyComputed.name}</span>
                      </div>
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-2.5 cursor-pointer p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={editingFy.isCurrent}
                    onChange={(e) => setEditingFy({ ...editingFy, isCurrent: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800">Designate as Currently Active System Year</span>
                  </div>
                </label>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setEditingFy(null)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-md transition flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Update Timeline
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL 3: ADD FUNDING SOURCE                                   */}
        {/* ------------------------------------------------------------- */}
        {showSourceModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white p-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-blue-300" />
                  <h3 className="font-bold text-sm">Add Funding Source Ledger</h3>
                </div>
                <button onClick={() => setShowSourceModal(false)} className="text-white/70 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveFundingSource} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Source Code / Acronym *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SDRF, WORLD_BANK, AMRUT"
                    value={sourceForm.code}
                    onChange={(e) => setSourceForm({ ...sourceForm, code: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Name / Ledger Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. State Disaster Response Fund"
                    value={sourceForm.name}
                    onChange={(e) => setSourceForm({ ...sourceForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Description / Statutory Reference</label>
                  <textarea
                    rows={3}
                    placeholder="Provide grant context, government order references, or allocation purpose..."
                    value={sourceForm.description}
                    onChange={(e) => setSourceForm({ ...sourceForm, description: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowSourceModal(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-md"
                  >
                    Save Funding Source
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL 4: EDIT FUNDING SOURCE                                  */}
        {/* ------------------------------------------------------------- */}
        {editingSource && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white p-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-blue-300" />
                  <h3 className="font-bold text-sm">Edit Funding Source ({editingSource.code})</h3>
                </div>
                <button onClick={() => setEditingSource(null)} className="text-white/70 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateFundingSource} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Source Code *</label>
                  <input
                    type="text"
                    required
                    value={editingSource.code}
                    onChange={(e) => setEditingSource({ ...editingSource, code: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Name *</label>
                  <input
                    type="text"
                    required
                    value={editingSource.name}
                    onChange={(e) => setEditingSource({ ...editingSource, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={editingSource.description}
                    onChange={(e) => setEditingSource({ ...editingSource, description: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setEditingSource(null)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-md"
                  >
                    Update Funding Source
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL 5: ADD / EDIT WINGS                                     */}
        {/* ------------------------------------------------------------- */}
        {showWingModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
              <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white p-5 flex items-center justify-between">
                <h3 className="font-bold text-sm">Add Originating Wing</h3>
                <button onClick={() => setShowWingModal(false)} className="text-white/70 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSaveWing} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Wing Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MTO, ENF, LAKE_PROT"
                    value={wingForm.code}
                    onChange={(e) => setWingForm({ ...wingForm, code: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Wing Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Motor Transport Operations Wing"
                    value={wingForm.name}
                    onChange={(e) => setWingForm({ ...wingForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Head Officer / In-Charge</label>
                  <input
                    type="text"
                    placeholder="e.g. Superintending Engineer / DSP"
                    value={wingForm.headPerson}
                    onChange={(e) => setWingForm({ ...wingForm, headPerson: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowWingModal(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-md"
                  >
                    Save Wing
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingWing && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
              <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white p-5 flex items-center justify-between">
                <h3 className="font-bold text-sm">Edit Wing ({editingWing.code})</h3>
                <button onClick={() => setEditingWing(null)} className="text-white/70 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleUpdateWing} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Wing Code *</label>
                  <input
                    type="text"
                    required
                    value={editingWing.code}
                    onChange={(e) => setEditingWing({ ...editingWing, code: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Wing Name *</label>
                  <input
                    type="text"
                    required
                    value={editingWing.name}
                    onChange={(e) => setEditingWing({ ...editingWing, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Head Officer</label>
                  <input
                    type="text"
                    value={editingWing.headPerson}
                    onChange={(e) => setEditingWing({ ...editingWing, headPerson: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setEditingWing(null)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-md"
                  >
                    Update Wing
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL 6: ADD / EDIT BUDGET HEADS                              */}
        {/* ------------------------------------------------------------- */}
        {showHeadModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
              <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white p-5 flex items-center justify-between">
                <h3 className="font-bold text-sm">Add Budget Head</h3>
                <button onClick={() => setShowHeadModal(false)} className="text-white/70 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSaveHead} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Head Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MACHINERY_RENTAL"
                    value={headForm.code}
                    onChange={(e) => setHeadForm({ ...headForm, code: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Head Purpose Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Earthmovers & Demolition Machinery Hire"
                    value={headForm.name}
                    onChange={(e) => setHeadForm({ ...headForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={headForm.category}
                    onChange={(e) => setHeadForm({ ...headForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  >
                    <option value="Operational">Operational Expenditure</option>
                    <option value="Capital">Capital / Asset Works</option>
                    <option value="Administrative">Administrative & Office</option>
                    <option value="Special">Special Project Relief</option>
                  </select>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowHeadModal(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-md"
                  >
                    Save Head
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingHead && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
              <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white p-5 flex items-center justify-between">
                <h3 className="font-bold text-sm">Edit Budget Head ({editingHead.code})</h3>
                <button onClick={() => setEditingHead(null)} className="text-white/70 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleUpdateHead} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Head Code *</label>
                  <input
                    type="text"
                    required
                    value={editingHead.code}
                    onChange={(e) => setEditingHead({ ...editingHead, code: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Head Name *</label>
                  <input
                    type="text"
                    required
                    value={editingHead.name}
                    onChange={(e) => setEditingHead({ ...editingHead, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={editingHead.category}
                    onChange={(e) => setEditingHead({ ...editingHead, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  >
                    <option value="Operational">Operational Expenditure</option>
                    <option value="Capital">Capital / Asset Works</option>
                    <option value="Administrative">Administrative & Office</option>
                    <option value="Special">Special Project Relief</option>
                  </select>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setEditingHead(null)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-md"
                  >
                    Update Head
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL 7: ADD SUB-HEAD                                         */}
        {/* ------------------------------------------------------------- */}
        {showSubHeadModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
              <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white p-4 flex items-center justify-between">
                <h3 className="font-bold text-sm">Add Sub-Head to {showSubHeadModal.code}</h3>
                <button onClick={() => setShowSubHeadModal(null)} className="text-white/70 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSaveSubHead} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sub-Head Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FUEL_DIESEL, PARTS"
                    value={subHeadForm.code}
                    onChange={(e) => setSubHeadForm({ ...subHeadForm, code: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sub-Head Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. High Speed Diesel for Trucks"
                    value={subHeadForm.name}
                    onChange={(e) => setSubHeadForm({ ...subHeadForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowSubHeadModal(null)}
                    className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-md"
                  >
                    Add Sub-Head
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
