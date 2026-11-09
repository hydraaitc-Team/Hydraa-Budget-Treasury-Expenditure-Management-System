'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import { Plus, Users, Building, Phone, Mail, FileText, CheckCircle, Edit2, Trash2, X, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

export default function VendorsPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    pan: '',
    gstin: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    purpose: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branch: '',
  });

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const res = await api.get('/vendors');
      setVendors(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();

    // RBI guidelines validation: 9-18 numeric digits
    if (formData.accountNumber) {
      if (formData.accountNumber.length < 9 || formData.accountNumber.length > 18) {
        alert('Bank account number must be between 9 and 18 numeric digits as per RBI guidelines.');
        return;
      }
    }

    // IFSC validation: exactly 11 alphanumeric characters
    if (formData.ifscCode) {
      if (formData.ifscCode.length !== 11) {
        alert('IFSC code must be fixed 11 characters (capital letters and numbers).');
        return;
      }
    }

    try {
      await api.post('/vendors', formData);
      setShowModal(false);
      setFormData({
        name: '',
        pan: '',
        gstin: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        purpose: '',
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        branch: '',
      });
      alert('Vendor created successfully.');
      loadVendors();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create vendor');
    }
  };

  const handleOpenEdit = (v: any) => {
    const primaryBank = v.bankAccounts?.[0] || {};
    setEditingVendor({
      id: v.id,
      vendorCode: v.vendorCode,
      name: v.name || '',
      pan: v.pan || '',
      gstin: v.gstin || '',
      contactPerson: v.contactPerson || '',
      phone: v.phone || '',
      email: v.email || '',
      address: v.address || '',
      purpose: v.purpose || '',
      bankName: primaryBank.bankName || '',
      accountNumber: primaryBank.accountNumber || '',
      ifscCode: primaryBank.ifscCode || '',
      branch: primaryBank.branch || '',
    });
  };

  const handleUpdateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVendor) return;

    if (editingVendor.accountNumber) {
      if (editingVendor.accountNumber.length < 9 || editingVendor.accountNumber.length > 18) {
        alert('Bank account number must be between 9 and 18 numeric digits as per RBI guidelines.');
        return;
      }
    }

    if (editingVendor.ifscCode) {
      if (editingVendor.ifscCode.length !== 11) {
        alert('IFSC code must be fixed 11 characters (capital letters and numbers).');
        return;
      }
    }

    try {
      await api.put(`/vendors/${editingVendor.id}`, editingVendor);
      setEditingVendor(null);
      alert('Vendor details updated successfully.');
      loadVendors();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update vendor');
    }
  };

  const handleDeleteVendor = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete Vendor "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/vendors/${id}`);
      alert(`Vendor "${name}" deleted successfully.`);
      loadVendors();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete vendor');
    }
  };

  const filteredVendors = vendors.filter((v) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      v.name?.toLowerCase().includes(q) ||
      v.vendorCode?.toLowerCase().includes(q) ||
      v.gstin?.toLowerCase().includes(q) ||
      v.pan?.toLowerCase().includes(q) ||
      v.bankAccounts?.some((b: any) => b.accountNumber?.includes(q) || b.bankName?.toLowerCase().includes(q))
    );
  });

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-semibold text-slate-900 tracking-tight">Approved Vendor Master</h1>
            <p className="text-[12px] text-slate-500 mt-1">
              Maintain Verified Vendor Profiles, GSTIN, PAN and Direct Bank Account References
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-[14px] font-medium shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Vendor</span>
          </button>
        </div>

        {/* In-page Vendor Filter */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by vendor name, code, GSTIN, PAN or A/C number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3.5 pr-3.5 py-1.5 text-[14px] border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 font-normal"
            />
          </div>
          <span className="text-[12px] text-slate-500 font-normal">
            Showing {filteredVendors.length} of {vendors.length} Vendors
          </span>
        </div>

        {/* Vendors Directory */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredVendors.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 text-[13.5px] bg-white rounded-xl border border-dashed border-slate-200">
              {searchQuery ? `No vendors matching "${searchQuery}"` : 'No vendors registered yet. Click "Add New Vendor" to register.'}
            </div>
          ) : (
            filteredVendors.map((v) => {
              const primaryBank = v.bankAccounts?.[0];
              return (
                <div key={v.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition h-full">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-mono font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded shrink-0">
                        {v.vendorCode}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[12px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 shadow-sm">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Active
                        </span>
                        {/* Highlighted Edit and Delete action buttons */}
                        <button
                          onClick={() => handleOpenEdit(v)}
                          title="Edit Vendor"
                          className="btn-action-edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteVendor(v.id, v.name)}
                          title="Delete Vendor"
                          className="btn-action-delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-semibold text-[16px] text-slate-900 mt-2 break-words leading-snug">{v.name}</h3>
                    <p className="text-[12px] text-slate-500 mt-0.5 break-words">{v.purpose || 'Government Contractor / Supplier'}</p>

                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-[13.5px] text-slate-600">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="text-slate-400 font-normal">GSTIN:</span>
                        <span className="font-mono font-semibold text-slate-800 break-all">{v.gstin || 'UNREGISTERED'}</span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="text-slate-400 font-normal">PAN:</span>
                        <span className="font-mono font-semibold text-slate-800 break-all">{v.pan || 'N/A'}</span>
                      </div>
                      {v.contactPerson && (
                        <div className="flex flex-wrap items-center justify-between gap-1 text-[12px]">
                          <span className="text-slate-400 font-normal">Contact:</span>
                          <span className="text-slate-700 break-words">{v.contactPerson} {v.phone ? `(${v.phone})` : ''}</span>
                        </div>
                      )}
                    </div>

                    {/* Bank Account */}
                    {primaryBank && (
                      <div className="mt-3 p-3 bg-blue-50/50 border border-blue-200/60 rounded-lg text-[12px] space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-1 text-slate-700 font-medium">
                          <span className="break-words">{primaryBank.bankName}</span>
                          <span className="text-blue-700 font-mono font-semibold shrink-0">{primaryBank.ifscCode}</span>
                        </div>
                        <p className="font-mono text-slate-900 font-semibold text-[13px] tabular-nums break-all">A/C: {primaryBank.accountNumber}</p>
                        {primaryBank.branch && <p className="text-[12px] text-slate-500 break-words">{primaryBank.branch}</p>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal: Add Vendor */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="font-bold text-sm text-slate-900">Add New Vendor to Master</h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateVendor} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Vendor Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hyderabad Demolition & Earthmovers Pvt Ltd"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 36AAAAA0000A1Z5"
                      value={formData.gstin}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase().trim() })}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">PAN Card Number</label>
                    <input
                      type="text"
                      placeholder="e.g. AAAAA0000A"
                      value={formData.pan}
                      onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase().trim() })}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person</label>
                    <input
                      type="text"
                      placeholder="e.g. K. V. Sharma"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 9849012345"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Purpose / Line of Supply</label>
                  <input
                    type="text"
                    placeholder="e.g. Heavy Machinery hiring, Lake Encroachment Clearance, etc."
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                {/* Primary Bank Details with Strict Validations */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-bold text-slate-700 uppercase">Primary Bank Account for Disbursal</h4>
                    <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      RBI Guidelines Compliant
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">Bank Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. State Bank of India"
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        className="w-full text-xs p-1.5 border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">
                        Bank Account Number (9 - 18 digits) *
                      </label>
                      <input
                        type="text"
                        required
                        pattern="[0-9]{9,18}"
                        minLength={9}
                        maxLength={18}
                        placeholder="Numeric only (9 - 18 digits)"
                        value={formData.accountNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 18);
                          setFormData({ ...formData, accountNumber: val });
                        }}
                        className="w-full text-xs p-1.5 border border-slate-300 rounded-lg font-mono font-bold"
                      />
                      <div className="text-[10px] text-slate-500 mt-0.5 flex justify-between">
                        <span>Digits only (RBI standard)</span>
                        <span className={formData.accountNumber.length >= 9 && formData.accountNumber.length <= 18 ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                          {formData.accountNumber.length}/18
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">
                        IFSC Code (Fixed 11 characters) *
                      </label>
                      <input
                        type="text"
                        required
                        minLength={11}
                        maxLength={11}
                        placeholder="e.g. SBIN0000847"
                        value={formData.ifscCode}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
                          setFormData({ ...formData, ifscCode: val });
                        }}
                        className="w-full text-xs p-1.5 border border-slate-300 rounded-lg font-mono font-bold uppercase"
                      />
                      <div className="text-[10px] text-slate-500 mt-0.5 flex justify-between">
                        <span>Capitals & numbers only</span>
                        <span className={formData.ifscCode.length === 11 ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                          {formData.ifscCode.length}/11
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">Branch Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Secretariat Branch, Hyderabad"
                        value={formData.branch}
                        onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                        className="w-full text-xs p-1.5 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

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
                    Save & Register Vendor
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Vendor */}
        {editingVendor && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Edit Vendor Profile</h3>
                  <p className="text-[11px] text-slate-500 font-mono">{editingVendor.vendorCode}</p>
                </div>
                <button onClick={() => setEditingVendor(null)} className="text-slate-400 hover:text-slate-600 font-bold">
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateVendor} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Vendor Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editingVendor.name}
                    onChange={(e) => setEditingVendor({ ...editingVendor, name: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN Number</label>
                    <input
                      type="text"
                      value={editingVendor.gstin}
                      onChange={(e) => setEditingVendor({ ...editingVendor, gstin: e.target.value.toUpperCase().trim() })}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">PAN Card Number</label>
                    <input
                      type="text"
                      value={editingVendor.pan}
                      onChange={(e) => setEditingVendor({ ...editingVendor, pan: e.target.value.toUpperCase().trim() })}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person</label>
                    <input
                      type="text"
                      value={editingVendor.contactPerson}
                      onChange={(e) => setEditingVendor({ ...editingVendor, contactPerson: e.target.value })}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={editingVendor.phone}
                      onChange={(e) => setEditingVendor({ ...editingVendor, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Purpose / Line of Supply</label>
                  <input
                    type="text"
                    value={editingVendor.purpose}
                    onChange={(e) => setEditingVendor({ ...editingVendor, purpose: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                {/* Primary Bank Details with Strict Validations */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-bold text-slate-700 uppercase">Primary Bank Account for Disbursal</h4>
                    <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      RBI Guidelines Compliant
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">Bank Name *</label>
                      <input
                        type="text"
                        required
                        value={editingVendor.bankName}
                        onChange={(e) => setEditingVendor({ ...editingVendor, bankName: e.target.value })}
                        className="w-full text-xs p-1.5 border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">
                        Bank Account Number (9 - 18 digits) *
                      </label>
                      <input
                        type="text"
                        required
                        pattern="[0-9]{9,18}"
                        minLength={9}
                        maxLength={18}
                        value={editingVendor.accountNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 18);
                          setEditingVendor({ ...editingVendor, accountNumber: val });
                        }}
                        className="w-full text-xs p-1.5 border border-slate-300 rounded-lg font-mono font-bold"
                      />
                      <div className="text-[10px] text-slate-500 mt-0.5 flex justify-between">
                        <span>Digits only (RBI standard)</span>
                        <span className={editingVendor.accountNumber?.length >= 9 && editingVendor.accountNumber?.length <= 18 ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                          {editingVendor.accountNumber?.length || 0}/18
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">
                        IFSC Code (Fixed 11 characters) *
                      </label>
                      <input
                        type="text"
                        required
                        minLength={11}
                        maxLength={11}
                        value={editingVendor.ifscCode}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
                          setEditingVendor({ ...editingVendor, ifscCode: val });
                        }}
                        className="w-full text-xs p-1.5 border border-slate-300 rounded-lg font-mono font-bold uppercase"
                      />
                      <div className="text-[10px] text-slate-500 mt-0.5 flex justify-between">
                        <span>Capitals & numbers only</span>
                        <span className={editingVendor.ifscCode?.length === 11 ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                          {editingVendor.ifscCode?.length || 0}/11
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">Branch Name</label>
                      <input
                        type="text"
                        value={editingVendor.branch}
                        onChange={(e) => setEditingVendor({ ...editingVendor, branch: e.target.value })}
                        className="w-full text-xs p-1.5 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingVendor(null)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow"
                  >
                    Update Vendor Details
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
