import React, { useState, useEffect } from 'react';
import { useApp, PositionCode } from '../../context/AppContext.tsx';
import { positionApi } from '../../utils/api.ts';
import { 
  Users, 
  Shield, 
  Search, 
  Filter, 
  UserCheck, 
  UserPlus, 
  Clock, 
  History, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  RefreshCw, 
  X,
  ChevronDown
} from 'lucide-react';

interface UserRecord {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  position: PositionCode;
  assignedTeam: string;
  supervisorId?: string;
  supervisorName: string;
  stateRegion: string;
  status: string;
  appointedAt: string;
  createdAt: string;
  walletBalance: string;
  commissionBalance: string;
}

interface HistoryRecord {
  id: string;
  userId: string;
  userName: string;
  previousPosition: string;
  newPosition: string;
  adminId: string;
  adminName: string;
  appointmentDate: string;
  reason: string;
  stateRegion?: string;
  assignedTeam?: string;
  createdAt: string;
}

interface TeamRecord {
  id: string;
  name: string;
  state: string;
  teamLeaderName?: string;
}

export const PositionManagementScreen: React.FC = () => {
  const { user: currentUser, showToast, refreshUser } = useApp();

  // Tab: 'users' or 'history'
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'history'>('users');

  // User list state
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [search, setSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Teams & hierarchy
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [assignablePositions, setAssignablePositions] = useState<string[]>([]);

  // History state
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Modal: Assign Position
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

  // Form fields
  const [targetUserId, setTargetUserId] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [assignedTeam, setAssignedTeam] = useState('');
  const [stateRegion, setStateRegion] = useState('');
  const [supervisorName, setSupervisorName] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');

  // Confirmation modal step
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load initial metadata
  useEffect(() => {
    loadHierarchyAndTeams();
    loadUsers();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'history') {
      loadHistory();
    }
  }, [activeSubTab]);

  const loadHierarchyAndTeams = async () => {
    try {
      const hierRes = await positionApi.getHierarchy();
      if (hierRes.success) {
        setAssignablePositions(hierRes.assignablePositions || []);
      }
      const teamsRes = await positionApi.getTeams();
      if (teamsRes.success) {
        setTeams(teamsRes.teams || []);
      }
    } catch (err: any) {
      console.error('Failed to load hierarchy or teams:', err);
    }
  };

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await positionApi.getUsers({
        search,
        position: positionFilter,
      });
      if (res.success) {
        setUsers(res.users || []);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch user directory.', 'error');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await positionApi.getHistory();
      if (res.success) {
        setHistory(res.history || []);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load assignment history.', 'error');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleOpenAssignModal = (target?: UserRecord) => {
    const userToAssign = target || users[0] || null;
    setSelectedUser(userToAssign);
    setTargetUserId(userToAssign?.id || '');
    setNewPosition(assignablePositions[0] || 'AGENT');
    setAssignedTeam(userToAssign?.assignedTeam || (teams[0]?.name || 'Retail Distribution'));
    setStateRegion(userToAssign?.stateRegion || 'Kano');
    setSupervisorName(currentUser?.fullName || 'SAHRAB Administration');
    setEffectiveDate(new Date().toISOString().split('T')[0]);
    setReason('');
    setIsConfirming(false);
    setIsModalOpen(true);
  };

  const handleUserSelectChange = (userId: string) => {
    setTargetUserId(userId);
    const found = users.find(u => u.id === userId) || null;
    setSelectedUser(found);
    if (found) {
      setAssignedTeam(found.assignedTeam || (teams[0]?.name || 'Retail Distribution'));
      setStateRegion(found.stateRegion || 'Kano');
    }
  };

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId) {
      showToast('Please select a user to appoint.', 'error');
      return;
    }
    if (!newPosition) {
      showToast('Please select a new position.', 'error');
      return;
    }
    if (!reason.trim()) {
      showToast('Please provide a documented reason for this appointment.', 'error');
      return;
    }
    setIsConfirming(true);
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await positionApi.assignPosition({
        targetUserId,
        newPosition,
        assignedTeam,
        stateRegion,
        supervisorId: currentUser?.id,
        supervisorName,
        effectiveDate,
        reason: reason.trim(),
        confirmed: true,
      });

      if (res.success) {
        showToast(res.message || 'Position appointment confirmed and recorded!', 'success');
        setIsModalOpen(false);
        setIsConfirming(false);
        // Refresh directory, history & caller state
        loadUsers();
        refreshUser();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to execute appointment.', 'error');
      setIsConfirming(false);
    } finally {
      setIsSubmitting(false);
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
            <Shield className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-extrabold text-white tracking-tight">Staff & Position Governance</h2>
          </div>
          <p className="text-xs text-slate-400">
            Official position management, authority assignments, and auditable appointment history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAssignModal()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md hover:shadow-purple-500/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>Assign Position</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeSubTab === 'users'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Registered Users Directory ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeSubTab === 'history'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Role Assignment History</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* SUB-TAB 1: USERS DIRECTORY                                    */}
      {/* ============================================================== */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by full name, phone number, email, or user ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={positionFilter}
                onChange={(e) => {
                  setPositionFilter(e.target.value);
                  setTimeout(loadUsers, 50);
                }}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
              >
                <option value="">All Positions</option>
                <option value="FOUNDER_SUPER_ADMIN">FOUNDER / SUPER ADMIN</option>
                <option value="ADMIN">ADMIN</option>
                <option value="STATE_MANAGER">STATE MANAGER</option>
                <option value="TEAM_LEADER">TEAM LEADER</option>
                <option value="AGENT">AGENT</option>
                <option value="CUSTOMER">CUSTOMER</option>
              </select>

              <button
                onClick={loadUsers}
                disabled={isLoadingUsers}
                className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
                title="Search"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingUsers ? 'animate-spin text-purple-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Users List / Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            {isLoadingUsers ? (
              <div className="p-12 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-400 mb-2" />
                <p className="text-xs">Loading user registry...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Users className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                <p className="text-sm font-semibold">No registered users matched the criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">User Details</th>
                      <th className="py-3 px-4">Current Position</th>
                      <th className="py-3 px-4">Assigned Team</th>
                      <th className="py-3 px-4">Supervisor</th>
                      <th className="py-3 px-4">Date Appointed</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {users.map((u) => {
                      const isSelf = u.id === currentUser?.id;
                      return (
                        <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white text-sm">{u.fullName}</div>
                            <div className="text-[11px] text-slate-400">{u.phone} • {u.email}</div>
                            <div className="text-[10px] font-mono text-emerald-400">{u.id}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${getPositionBadge(u.position)}`}>
                              {u.position.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 font-medium">
                            {u.assignedTeam || 'None'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">
                            {u.supervisorName || 'Executive Line'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-400">
                            {u.appointedAt ? new Date(u.appointedAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {u.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleOpenAssignModal(u)}
                              disabled={isSelf}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                isSelf
                                  ? 'bg-slate-800/50 border-slate-700 text-slate-500 cursor-not-allowed'
                                  : 'bg-purple-950/60 border-purple-500/40 text-purple-300 hover:bg-purple-900/60 hover:text-white'
                              }`}
                              title={isSelf ? 'You cannot modify your own position' : 'Assign Position'}
                            >
                              Assign Position
                            </button>
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
      {/* SUB-TAB 2: ROLE ASSIGNMENT HISTORY AUDIT TRAIL                */}
      {/* ============================================================== */}
      {activeSubTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-purple-400" />
                  <span>Immutable Role-Assignment Audit Log</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Every position modification is recorded with appointment rationale and author details.
                </p>
              </div>
              <button
                onClick={loadHistory}
                disabled={isLoadingHistory}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin text-purple-400' : ''}`} />
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="p-8 text-center text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-purple-400 mb-2" />
                <p className="text-xs">Loading audit logs...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Clock className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                <p className="text-xs font-semibold">No position appointments have been logged yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div key={item.id} className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">{item.userName}</span>
                        <span className="text-[10px] font-mono text-slate-400">({item.userId})</span>
                        <span className="text-slate-500 text-xs">transitioned from</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {item.previousPosition.replace(/_/g, ' ')}
                        </span>
                        <span className="text-purple-400 text-xs font-bold">➔</span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${getPositionBadge(item.newPosition)}`}>
                          {item.newPosition.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 italic bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                        "{item.reason}"
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-3">
                        <span>Appointed by: <strong className="text-slate-200">{item.adminName}</strong></span>
                        {item.assignedTeam && <span>Team: <strong className="text-slate-200">{item.assignedTeam}</strong></span>}
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-slate-400 shrink-0">
                      <div>{new Date(item.appointmentDate).toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-500">{new Date(item.createdAt).toLocaleTimeString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ASSIGN POSITION FORM & CONFIRMATION                     */}
      {/* ============================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            {!isConfirming ? (
              /* FORM STEP */
              <form onSubmit={handleProceedToConfirm} className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Shield className="w-5 h-5 text-purple-400" />
                  <div>
                    <h3 className="text-base font-extrabold text-white">Assign Position</h3>
                    <p className="text-xs text-slate-400">Formal company appointment with audit recording</p>
                  </div>
                </div>

                {/* Select User */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Select User</label>
                  <select
                    value={targetUserId}
                    onChange={(e) => handleUserSelectChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    required
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id} disabled={u.id === currentUser?.id}>
                        {u.fullName} ({u.phone}) — Current: {u.position.replace(/_/g, ' ')} {u.id === currentUser?.id ? '[Cannot self-assign]' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Read-only Current Position */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Position</span>
                    <span className="text-xs font-bold text-white">
                      {selectedUser?.position.replace(/_/g, ' ') || 'CUSTOMER'}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">ID: {selectedUser?.id}</span>
                </div>

                {/* New Position Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    New Position <span className="text-purple-400 font-normal">(Permitted by your rank)</span>
                  </label>
                  <select
                    value={newPosition}
                    onChange={(e) => setNewPosition(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    required
                  >
                    {assignablePositions.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                {/* State / Region */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">State or Region</label>
                  <input
                    type="text"
                    value={stateRegion}
                    onChange={(e) => setStateRegion(e.target.value)}
                    placeholder="e.g. Kano State, Lagos Mainland, Kaduna"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Assigned Team */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Assigned Team</label>
                  <select
                    value={assignedTeam}
                    onChange={(e) => setAssignedTeam(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Unassigned / Direct Staff</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name} ({t.state})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Supervisor */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Supervisor Name</label>
                  <input
                    type="text"
                    value={supervisorName}
                    onChange={(e) => setSupervisorName(e.target.value)}
                    placeholder="e.g. Musa Ibrahim (State Manager)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Effective Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Effective Appointment Date</label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    required
                  >
                  </input>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Reason for Appointment <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Document the operational basis or performance justification for this appointment..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md"
                  >
                    Review Appointment
                  </button>
                </div>
              </form>
            ) : (
              /* CONFIRMATION STEP */
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="text-base font-extrabold text-white">Confirm Position Change</h3>
                    <p className="text-xs text-slate-400">Please review and confirm this staff appointment</p>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs">
                  <div className="flex justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-slate-400">User Appointed:</span>
                    <span className="font-bold text-white">{selectedUser?.fullName}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-slate-400">Previous Position:</span>
                    <span className="text-slate-300">{selectedUser?.position.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-slate-400">New Position:</span>
                    <span className="font-bold text-purple-400">{newPosition.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-slate-400">Assigned Team:</span>
                    <span className="text-white">{assignedTeam || 'None'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-slate-400">Effective Date:</span>
                    <span className="text-white">{effectiveDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Reason:</span>
                    <p className="text-slate-200 italic bg-slate-900 p-2 rounded border border-slate-800">
                      "{reason}"
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-amber-300/90 bg-amber-950/40 border border-amber-500/30 p-2.5 rounded-lg flex items-center gap-2">
                  <Shield className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>This appointment will be permanently recorded in the role-assignment audit ledger.</span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsConfirming(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-700"
                  >
                    Back to Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSubmit}
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Recording...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm Appointment</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
