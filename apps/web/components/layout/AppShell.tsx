'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  ReceiptText,
  Users,
  CreditCard,
  FileSpreadsheet,
  ShieldCheck,
  Search,
  LogOut,
  Building2,
  Calendar,
  Layers,
  History,
  FileCheck2,
  Filter,
} from 'lucide-react';
import api from '@/lib/api';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [financialYears, setFinancialYears] = useState<any[]>([]);
  const [selectedFy, setSelectedFy] = useState<string>('');
  
  // Universal & Advanced Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterToken, setFilterToken] = useState('');
  const [filterCheque, setFilterCheque] = useState('');
  const [filterUtr, setFilterUtr] = useState('');
  const [filterBillNo, setFilterBillNo] = useState('');
  const [filterInvoice, setFilterInvoice] = useState('');
  const [filterVendor, setFilterVendor] = useState('');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('hydraa_user');
    const token = localStorage.getItem('hydraa_token');
    if (!token && pathname !== '/login') {
      router.push('/login');
      return;
    }
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    // Load Financial Years
    api.get('/masters/financial-years').then((res) => {
      setFinancialYears(res.data);
      const savedFy = localStorage.getItem('hydraa_selected_fy');
      const current = res.data.find((f: any) => f.isCurrent);
      const validSaved = res.data.some((f: any) => String(f.id) === savedFy);
      const chosen = (validSaved && savedFy) ? savedFy : (current ? String(current.id) : (res.data.length > 0 ? String(res.data[0].id) : ''));
      setSelectedFy(chosen);
      if (chosen !== savedFy) {
        localStorage.setItem('hydraa_selected_fy', chosen);
      }
    }).catch(() => {});

    const onFyChange = (e: any) => setSelectedFy(e.detail);
    window.addEventListener('hydraa_fy_changed', onFyChange);
    return () => window.removeEventListener('hydraa_fy_changed', onFyChange);
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem('hydraa_token');
    localStorage.removeItem('hydraa_user');
    router.push('/login');
  };

  const executeSearch = async (overrideParams?: any) => {
    setIsSearching(true);
    setShowSearchModal(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      if (filterToken.trim()) params.append('tokenNumber', filterToken.trim());
      if (filterCheque.trim()) params.append('chequeNumber', filterCheque.trim());
      if (filterUtr.trim()) params.append('utrNumber', filterUtr.trim());
      if (filterBillNo.trim()) params.append('billNo', filterBillNo.trim());
      if (filterInvoice.trim()) params.append('invoiceNo', filterInvoice.trim());
      if (filterVendor.trim()) params.append('vendorName', filterVendor.trim());

      const res = await api.get(`/search/universal?${params.toString()}`);
      setSearchResults(res.data.results || []);
    } catch (err) {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch();
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterToken('');
    setFilterCheque('');
    setFilterUtr('');
    setFilterBillNo('');
    setFilterInvoice('');
    setFilterVendor('');
    setSearchResults([]);
  };

  const navItems = [
    { name: 'Financial Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Budget Management', href: '/budgets', icon: Wallet },
    { name: 'Bills & Vouchers', href: '/bills', icon: ReceiptText },
    { name: 'Vendors Master', href: '/vendors', icon: Users },
    { name: 'Treasury & Payments', href: '/payments', icon: CreditCard },
    { name: 'GST & TDS Register', href: '/gst-tds', icon: FileCheck2 },
    { name: 'Reports & Exports', href: '/reports', icon: FileSpreadsheet },
    { name: 'Masters Configuration', href: '/masters', icon: Layers, roles: ['SUPER_ADMIN', 'TREASURY_ADMIN'] },
    { name: 'User Management & Roles', href: '/users', icon: ShieldCheck, roles: ['SUPER_ADMIN'] },
    { name: 'Audit History', href: '/audit', icon: History, roles: ['SUPER_ADMIN', 'TREASURY_ADMIN', 'AUDITOR_READ_ONLY'] },
  ];

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col fixed inset-y-0 z-30 shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          {/* Official HYDRAA Logo in Sidebar */}
          <div className="w-12 h-12 bg-white rounded-lg p-1 flex items-center justify-center shrink-0 shadow">
            <img
              src="/logos/hydraa-logo.png"
              alt="HYDRAA"
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide text-white">HYDRAA TREASURY</h1>
            <p className="text-[12px] text-blue-400 font-medium">Govt of Telangana</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems
            .filter((item) => !item.roles || (user && item.roles.includes(user.role)))
            .map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] transition-all group ${
                    isActive
                      ? 'bg-blue-700 text-white shadow-md font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white font-medium'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition ${
                      isActive
                        ? 'bg-blue-800 text-white shadow-sm'
                        : 'bg-slate-800 text-blue-400 group-hover:bg-slate-700 group-hover:text-blue-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span>{item.name}</span>
                </Link>
              );
            })}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center justify-between">
            <div className="overflow-hidden">
              <p className="text-[13px] font-semibold text-white truncate">{user?.fullName || 'Treasury Officer'}</p>
              <p className="text-[11px] text-blue-400 font-mono uppercase">{user?.role?.replace('_', ' ') || 'STAFF'}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-red-400 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          {/* Universal Search & Advanced Filter Toggle */}
          <div className="flex items-center gap-2">
            <form onSubmit={handleSearchSubmit} className="relative w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search any: Bill No, Token, Cheque, UTR, Vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-[14px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </form>

            <button
              type="button"
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              className={`p-1.5 px-2.5 rounded-lg border text-[13px] font-medium flex items-center gap-1.5 transition ${
                showAdvancedSearch
                  ? 'bg-blue-50 text-blue-800 border-blue-300'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
              title="Toggle Advanced Search Filter Fields"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>
          </div>

          {/* Right Header: FY Selector & Telangana + HYDRAA Branding */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-[13px] font-medium text-slate-600">FY:</span>
              <select
                value={selectedFy}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedFy(val);
                  localStorage.setItem('hydraa_selected_fy', val);
                  window.dispatchEvent(new CustomEvent('hydraa_fy_changed', { detail: val }));
                }}
                className="bg-transparent text-[14px] font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                {financialYears.map((fy) => (
                  <option key={fy.id} value={fy.id}>
                    {fy.code} {fy.isCurrent ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Official Telangana Logo Badge */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="h-9 w-16 flex items-center justify-center p-0.5 bg-white rounded border border-slate-200 shadow-sm">
                <img
                  src="/logos/telangana-logo.png"
                  alt="Govt of Telangana"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Dropdown Advanced Filter Panel */}
        {showAdvancedSearch && (
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 shadow-inner">
            <div className="max-w-6xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-semibold text-slate-700 uppercase tracking-wide">
                  Advanced Reference Search (Any single field or combination valid):
                </span>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-[12px] text-slate-500 hover:text-slate-800 font-medium underline"
                >
                  Clear all filters
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                <div>
                  <label className="block text-[12px] font-medium text-slate-600 mb-0.5">Token Number</label>
                  <input
                    type="text"
                    placeholder="e.g. TOK-8891"
                    value={filterToken}
                    onChange={(e) => setFilterToken(e.target.value)}
                    className="w-full text-[13px] p-1.5 border border-slate-200 rounded bg-white font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-slate-600 mb-0.5">Cheque Number</label>
                  <input
                    type="text"
                    placeholder="e.g. CHQ-1002"
                    value={filterCheque}
                    onChange={(e) => setFilterCheque(e.target.value)}
                    className="w-full text-[13px] p-1.5 border border-slate-200 rounded bg-white font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-slate-600 mb-0.5">UTR Reference</label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-SBIN-001"
                    value={filterUtr}
                    onChange={(e) => setFilterUtr(e.target.value)}
                    className="w-full text-[13px] p-1.5 border border-slate-200 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-slate-600 mb-0.5">Bill Number</label>
                  <input
                    type="text"
                    placeholder="e.g. HYDRAA-BILL-..."
                    value={filterBillNo}
                    onChange={(e) => setFilterBillNo(e.target.value)}
                    className="w-full text-[13px] p-1.5 border border-slate-200 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-slate-600 mb-0.5">Invoice Number</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2024-..."
                    value={filterInvoice}
                    onChange={(e) => setFilterInvoice(e.target.value)}
                    className="w-full text-[13px] p-1.5 border border-slate-200 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-slate-600 mb-0.5">Vendor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Telangana..."
                    value={filterVendor}
                    onChange={(e) => setFilterVendor(e.target.value)}
                    className="w-full text-[13px] p-1.5 border border-slate-200 rounded bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-2.5">
                <button
                  type="button"
                  onClick={() => executeSearch()}
                  className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-[13px] font-semibold shadow flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Execute Filter Search</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="p-6 flex-1">{children}</main>
      </div>

      {/* Universal Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-[16px] text-slate-800">
                  Search & Filter Results ({searchResults.length} matches)
                </h3>
              </div>
              <button
                onClick={() => setShowSearchModal(false)}
                className="text-slate-400 hover:text-slate-600 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              {isSearching ? (
                <p className="text-center text-[13px] text-slate-500 py-6">Searching across Treasury records...</p>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[14px] font-semibold text-slate-700">No matching records found</p>
                  <p className="text-[12px] text-slate-500 mt-1">
                    Try searching by Token, Cheque, UTR, Bill No, or Vendor Name.
                  </p>
                </div>
              ) : (
                searchResults.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-50 hover:bg-blue-50/50 rounded-lg border border-slate-200/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 shrink-0">
                          {item.type}
                        </span>
                        <p className="text-[13.5px] font-semibold text-slate-900 break-words">{item.title}</p>
                      </div>
                      <p className="text-[12px] text-slate-500 mt-1 break-words leading-normal">{item.subtitle}</p>
                      {item.matchedFields?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {item.matchedFields.map((f: string, i: number) => (
                            <span key={i} className="text-[11px] px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded font-mono break-all">
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {item.amount && (
                      <span className="text-[13.5px] font-semibold text-blue-700 bg-white px-2.5 py-1 rounded border border-slate-200 tabular-nums shrink-0 self-start sm:self-center">
                        ₹ {Number(item.amount).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
