import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { ceoApi, usersApi } from '../../utils/api.ts';
import { 
  Shield, 
  TrendingUp, 
  Users, 
  Wallet, 
  Building2, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  CreditCard, 
  UserCheck, 
  UserX, 
  Clock, 
  RefreshCw, 
  Lock, 
  ChevronRight, 
  Calendar, 
  Sparkles, 
  Send,
  X,
  Search,
  RotateCcw,
  UserMinus
} from 'lucide-react';

export const CeoDashboardScreen: React.FC = () => {
  const { user, showToast, refreshUser, setActiveTab } = useApp();

  // Active sub-tab: 'overview' | 'financials' | 'organization' | 'customers' | 'payroll' | 'audit'
  const [activeTab, setActiveSubTab] = useState<'overview' | 'financials' | 'organization' | 'customers' | 'payroll' | 'audit'>('overview');

  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [financials, setFinancials] = useState<any>(null);
  const [orgData, setOrgData] = useState<any>(null);
  const [payrollData, setPayrollData] = useState<any>(null);
  const [auditData, setAuditData] = useState<any>(null);

  // Customer Management state
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerLoading, setIsCustomerLoading] = useState(false);

  // Payroll modal state
  const [selectedPayroll, setSelectedPayroll] = useState<any>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [disbursementMethod, setDisbursementMethod] = useState('Direct Bank NIP Transfer');
  const [isDisbursing, setIsDisbursing] = useState(false);

  // Customer Deactivation Modal state
  const [deactivateCustModal, setDeactivateCustModal] = useState(false);
  const [targetCustomer, setTargetCustomer] = useState<any>(null);
  const [custDeactReason, setCustDeactReason] = useState('');
  const [isDeactivatingCust, setIsDeactivatingCust] = useState(false);

  // Revoke Staff Privileges Modal state
  const [revokeStaffModal, setRevokeStaffModal] = useState(false);
  const [targetStaff, setTargetStaff] = useState<any>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [isRevokingStaff, setIsRevokingStaff] = useState(false);

  useEffect(() => {
    loadAllCeoData();
  }, []);

  useEffect(() => {
    if (activeTab === 'customers') {
      loadCustomers();
    }
  }, [activeTab]);

  const loadAllCeoData = async () => {
    setIsLoading(true);
    try {
      const [ovRes, finRes, orgRes, payRes, audRes] = await Promise.all([
        ceoApi.getOverview(),
        ceoApi.getFinancials(),
        ceoApi.getOrganization(),
        ceoApi.getPayroll(),
        ceoApi.getAuditLogs(),
      ]);

      if (ovRes.success) setOverview(ovRes.overview);
      if (finRes.success) setFinancials(finRes.financials);
      if (orgRes.success) setOrgData(orgRes);
      if (payRes.success) setPayrollData(payRes);
      if (audRes.success) setAuditData(audRes);
    } catch (err: any) {
      showToast(err.message || 'Failed to load CEO dashboard data.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomers = async () => {
    setIsCustomerLoading(true);
    try {
      const res = await ceoApi.getCustomers(customerSearch);
      if (res.success) {
        setCustomers(res.customers || []);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load customer list.', 'error');
    } finally {
      setIsCustomerLoading(false);
    }
  };

  const handleSearchCustomers = (e: React.FormEvent) => {
    e.preventDefault();
    loadCustomers();
  };

  const handleApprovePayroll = async (record: any) => {
    try {
      const res = await ceoApi.approvePayroll(record.id, `Executive CEO Approval on ${new Date().toLocaleDateString()}`);
      if (res.success) {
        showToast(res.message || 'Payroll approved!', 'success');
        const [payRes, finRes] = await Promise.all([ceoApi.getPayroll(), ceoApi.getFinancials()]);
        if (payRes.success) setPayrollData(payRes);
        if (finRes.success) setFinancials(finRes.financials);
      }
    } catch (err: any) {
      showToast(err.message || 'Approval failed.', 'error');
    }
  };

  const handleDisbursePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayroll) return;
    if (!paymentReference.trim()) {
      showToast('A verified bank payment or NIP reference is strictly required.', 'error');
      return;
    }

    setIsDisbursing(true);
    try {
      const res = await ceoApi.disbursePayroll(selectedPayroll.id, {
        paymentReference: paymentReference.trim(),
        disbursementMethod,
      });

      if (res.success) {
        showToast(res.message || 'Payment recorded successfully!', 'success');
        setSelectedPayroll(null);
        setPaymentReference('');
        const [payRes, finRes] = await Promise.all([ceoApi.getPayroll(), ceoApi.getFinancials()]);
        if (payRes.success) setPayrollData(payRes);
        if (finRes.success) setFinancials(finRes.financials);
      }
    } catch (err: any) {
      showToast(err.message || 'Payment recording failed.', 'error');
    } finally {
      setIsDisbursing(false);
    }
  };

  const handleConfirmCustomerDeactivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCustomer) return;
    if (!custDeactReason.trim()) {
      showToast('Documented reason is required.', 'error');
      return;
    }

    setIsDeactivatingCust(true);
    try {
      const res = await usersApi.deactivateUser(targetCustomer.id, {
        reason: custDeactReason.trim(),
        confirmed: true,
      });

      if (res.success) {
        showToast(res.message || 'Customer deactivated successfully. Financial records preserved.', 'success');
        setDeactivateCustModal(false);
        setTargetCustomer(null);
        setCustDeactReason('');
        loadCustomers();
        loadAllCeoData();
      }
    } catch (err: any) {
      showToast(err.message || 'Deactivation failed.', 'error');
    } finally {
      setIsDeactivatingCust(false);
    }
  };

  const handleReactivateCustomer = async (cust: any) => {
    try {
      const res = await usersApi.reactivateUser(cust.id, {
        reason: `Account reactivated by Founder & CEO on ${new Date().toLocaleDateString()}`,
      });
      if (res.success) {
        showToast(res.message || 'Customer reactivated successfully.', 'success');
        loadCustomers();
        loadAllCeoData();
      }
    } catch (err: any) {
      showToast(err.message || 'Reactivation failed.', 'error');
    }
  };

  const handleConfirmRevokeStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStaff) return;

    setIsRevokingStaff(true);
    try {
      const res = await ceoApi.revokeStaff(targetStaff.id, revokeReason.trim() || 'Staff permissions revoked by CEO executive action');
      if (res.success) {
        showToast(res.message || 'Staff permissions revoked successfully.', 'success');
        setRevokeStaffModal(false);
        setTargetStaff(null);
        setRevokeReason('');
        loadAllCeoData();
      }
    } catch (err: any) {
      showToast(err.message || 'Staff revocation failed.', 'error');
    } finally {
      setIsRevokingStaff(false);
    }
  };

  if (!user || user.position !== 'FOUNDER_SUPER_ADMIN') {
    return (
      <div className="p-8 text-center text-slate-400">
        <Lock className="w-10 h-10 mx-auto text-rose-500 mb-2" />
        <h3 className="text-lg font-bold text-white">Access Denied</h3>
        <p className="text-xs">This executive dashboard is strictly restricted to the authenticated Founder & CEO.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 pb-24 sm:pb-8">
      {/* Top CEO Executive Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-950 via-slate-900 to-slate-950 border border-purple-500/40 p-6 text-white shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-900/80 border border-purple-400/50 flex items-center justify-center text-purple-200 shadow-inner">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-purple-300">
                  EXECUTIVE GOVERNANCE CONSOLE
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-[10px] font-bold text-purple-300">
                  CEO / FOUNDER
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                SAHRAB DATA SUB Executive Control Center
              </h1>
              <p className="text-xs text-slate-400">
                Company-wide reconciliation, organizational hierarchy, payroll approval, and audit governance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAllCeoData}
              disabled={isLoading}
              className="px-3.5 py-2 bg-purple-900/60 hover:bg-purple-800/80 border border-purple-500/40 text-purple-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Metrics</span>
            </button>
          </div>
        </div>

        {/* Quick Navigation Tabs inside CEO Console */}
        <div className="flex items-center gap-1.5 mt-6 pt-4 border-t border-purple-500/20 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-purple-300 hover:bg-purple-900/40'
            }`}
          >
            1. Company Overview
          </button>

          <button
            onClick={() => setActiveSubTab('financials')}
            className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'financials'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-purple-300 hover:bg-purple-900/40'
            }`}
          >
            2. Financial Overview
          </button>

          <button
            onClick={() => setActiveSubTab('organization')}
            className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'organization'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-purple-300 hover:bg-purple-900/40'
            }`}
          >
            3. Organization Management
          </button>

          <button
            onClick={() => setActiveSubTab('customers')}
            className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'customers'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-purple-300 hover:bg-purple-900/40'
            }`}
          >
            4. Customer Management
          </button>

          <button
            onClick={() => setActiveSubTab('payroll')}
            className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'payroll'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-purple-300 hover:bg-purple-900/40'
            }`}
          >
            5. Payroll & Commission
          </button>

          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-purple-300 hover:bg-purple-900/40'
            }`}
          >
            6. Security & Audit
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-purple-400 mb-2" />
          <p className="text-xs">Aggregating executive records from PostgreSQL...</p>
        </div>
      ) : (
        <>
          {/* ============================================================== */}
          {/* 1. COMPANY OVERVIEW                                            */}
          {/* ============================================================== */}
          {activeTab === 'overview' && overview && (
            <div className="space-y-6">
              {/* Primary User Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Total Users</div>
                  <div className="text-2xl font-black text-white mt-1">{overview.totalUsers}</div>
                  <div className="text-[9px] text-emerald-400 mt-0.5">{overview.activeUsers} active</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Customers</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">{overview.customers}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">End users</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Sales Agents</div>
                  <div className="text-2xl font-black text-teal-400 mt-1">{overview.agents}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Resellers</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Team Leaders</div>
                  <div className="text-2xl font-black text-blue-400 mt-1">{overview.teamLeaders}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Field leads</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">State Managers</div>
                  <div className="text-2xl font-black text-amber-400 mt-1">{overview.stateManagers}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Territories</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Admins</div>
                  <div className="text-2xl font-black text-rose-400 mt-1">{overview.admins}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Operations</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Active Teams</div>
                  <div className="text-2xl font-black text-purple-400 mt-1">{overview.totalTeams}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Branches</div>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Executive Governance Operations</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <button
                    onClick={() => setActiveSubTab('customers')}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/40 text-left transition-colors group"
                  >
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span>Customer Management</span>
                      <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Manage {overview.customers} customers with CEO deactivation authority.
                    </p>
                  </button>

                  <button
                    onClick={() => setActiveTab('all-users')}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500/40 text-left transition-colors group"
                  >
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span>Global User Directory</span>
                      <ChevronRight className="w-4 h-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Search all {overview.totalUsers} platform accounts with activity metrics.
                    </p>
                  </button>

                  <button
                    onClick={() => setActiveTab('positions')}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500/40 text-left transition-colors group"
                  >
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span>Staff Position Appointments</span>
                      <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Appoint Admins, State Managers, Team Leaders, and review historical logs.
                    </p>
                  </button>

                  <button
                    onClick={() => setActiveSubTab('payroll')}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 text-left transition-colors group"
                  >
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span>Executive Payroll Review</span>
                      <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Review, authorize, and record staff salaries & sales commissions with payment proof.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 2. FINANCIAL OVERVIEW & RECONCILIATION                         */}
          {/* ============================================================== */}
          {activeTab === 'financials' && financials && (
            <div className="space-y-6">
              {/* Top Financial Formula Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Completed Sales Volume */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Completed Sales Volume</div>
                  <div className="text-2xl font-black text-white mt-1">
                    ₦{financials.completedSalesVolume.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-1">
                    {financials.completedSalesCount} verified sales transactions
                  </div>
                </div>

                {/* Recorded Provider Costs */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Recorded Provider Costs</div>
                  <div className="text-2xl font-black text-rose-300 mt-1">
                    ₦{financials.recordedProviderCosts.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Telco SME & bandwidth costs</div>
                </div>

                {/* Gross Margin */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Gross Margin</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">
                    ₦{financials.grossMargin.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Revenue minus provider costs</div>
                </div>

                {/* Net Operating Result */}
                <div className="bg-slate-900 border border-purple-500/40 rounded-2xl p-4 shadow-md bg-gradient-to-br from-purple-950/40 to-slate-900">
                  <div className="text-[10px] uppercase font-bold text-purple-300">Net Operating Result</div>
                  <div className={`text-2xl font-black mt-1 ${financials.netOperatingResult >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ₦{financials.netOperatingResult.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-purple-300 mt-1">After payroll, commissions & expenses</div>
                </div>
              </div>

              {/* Accounting Safeguard: Customer Wallet Liabilities Banner */}
              <div className="bg-amber-950/40 border border-amber-500/50 rounded-2xl p-5 shadow-lg space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  <h4 className="text-sm font-extrabold text-amber-200">Customer Wallet Liabilities Notice</h4>
                </div>
                <div className="text-2xl font-black text-white">
                  ₦{financials.customerWalletLiabilities.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-amber-300/80 leading-relaxed">
                  {financials.accountingNotice} These funds are stored consumer balances available for instant data or airtime purchases and must never be treated as company cash flow.
                </p>
              </div>

              {/* Expense & Cost Reconciliations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span>Compensation Deductions</span>
                  </h4>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between p-2.5 bg-slate-950 rounded-xl">
                      <span className="text-slate-400">Approved Staff Payroll:</span>
                      <span className="font-bold text-white">
                        ₦{financials.approvedPayroll.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between p-2.5 bg-slate-950 rounded-xl">
                      <span className="text-slate-400">Pending Payroll Under Review:</span>
                      <span className="font-bold text-amber-400">
                        ₦{financials.pendingPayroll.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between p-2.5 bg-slate-950 rounded-xl">
                      <span className="text-slate-400">Approved Agent Commissions:</span>
                      <span className="font-bold text-white">
                        ₦{financials.approvedCommissions.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    <span>Recorded Operating Expenses</span>
                  </h4>

                  <div className="space-y-2 text-xs">
                    {financials.expensesBreakdown?.map((exp: any) => (
                      <div key={exp.id} className="flex justify-between p-2.5 bg-slate-950 rounded-xl">
                        <div>
                          <div className="font-bold text-white">{exp.title}</div>
                          <div className="text-[10px] text-slate-400">{exp.category} • {exp.month}</div>
                        </div>
                        <div className="text-right font-black text-rose-300">
                          ₦{parseFloat(exp.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 3. ORGANIZATION MANAGEMENT                                      */}
          {/* ============================================================== */}
          {activeTab === 'organization' && orgData && (
            <div className="space-y-6">
              {/* Teams Overview */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-purple-400" />
                      <span>Company Branches & Teams</span>
                    </h3>
                    <p className="text-xs text-slate-400">Regional teams, branch leaders, and member distribution counts.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {orgData.teams?.map((t: any) => (
                    <div key={t.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="font-bold text-white text-sm">{t.name}</div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 font-bold border border-emerald-500/30">
                          {t.state}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        Leader: <strong className="text-slate-200">{t.teamLeaderName}</strong>
                      </div>
                      <div className="flex justify-between text-xs pt-2 border-t border-slate-800">
                        <span className="text-slate-400">Members:</span>
                        <span className="font-bold text-white">{t.memberCount} staff/agents</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Monthly Target:</span>
                        <span className="font-bold text-emerald-400">₦{t.monthlyTarget.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Staff Roster with Permission Revocation */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-400" />
                      <span>Authorized Staff Roster ({orgData.staff?.length || 0})</span>
                    </h3>
                    <p className="text-xs text-slate-400">Active appointed staff members across all hierarchy positions.</p>
                  </div>

                  <button
                    onClick={() => setActiveTab('positions')}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-colors self-start sm:self-auto"
                  >
                    Appoint / Modify Staff Position
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-400">
                        <th className="py-2.5 px-3">Staff Name</th>
                        <th className="py-2.5 px-3">Position</th>
                        <th className="py-2.5 px-3">Assigned Team</th>
                        <th className="py-2.5 px-3">Supervisor</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {orgData.staff?.map((s: any) => {
                        const isSelf = s.id === user.id;
                        return (
                          <tr key={s.id} className="hover:bg-slate-800/40">
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-white">{s.fullName}</div>
                              <div className="text-[10px] text-slate-400">{s.phone}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-800 text-slate-200 border border-slate-700">
                                {s.position.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-300">{s.assignedTeam}</td>
                            <td className="py-2.5 px-3 text-slate-300">{s.supervisorName}</td>
                            <td className="py-2.5 px-3">
                              <span className="text-emerald-400 font-bold uppercase text-[10px]">{s.status}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {!isSelf && s.position !== 'CUSTOMER' && (
                                <button
                                  onClick={() => {
                                    setTargetStaff(s);
                                    setRevokeReason('');
                                    setRevokeStaffModal(true);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-[11px] font-bold transition-colors inline-flex items-center gap-1"
                                >
                                  <UserMinus className="w-3 h-3" />
                                  <span>Revoke Privileges</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Role-Assignment History */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span>Recent Role Appointments & Modifications History</span>
                </h3>

                <div className="space-y-2">
                  {orgData.recentAppointments?.map((hist: any) => (
                    <div key={hist.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="font-bold text-white">
                          {hist.user_name}
                          <span className="text-slate-400 font-normal ml-2">
                            ({hist.previous_position ? hist.previous_position.replace(/_/g, ' ') : 'None'} → <span className="text-purple-300 font-bold">{hist.new_position.replace(/_/g, ' ')}</span>)
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Appointed by: <strong className="text-slate-300">{hist.action_by_name}</strong> • Reason: {hist.reason || 'Not specified'}
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-500 shrink-0">
                        {new Date(hist.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 4. CUSTOMER MANAGEMENT (CEO-ONLY DEACTIVATION)                 */}
          {/* ============================================================== */}
          {activeTab === 'customers' && (
            <div className="space-y-6">
              {/* Customer Directory Header */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-400" />
                      <span>Executive Customer Accounts Directory</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      View all registered customer accounts. Deactivation is strictly CEO-authorized and preserves transaction history.
                    </p>
                  </div>

                  <form onSubmit={handleSearchCustomers} className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search name, phone, email..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-52 sm:w-64"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isCustomerLoading}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      Search
                    </button>
                  </form>
                </div>

                {/* Regulatory Safeguard Notice */}
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <Shield className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>
                    <strong>CEO Exclusive Authority:</strong> Customer accounts may only be deactivated by the Founder & CEO with documented reasoning. Financial transaction logs and KYC documentation are immutably preserved.
                  </span>
                </div>

                {isCustomerLoading ? (
                  <div className="p-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                    <p className="text-xs">Loading customer records...</p>
                  </div>
                ) : customers.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 text-xs">
                    No customer accounts found matching your query.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-400">
                          <th className="py-2.5 px-3">Customer</th>
                          <th className="py-2.5 px-3">Contact</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Wallet Balance</th>
                          <th className="py-2.5 px-3">KYC</th>
                          <th className="py-2.5 px-3">Purchases</th>
                          <th className="py-2.5 px-3">Registered</th>
                          <th className="py-2.5 px-3 text-right">CEO Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {customers.map((c) => {
                          const isDeactivated = c.status === 'deactivated';
                          return (
                            <tr key={c.id} className="hover:bg-slate-800/40">
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-white">{c.fullName}</div>
                                <div className="text-[10px] font-mono text-slate-400">{c.id}</div>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="text-slate-200">{c.phone}</div>
                                <div className="text-[10px] text-slate-400">{c.email}</div>
                              </td>
                              <td className="py-2.5 px-3">
                                {isDeactivated ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/60 text-rose-300 border border-rose-500/30">
                                    Deactivated
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                                    Active
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-emerald-400">
                                  ₦{c.walletBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="text-[10px] uppercase font-bold text-slate-400">
                                  {c.kycStatus || 'unverified'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="text-slate-200">{c.totalTransactions} orders</div>
                                <div className="text-[10px] text-slate-400">₦{c.totalVolume.toLocaleString()}</div>
                              </td>
                              <td className="py-2.5 px-3 text-slate-400 text-[10px]">
                                {new Date(c.createdAt).toLocaleDateString()}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {isDeactivated ? (
                                  <button
                                    onClick={() => handleReactivateCustomer(c)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold transition-colors inline-flex items-center gap-1"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Reactivate</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setTargetCustomer(c);
                                      setCustDeactReason('');
                                      setDeactivateCustModal(true);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-[11px] font-bold transition-colors inline-flex items-center gap-1"
                                  >
                                    <UserX className="w-3 h-3" />
                                    <span>Deactivate</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 5. PAYROLL & COMMISSION MANAGEMENT                             */}
          {/* ============================================================== */}
          {activeTab === 'payroll' && payrollData && (
            <div className="space-y-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Total Payroll Records</div>
                  <div className="text-2xl font-black text-white mt-1">{payrollData.summary?.totalRecords}</div>
                </div>

                <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 text-center">
                  <div className="text-[10px] uppercase font-bold text-amber-300">Pending CEO Approval</div>
                  <div className="text-2xl font-black text-amber-400 mt-1">{payrollData.summary?.pendingCount}</div>
                </div>

                <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-4 text-center">
                  <div className="text-[10px] uppercase font-bold text-blue-300">Approved for Payment</div>
                  <div className="text-2xl font-black text-blue-400 mt-1">{payrollData.summary?.approvedCount}</div>
                </div>

                <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 text-center">
                  <div className="text-[10px] uppercase font-bold text-emerald-300">Disbursed / Paid</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">{payrollData.summary?.paidCount}</div>
                </div>
              </div>

              {/* Payroll Records List */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-purple-400" />
                      <span>Executive Payroll Roster & Disbursal</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      CEO must approve before payment. Marking paid strictly requires verified bank reference evidence.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {payrollData.records?.map((record: any) => {
                    const isPending = record.status === 'PENDING_APPROVAL';
                    const isApproved = record.status === 'APPROVED';
                    const isPaid = record.status === 'PAID';

                    return (
                      <div
                        key={record.id}
                        className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{record.staffName}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                              {record.role.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] text-slate-400">Month: {record.month}</span>
                          </div>

                          <div className="text-xs text-slate-400 flex items-center gap-3 flex-wrap">
                            <span>Base: <strong>₦{record.baseSalary.toLocaleString()}</strong></span>
                            <span>Commissions: <strong className="text-emerald-400">₦{record.commissionsEarned.toLocaleString()}</strong></span>
                            <span>Bonuses: <strong>₦{record.bonuses.toLocaleString()}</strong></span>
                            <span>Deductions: <strong className="text-rose-400">-₦{record.deductions.toLocaleString()}</strong></span>
                          </div>

                          {record.paymentReference && (
                            <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/20 inline-block">
                              Ref: {record.paymentReference} {record.paidAt && `(Paid ${new Date(record.paidAt).toLocaleDateString()})`}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="text-[10px] text-slate-400 uppercase font-bold">Net Payable</div>
                            <div className="text-base font-black text-white">
                              ₦{record.netPay.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                            </div>
                          </div>

                          {/* Approval / Disbursal Actions */}
                          {isPending && (
                            <button
                              onClick={() => handleApprovePayroll(record)}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors shadow-sm"
                            >
                              Approve Payroll
                            </button>
                          )}

                          {isApproved && (
                            <button
                              onClick={() => {
                                setSelectedPayroll(record);
                                setPaymentReference('');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Record Payment</span>
                            </button>
                          )}

                          {isPaid && (
                            <span className="px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Paid & Verified</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 6. SECURITY & AUDIT FEED                                       */}
          {/* ============================================================== */}
          {activeTab === 'audit' && auditData && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Lock className="w-4 h-4 text-purple-400" />
                      <span>Security & Operational Audit Logs</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Immutable record of all administrative appointments, status deactivations, and payroll decisions.
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {auditData.adminAuditLogs?.map((log: any) => (
                    <div key={log.id} className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-purple-400">{log.action}</span>
                        <span className="text-[10px] text-slate-500">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      <div className="text-slate-300 text-[11px]">
                        Admin ID: <strong className="text-white">{log.admin_id}</strong> • Target ID: <strong className="text-white">{log.target_id}</strong>
                      </div>
                      {log.details && (
                        <pre className="text-[10px] font-mono text-slate-400 bg-slate-900/60 p-2 rounded overflow-x-auto">
                          {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============================================================== */}
      {/* MODAL: RECORD PAYROLL PAYMENT WITH NIP/BANK EVIDENCE           */}
      {/* ============================================================== */}
      {selectedPayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setSelectedPayroll(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <form onSubmit={handleDisbursePayroll} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-extrabold text-white">Record Verified Payroll Payment</h3>
                  <p className="text-xs text-slate-400">Strict evidence-based payment ledger entry</p>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Staff Member:</span>
                  <span className="font-bold text-white">{selectedPayroll.staffName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Net Amount:</span>
                  <span className="font-black text-emerald-400 text-sm">
                    ₦{selectedPayroll.netPay.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pay Period:</span>
                  <span className="text-white">{selectedPayroll.month}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Bank / NIP Transaction Reference <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. NIP-20261021-99881122 or WEMA-TX-44552"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Disbursement Method</label>
                <select
                  value={disbursementMethod}
                  onChange={(e) => setDisbursementMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Direct Bank NIP Transfer">Direct Bank NIP Transfer</option>
                  <option value="Wema Bank Corporate Portal">Wema Bank Corporate Portal</option>
                  <option value="Monnify Bulk Disbursement">Monnify Bulk Disbursement</option>
                  <option value="Audited Manual Wire Payout">Audited Manual Wire Payout</option>
                </select>
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Never mark as paid without authentic provider confirmation.</span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedPayroll(null)}
                  disabled={isDisbursing}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isDisbursing}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2"
                >
                  {isDisbursing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm & Mark Paid</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CEO-ONLY CUSTOMER DEACTIVATION (SAFEGUARD CONFIRMATION) */}
      {/* ============================================================== */}
      {deactivateCustModal && targetCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl relative my-8">
            <button
              onClick={() => {
                setDeactivateCustModal(false);
                setTargetCustomer(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <form onSubmit={handleConfirmCustomerDeactivation} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <div>
                  <h3 className="text-base font-extrabold text-white">CEO Customer Deactivation</h3>
                  <p className="text-xs text-rose-300">Executive Account Suspension</p>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Customer:</span>
                  <span className="font-bold text-white">{targetCustomer.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Phone:</span>
                  <span className="text-slate-200">{targetCustomer.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Wallet Balance:</span>
                  <span className="font-bold text-emerald-400">
                    ₦{targetCustomer.walletBalance?.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="bg-amber-950/30 border border-amber-500/30 p-3 rounded-xl text-[11px] text-amber-300 leading-relaxed space-y-1">
                <strong>Accounting & Record Preservation:</strong>
                <p>
                  Deactivating this customer account suspends login and purchase privileges, but does <strong>NOT</strong> delete the user, wallet balance, transaction history, or KYC records.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Reason for Deactivation <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Document specific security violation, chargeback fraud, or compliance reason..."
                  value={custDeactReason}
                  onChange={(e) => setCustDeactReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setDeactivateCustModal(false);
                    setTargetCustomer(null);
                  }}
                  disabled={isDeactivatingCust}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isDeactivatingCust}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2"
                >
                  {isDeactivatingCust ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deactivating...</span>
                    </>
                  ) : (
                    <>
                      <UserX className="w-3.5 h-3.5" />
                      <span>Confirm Deactivation</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: REVOKE STAFF PERMISSIONS (CEO ONLY)                     */}
      {/* ============================================================== */}
      {revokeStaffModal && targetStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl relative my-8">
            <button
              onClick={() => {
                setRevokeStaffModal(false);
                setTargetStaff(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <form onSubmit={handleConfirmRevokeStaff} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <UserMinus className="w-5 h-5 text-rose-400" />
                <div>
                  <h3 className="text-base font-extrabold text-white">Revoke Staff Permissions</h3>
                  <p className="text-xs text-rose-300">Revert staff role to Customer</p>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Staff Member:</span>
                  <span className="font-bold text-white">{targetStaff.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Position:</span>
                  <span className="font-bold text-purple-400">{targetStaff.position.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Assigned Team:</span>
                  <span className="text-slate-200">{targetStaff.assignedTeam}</span>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-[11px] text-slate-300 leading-relaxed">
                Revoking privileges immediately removes dashboard access, supervisory duties, and field management rights. The account remains active as a standard Customer.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Reason for Revocation
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. End of tenure, role realignment, or performance inquiry..."
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setRevokeStaffModal(false);
                    setTargetStaff(null);
                  }}
                  disabled={isRevokingStaff}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isRevokingStaff}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2"
                >
                  {isRevokingStaff ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Revoking...</span>
                    </>
                  ) : (
                    <>
                      <UserMinus className="w-3.5 h-3.5" />
                      <span>Revoke Privileges</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
