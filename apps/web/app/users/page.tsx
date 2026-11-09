'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import {
  ShieldCheck,
  Plus,
  UserCheck,
  Lock,
  Edit2,
  Trash2,
  KeyRound,
  CheckSquare,
  Square,
  Save,
  AlertTriangle,
} from 'lucide-react';
import api from '@/lib/api';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchUser, setSearchUser] = useState('');
  const [allPermissions, setAllPermissions] = useState<any[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [loading, setLoading] = useState(true);

  // User Modals
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userFormData, setUserFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    designation: '',
    password: '',
    role: 'TREASURY_DATA_ENTRY',
    isActive: true,
  });

  // Selected Role for Permissions Editor
  const [selectedRole, setSelectedRole] = useState('TREASURY_DATA_ENTRY');
  const [rolePermsDraft, setRolePermsDraft] = useState<string[]>([]);
  const [savingRole, setSavingRole] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [uRes, pRes] = await Promise.all([
        api.get('/users'),
        api.get('/users/roles/permissions'),
      ]);
      setUsers(uRes.data);
      setAllPermissions(pRes.data.allPermissions || []);
      setRolePermissions(pRes.data.rolePermissions || {});
      setRolePermsDraft(pRes.data.rolePermissions?.['TREASURY_DATA_ENTRY'] || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    setRolePermsDraft(rolePermissions[role] || []);
  };

  const togglePermission = (key: string) => {
    if (rolePermsDraft.includes(key)) {
      setRolePermsDraft(rolePermsDraft.filter((k) => k !== key));
    } else {
      setRolePermsDraft([...rolePermsDraft, key]);
    }
  };

  const saveRolePermissions = async () => {
    setSavingRole(true);
    try {
      await api.put('/users/roles/permissions', {
        role: selectedRole,
        permissions: rolePermsDraft,
      });
      setRolePermissions({
        ...rolePermissions,
        [selectedRole]: rolePermsDraft,
      });
      alert(`Permissions updated successfully for role ${selectedRole}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update role permissions');
    } finally {
      setSavingRole(false);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setUserFormData({
      username: '',
      email: '',
      fullName: '',
      designation: '',
      password: '',
      role: 'TREASURY_DATA_ENTRY',
      isActive: true,
    });
    setShowUserModal(true);
  };

  const openEditModal = (u: any) => {
    setEditingUser(u);
    setUserFormData({
      username: u.username,
      email: u.email,
      fullName: u.fullName,
      designation: u.designation || '',
      password: '', // Blank unless updating
      role: u.role,
      isActive: u.isActive,
    });
    setShowUserModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, userFormData);
      } else {
        await api.post('/users', userFormData);
      }
      setShowUserModal(false);
      loadAll();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDeleteUser = async (id: number, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) return;
    try {
      await api.delete(`/users/${id}`);
      loadAll();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchUser.toLowerCase().trim();
    if (!q) return true;
    return (
      u.fullName?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.designation?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-semibold text-slate-900 tracking-tight">User & Role Permission Management</h1>
            <p className="text-[12px] text-slate-500 mt-1">
              SuperAdmin Portal to Provision Officers, Edit Credentials & Configure Role-Based Action Permissions
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-200 p-1 rounded-lg flex items-center text-[13px] font-medium">
              <button
                onClick={() => setActiveTab('users')}
                className={`px-3.5 py-1.5 rounded-md transition ${
                  activeTab === 'users' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                Officers Directory
              </button>
              <button
                onClick={() => setActiveTab('roles')}
                className={`px-3.5 py-1.5 rounded-md transition ${
                  activeTab === 'roles' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                Roles & Permissions
              </button>
            </div>

            {activeTab === 'users' && (
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-[14px] font-medium shadow transition"
              >
                <Plus className="w-4 h-4" />
                <span>New Treasury Officer</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: USERS DIRECTORY */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-semibold text-[16px] text-slate-800">
                Authorized Officer Accounts ({filteredUsers.length} of {users.length})
              </h3>
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  placeholder="Filter by officer name, username, email, role..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="w-full text-[14px] px-3.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 font-normal"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13.5px]">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[13px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">Officer Name</th>
                    <th className="py-3 px-3">Username & Email</th>
                    <th className="py-3 px-3">Designation</th>
                    <th className="py-3 px-3">Assigned Role</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3">Last Login</th>
                    <th className="py-3 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-[13.5px]">
                        {searchUser ? `No officers matching "${searchUser}"` : 'No officers registered.'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-3 font-semibold text-slate-900">{u.fullName}</td>
                      <td className="py-3 px-3 font-mono text-slate-600 text-[13px]">
                        <p className="font-semibold text-slate-800">{u.username}</p>
                        <p className="text-[12px] text-slate-400">{u.email}</p>
                      </td>
                      <td className="py-3 px-3 text-slate-700">{u.designation || 'Treasury Staff'}</td>
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-0.5 rounded text-[12px] font-medium bg-blue-50 text-blue-800 border border-blue-200 font-mono">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded text-[12px] font-medium ${
                            u.isActive ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {u.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-mono text-[12px] tabular-nums">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="btn-action-edit"
                            title="Edit Officer Profile & Password"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {u.username !== 'superadmin' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              className="btn-action-delete"
                              title="Delete Officer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: ROLES & PERMISSIONS MATRIX */}
        {activeTab === 'roles' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Configure Role-Based Permissions</h3>
                <p className="text-xs text-slate-500">
                  Select a role below to configure its allowed operations (edit, delete, authorize payment, etc.)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Select Role:</span>
                <select
                  value={selectedRole}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="text-xs font-bold p-2 border border-slate-300 rounded-lg bg-slate-50 font-mono"
                >
                  <option value="TREASURY_DATA_ENTRY">TREASURY_DATA_ENTRY</option>
                  <option value="TREASURY_ADMIN">TREASURY_ADMIN</option>
                  <option value="TREASURY_SUPERVISOR">TREASURY_SUPERVISOR</option>
                  <option value="AUDITOR_READ_ONLY">AUDITOR_READ_ONLY</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                </select>

                <button
                  onClick={saveRolePermissions}
                  disabled={savingRole}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1.5 transition disabled:opacity-60"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingRole ? 'Saving...' : 'Save Permissions'}</span>
                </button>
              </div>
            </div>

            {/* Permissions List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {allPermissions.map((perm) => {
                const isChecked = rolePermsDraft.includes(perm.key);
                return (
                  <div
                    key={perm.key}
                    onClick={() => togglePermission(perm.key)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition select-none flex items-start gap-3 h-full ${
                      isChecked
                        ? 'bg-blue-50/70 border-blue-300 text-blue-950'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-blue-700" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                        {perm.category}
                      </span>
                      <p className="text-xs font-bold leading-snug break-words">{perm.label}</p>
                      <p className="text-[10px] font-mono text-slate-500 mt-1 break-all">{perm.key}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal: Create or Edit User */}
        {showUserModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 mb-4">
                {editingUser ? `Edit Officer: ${editingUser.username}` : 'Create New Treasury Officer'}
              </h3>

              <form onSubmit={handleSaveUser} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sri P. Srinivas"
                    value={userFormData.fullName}
                    onChange={(e) => setUserFormData({ ...userFormData, fullName: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Username</label>
                    <input
                      type="text"
                      required
                      disabled={!!editingUser}
                      placeholder="e.g. srinivas.p"
                      value={userFormData.username}
                      onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg font-mono disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email</label>
                    <input
                      type="email"
                      required
                      placeholder="srinivas@hydraa.gov.in"
                      value={userFormData.email}
                      onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                    <input
                      type="text"
                      placeholder="e.g. Senior Treasury Officer"
                      value={userFormData.designation}
                      onChange={(e) => setUserFormData({ ...userFormData, designation: e.target.value })}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                    <select
                      value={userFormData.role}
                      onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg font-semibold"
                    >
                      <option value="TREASURY_DATA_ENTRY">TREASURY_DATA_ENTRY</option>
                      <option value="TREASURY_SUPERVISOR">TREASURY_SUPERVISOR</option>
                      <option value="TREASURY_ADMIN">TREASURY_ADMIN</option>
                      <option value="AUDITOR_READ_ONLY">AUDITOR_READ_ONLY</option>
                      <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {editingUser ? 'New Password (leave blank to keep current)' : 'Account Password'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    placeholder="••••••••••••"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                {editingUser && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="isActiveCheck"
                      checked={userFormData.isActive}
                      onChange={(e) => setUserFormData({ ...userFormData, isActive: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="isActiveCheck" className="text-xs font-medium text-slate-700">
                      Officer Account Active
                    </label>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowUserModal(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg shadow"
                  >
                    {editingUser ? 'Save Changes' : 'Create Officer'}
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
