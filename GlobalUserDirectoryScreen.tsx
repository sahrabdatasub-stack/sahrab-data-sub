import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { usersApi } from '../../utils/api.ts';
import { 
  Users, 
  Search, 
  Filter, 
  Shield, 
  UserCheck, 
  UserX, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Lock, 
  Building2, 
  Calendar, 
  X,
  Eye,
  Activity,
  CreditCard
} from 'lucide-react';

interface DirectoryUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  position: string;
  assignedTeam: string;
  supervisorName: string;
  stateRegion: string;
  status: string;
  appointedAt: string;
  createdAt: string;
  walletBalance?: string;
  activitySummary?: {
    totalTransactions: number;
    totalVolume: number;
  };
  deactivatedAt?: string;
  deactivatedBy?: string;
  deactivationReason?: string;
  canDeactivate: boolean;
  removalRestrictionNote?: string;
}

export const GlobalUserDirectoryScreen: React.FC = () => {
  const { user: currentUser, showToast, refreshUser, isCeo } = useApp();

  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Dropdown options
  const [teams, setTeams] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);

  // Deactivation Modal State
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<DirectoryUser | null>(null);
  const [deactivationReason, setDeactivationReason] = useState('');
  const [isSubmittingDeactivation, setIsSubmittingDeactivation] = useState(false);

  // Reactivation Modal State
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
  const [reactivationReason, setReactivationReason] = useState('');

  // Selected User Detail Modal
  const [viewingUser, setViewingUser] = useState<DirectoryUser | null>(null);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadDirectory(page);
  }, [page, selectedPosition, selectedTeam, selectedState, selectedStatus, dateFrom, dateTo]);

  const loadFilterOptions = async () => {
    try {
      const res = await usersApi.getFilterOptions();
      if (res.success) {
        setTeams(res.teams || []);
        setStates(res.states || []);
      }
    } catch (err) {
      console.error('Failed to load filter options:', err);
    }
  };

  const loadDirectory = async (targetPage = page) => {
    setIsLoading(true);
    try {
      const res = await usersApi.getDirectory({
        page: targetPage,
        limit,
        search,
        position: selectedPosition,
        team: selectedTeam,
        state: selectedState,
        status: selectedStatus,
        dateFrom,
        dateTo,
      });

      if (res.success) {
        setUsers(res.directory || []);
        setTotalPages(res.pagination?.totalPages || 1);
        setTotalCount(res.pagination?.totalCount || 0);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load user directory.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadDirectory(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedPosition('');
    setSelectedTeam('');
    setSelectedState('');
    setSelectedStatus('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
    loadDirectory(1);
  };

  const openDeactivateModal = (u: DirectoryUser) => {
    setTargetUser(u);
    setDeactivationReason('');
    setIsDeactivateModalOpen(true);
  };

  const handleConfirmDeactivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser) return;

    if (!deactivationReason.trim()) {
      showToast('A documented reason is required for deactivation.', 'error');
      return;
    }

    setIsSubmittingDeactivation(true);
    try {
      const res = await usersApi.deactivateUser(targetUser.id, {
        reason: deactivationReason.trim(),
        confirmed: true,
      });

      if (res.success) {
        showToast(res.message || 'Account deactivated successfully.', 'success');
        setIsDeactivateModalOpen(false);
        setTargetUser(null);
        loadDirectory(page);
        refreshUser();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to deactivate account.', 'error');
    } finally {
      setIsSubmittingDeactivation(false);
    }
  };

  const handleConfirmReactivation = async (u: DirectoryUser) => {
    try {
      const res = await usersApi.reactivateUser(u.id, {
        reason: reactivationReason || 'Account restored by administrator',
      });
      if (res.success) {
        showToast(res.message || 'Account reactivated successfully.', 'success');
        setIsReactivateModalOpen(false);
        loadDirectory(page);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to reactivate account.', 'error');
    }
  };

  const getPositionBadge = (pos: string) => {
    switch (pos) {
      case 'FOUNDER_SUPER_ADMIN':
        return 'bg-purple-950/80 border-purple-500/50 text-purple-300';
      case 'ADMIN':
        return 'bg-rose-950/80 border-rose-500/50 text-rose-300';
      case 'STATE_MANAGER':
        return 'bg-amber-950/80 border-amber-500/50 text-amber-300';
      case 'TEAM_LEADER':
        return 'bg-blue-950/80 border-blue-500/50 text-blue-300';
      case 'AGENT':
        return 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300';
      case 'CUSTOMER':
      default:
        return 'bg-slate-800 border-slate-700 text-slate-300';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 pb-24 sm:pb-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-extrabold text-white tracking-tight">Global User Directory</h2>
          </div>
          <p className="text-xs text-slate-400">
            Real-time, cross-platform searchable directory of all registered customers, agents, and staff.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isCeo && (
            <span className="px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>CEO Account Controls Active</span>
            </span>
          )}
          <button
            onClick={() => loadDirectory(page)}
            disabled={isLoading}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl transition-colors"
            title="Refresh directory"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by full name, phone number, email, or user ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors shrink-0"
          >
            Search
          </button>
        </form>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-xs">
          {/* Position Filter */}
          <select
            value={selectedPosition}
            onChange={(e) => {
              setSelectedPosition(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Positions</option>
            <option value="CUSTOMER">Customers Only</option>
            <option value="AGENT">Agents Only</option>
            <option value="TEAM_LEADER">Team Leaders Only</option>
            <option value="STATE_MANAGER">State Managers Only</option>
            <option value="ADMIN">Admins Only</option>
            <option value="FOUNDER_SUPER_ADMIN">Founder / CEO Only</option>
          </select>

          {/* Team Filter */}
          <select
            value={selectedTeam}
            onChange={(e) => {
              setSelectedTeam(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Teams</option>
            {teams.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* State Filter */}
          <select
            value={selectedState}
            onChange={(e) => {
              setSelectedState(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All States</option>
            {states.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="deactivated">Deactivated</option>
            <option value="suspended">Suspended</option>
          </select>

          {/* Clear Filters */}
          <button
            type="button"
            onClick={handleClearFilters}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors text-center"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Directory Results Info */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <div>
          Showing <span className="text-white font-bold">{users.length}</span> of{' '}
          <span className="text-white font-bold">{totalCount}</span> registered users
        </div>
        <div>
          Page <span className="text-white font-bold">{page}</span> of{' '}
          <span className="text-white font-bold">{totalPages}</span>
        </div>
      </div>

      {/* Users Table / Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
            <p className="text-xs">Querying PostgreSQL user records...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-semibold">No registered users matched your search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">User Information</th>
                  <th className="py-3 px-4">Role / Position</th>
                  <th className="py-3 px-4">Team & Supervisor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Activity Summary</th>
                  <th className="py-3 px-4">Registration</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u) => {
                  const isCustomer = u.position === 'CUSTOMER';
                  const isDeactivated = u.status === 'deactivated';

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* User Information */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm flex items-center gap-1.5">
                          <span>{u.fullName}</span>
                          {u.id === currentUser?.id && (
                            <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          <span>{u.phone}</span> • <span>{u.email}</span>
                        </div>
                        <div className="text-[10px] font-mono text-emerald-400 select-all">
                          {u.id}
                        </div>
                      </td>

                      {/* Position Badge */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${getPositionBadge(u.position)}`}>
                          {u.position.replace(/_/g, ' ')}
                        </span>
                        {u.stateRegion && u.stateRegion !== 'National' && (
                          <div className="text-[10px] text-slate-400 mt-1">{u.stateRegion}</div>
                        )}
                      </td>

                      {/* Team & Supervisor */}
                      <td className="py-3.5 px-4 text-slate-300">
                        <div className="font-medium text-xs text-white">{u.assignedTeam || 'None'}</div>
                        <div className="text-[10px] text-slate-400">Sup: {u.supervisorName || 'Executive'}</div>
                      </td>

                      {/* Account Status */}
                      <td className="py-3.5 px-4">
                        {isDeactivated ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-rose-400 uppercase bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-800/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Deactivated
                            </span>
                            {u.deactivationReason && (
                              <div className="text-[9px] text-slate-400 truncate max-w-[120px]" title={u.deactivationReason}>
                                {u.deactivationReason}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        )}
                      </td>

                      {/* Activity Summary */}
                      <td className="py-3.5 px-4">
                        <div className="text-white font-bold text-xs">
                          {u.activitySummary?.totalTransactions || 0} orders
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ₦{(u.activitySummary?.totalVolume || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                        </div>
                      </td>

                      {/* Registration Date */}
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingUser(u)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                            title="View Full Profile & Financial Summary"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Removal / Deactivation Action Button */}
                          {u.canDeactivate ? (
                            <button
                              onClick={() => openDeactivateModal(u)}
                              className="px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-600/40 text-rose-300 hover:bg-rose-900/60 hover:text-white text-[11px] font-bold transition-all flex items-center gap-1 shadow-sm"
                            >
                              <UserX className="w-3 h-3" />
                              <span>Deactivate</span>
                            </button>
                          ) : (
                            /* Disabled button with clear lock icon and restriction note */
                            <button
                              disabled
                              className="px-2.5 py-1 rounded-lg bg-slate-800/40 border border-slate-800 text-slate-600 text-[11px] font-medium cursor-not-allowed flex items-center gap-1"
                              title={u.removalRestrictionNote || 'Unauthorized to deactivate this user'}
                            >
                              <Lock className="w-3 h-3 text-slate-600" />
                              <span>Locked</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Toolbar */}
        <div className="bg-slate-950/80 border-t border-slate-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Showing page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong> ({totalCount} total users)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-semibold transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <span className="px-3 py-1 font-mono text-emerald-400 font-bold bg-slate-900 rounded-lg border border-slate-800">
              {page} / {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-semibold transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL: DEACTIVATION DIALOG & REASON LOGGING                    */}
      {/* ============================================================== */}
      {isDeactivateModalOpen && targetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-rose-800/60 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setIsDeactivateModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <form onSubmit={handleConfirmDeactivation} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <div className="w-9 h-9 rounded-xl bg-rose-950/80 border border-rose-700/50 flex items-center justify-center text-rose-400">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {targetUser.position === 'CUSTOMER' ? 'CEO Customer Account Deactivation' : 'Deactivate Staff Account'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {targetUser.position === 'CUSTOMER'
                      ? 'Exclusive CEO privilege: Soft deactivation of customer access'
                      : 'Hierarchical staff suspension with immutable audit log'}
                  </p>
                </div>
              </div>

              {/* Target User Summary Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Target User:</span>
                  <span className="font-bold text-white">{targetUser.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Position / Role:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[10px] border ${getPositionBadge(targetUser.position)}`}>
                    {targetUser.position.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">User ID:</span>
                  <span className="font-mono text-emerald-400 select-all">{targetUser.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Wallet Liability:</span>
                  <span className="text-slate-200 font-bold">
                    {targetUser.walletBalance ? `₦${parseFloat(targetUser.walletBalance).toLocaleString()}` : 'Preserved'}
                  </span>
                </div>
              </div>

              {/* Preserved Data Security Assurance Banner */}
              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 text-[11px] text-emerald-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Financial & Audit Records Preserved</span>
                </div>
                <p className="text-slate-300">
                  This action is a soft deactivation. The database record is NEVER deleted. Customer wallet balances, transaction logs, receipts, KYC certificates, and audit histories remain 100% intact.
                </p>
              </div>

              {/* Mandatory Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Documented Operational Reason <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={deactivationReason}
                  onChange={(e) => setDeactivationReason(e.target.value)}
                  placeholder="Enter the official reason for deactivation (e.g. customer requested closure, compliance violation, fraud investigation)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDeactivateModalOpen(false)}
                  disabled={isSubmittingDeactivation}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDeactivation}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2"
                >
                  {isSubmittingDeactivation ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deactivating Account...</span>
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
      {/* MODAL: VIEW DETAILED USER PROFILE                             */}
      {/* ============================================================== */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative my-8 space-y-4">
            <button
              onClick={() => setViewingUser(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-emerald-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">{viewingUser.fullName}</h3>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold border mt-1 ${getPositionBadge(viewingUser.position)}`}>
                  {viewingUser.position.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">User ID:</span>
                  <span className="font-mono text-emerald-400">{viewingUser.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Phone:</span>
                  <span className="text-white font-medium">{viewingUser.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Email:</span>
                  <span className="text-white font-medium">{viewingUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Assigned Team:</span>
                  <span className="text-white">{viewingUser.assignedTeam}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Supervisor:</span>
                  <span className="text-white">{viewingUser.supervisorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">State / Region:</span>
                  <span className="text-white">{viewingUser.stateRegion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Registration Date:</span>
                  <span className="text-white">{new Date(viewingUser.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Financial & Activity Summary */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Account Balances & Operations</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Wallet Balance:</span>
                  <span className="font-bold text-emerald-400">
                    {viewingUser.walletBalance === 'Protected' ? 'Protected by Privacy Policy' : `₦${parseFloat(viewingUser.walletBalance || '0').toLocaleString()}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Transactions:</span>
                  <span className="font-bold text-white">{viewingUser.activitySummary?.totalTransactions || 0} completed</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Gross Sales Volume:</span>
                  <span className="font-bold text-white">
                    ₦{(viewingUser.activitySummary?.totalVolume || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {viewingUser.status === 'deactivated' && (
                <div className="bg-rose-950/40 border border-rose-800/50 p-3 rounded-xl text-[11px] text-rose-300 space-y-1">
                  <div className="font-bold flex items-center gap-1 text-rose-400">
                    <UserX className="w-3.5 h-3.5" />
                    <span>Account Deactivated</span>
                  </div>
                  <div>Reason: "{viewingUser.deactivationReason || 'Administrative decision'}"</div>
                  <div>Date: {viewingUser.deactivatedAt ? new Date(viewingUser.deactivatedAt).toLocaleString() : 'N/A'}</div>

                  {(isCeo || currentUser?.position === 'ADMIN') && (
                    <button
                      onClick={() => handleConfirmReactivation(viewingUser)}
                      className="mt-2 w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      Reactivate Account
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setViewingUser(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
