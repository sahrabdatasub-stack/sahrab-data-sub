import React from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { 
  Shield, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Users, 
  UserCheck, 
  LayoutDashboard, 
  LogOut, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Sparkles,
  Building2,
  Clock
} from 'lucide-react';

export const ProfileScreen: React.FC = () => {
  const { user, logout, setActiveTab, canManagePositions, canViewGlobalDirectory } = useApp();

  if (!user) {
    return (
      <div className="p-6 text-center text-slate-400">
        <p>No user session detected. Please sign in.</p>
      </div>
    );
  }

  // Position presentation configurations
  const getPositionConfig = (pos: string) => {
    switch (pos) {
      case 'FOUNDER_SUPER_ADMIN':
        return {
          headerText: 'MY POSITION: FOUNDER / SUPER ADMIN',
          badgeText: 'FOUNDER / SUPER ADMIN',
          badgeBg: 'bg-purple-950/80 border-purple-500/50 text-purple-200',
          gradientBg: 'from-purple-900/40 via-indigo-900/20 to-slate-900',
          accentColor: 'text-purple-400',
          dashboardTitle: 'Founder Dashboard',
          dashboardDesc: 'Executive company-wide governance, financial oversight & audit',
          rankLevel: 'Hierarchy Rank #1 (Supreme Governance)',
        };
      case 'ADMIN':
        return {
          headerText: 'MY POSITION: ADMIN',
          badgeText: 'ADMIN',
          badgeBg: 'bg-rose-950/80 border-rose-500/50 text-rose-200',
          gradientBg: 'from-rose-900/40 via-pink-900/20 to-slate-900',
          accentColor: 'text-rose-400',
          dashboardTitle: 'Admin Dashboard',
          dashboardDesc: 'Operations, team oversight, data plans & KYC review queue',
          rankLevel: 'Hierarchy Rank #2 (Operations Admin)',
        };
      case 'STATE_MANAGER':
        return {
          headerText: 'MY POSITION: STATE MANAGER',
          badgeText: 'STATE MANAGER',
          badgeBg: 'bg-amber-950/80 border-amber-500/50 text-amber-200',
          gradientBg: 'from-amber-900/40 via-orange-900/20 to-slate-900',
          accentColor: 'text-amber-400',
          dashboardTitle: 'State Manager Dashboard',
          dashboardDesc: 'State-wide branch teams, team leaders & regional sales monitor',
          rankLevel: 'Hierarchy Rank #3 (State Branch Management)',
        };
      case 'TEAM_LEADER':
        return {
          headerText: 'MY POSITION: TEAM LEADER',
          badgeText: 'TEAM LEADER',
          badgeBg: 'bg-blue-950/80 border-blue-500/50 text-blue-200',
          gradientBg: 'from-blue-900/40 via-cyan-900/20 to-slate-900',
          accentColor: 'text-blue-400',
          dashboardTitle: 'Team Leader Dashboard',
          dashboardDesc: 'Field sales targets, direct agents progress & performance metrics',
          rankLevel: 'Hierarchy Rank #4 (Field Team Leadership)',
        };
      case 'AGENT':
        return {
          headerText: 'MY POSITION: AGENT',
          badgeText: 'AGENT',
          badgeBg: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200',
          gradientBg: 'from-emerald-900/40 via-teal-900/20 to-slate-900',
          accentColor: 'text-emerald-400',
          dashboardTitle: 'Agent Dashboard',
          dashboardDesc: 'Retail reseller data sales, direct commissions & customer referrals',
          rankLevel: 'Hierarchy Rank #5 (Certified Sales Agent)',
        };
      case 'CUSTOMER':
      default:
        return {
          headerText: 'MY POSITION: CUSTOMER',
          badgeText: 'CUSTOMER',
          badgeBg: 'bg-slate-800 border-slate-700 text-slate-300',
          gradientBg: 'from-slate-800/40 to-slate-900',
          accentColor: 'text-emerald-400',
          dashboardTitle: 'Customer Dashboard',
          dashboardDesc: 'Personal data purchases, airtime top-ups & wallet statements',
          rankLevel: 'Default Account (Self-Service Consumer)',
        };
    }
  };

  const posConfig = getPositionConfig(user.position);

  const formattedAppointmentDate = user.appointedAt 
    ? new Date(user.appointedAt).toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'At Registration';

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 pb-24 sm:pb-8">
      {/* Top Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Account Profile</h2>
          <p className="text-xs sm:text-sm text-slate-400">Authenticated user details and official position record.</p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/50 text-rose-300 border border-rose-800/40 text-xs font-semibold hover:bg-rose-900/60 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* REQUIREMENT 4: PROMINENT "MY POSITION" SECTION                */}
      {/* ============================================================== */}
      <div className={`rounded-2xl border bg-gradient-to-br ${posConfig.gradientBg} border-slate-700/80 p-5 sm:p-6 shadow-xl relative overflow-hidden`}>
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shadow-inner">
              <Shield className={`w-6 h-6 ${posConfig.accentColor}`} />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Official Company Standing</div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                {posConfig.headerText}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-full text-xs font-extrabold border shadow-sm ${posConfig.badgeBg}`}>
              {posConfig.badgeText}
            </span>
          </div>
        </div>

        {/* Position Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Unique ID */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>Unique User / Staff ID</span>
            </div>
            <div className="font-mono text-sm font-bold text-emerald-400 select-all">
              {user.id}
            </div>
          </div>

          {/* Assigned Team */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>Assigned Team</span>
            </div>
            <div className="text-sm font-bold text-white">
              {user.assignedTeam || 'Direct Organization / None'}
            </div>
          </div>

          {/* Supervisor Name */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Supervisor / Reporting Line</span>
            </div>
            <div className="text-sm font-bold text-white">
              {user.supervisorName || 'Executive Committee / None'}
            </div>
          </div>

          {/* Appointment Date */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Date Appointed / Effective</span>
            </div>
            <div className="text-sm font-medium text-slate-200">
              {formattedAppointmentDate}
            </div>
          </div>

          {/* Account Status */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Account Status</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
                {user.status || 'Active'}
              </span>
            </div>
          </div>

          {/* Rank Description */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-slate-400" />
              <span>Authorization Level</span>
            </div>
            <div className="text-xs font-semibold text-slate-300">
              {posConfig.rankLevel}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          <span>This position is cryptographically certified by the SAHRAB backend and stored persistently in PostgreSQL.</span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* REQUIREMENT 5: AUTOMATIC DASHBOARD ACCESS ENTRY               */}
      {/* ============================================================== */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-emerald-400" />
            <h4 className="text-base font-bold text-white tracking-tight">Assigned Position Workspace</h4>
          </div>
          <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md">
            Auto-Discovered
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Access the dedicated tools and operational controls configured specifically for your role.
        </p>

        <button
          onClick={() => setActiveTab('dashboard')}
          className="w-full flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition-all shadow-md group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-black/20 flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <div className="text-sm font-extrabold flex items-center gap-2">
                <span>Open {posConfig.dashboardTitle}</span>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-semibold">Authorized</span>
              </div>
              <div className="text-xs text-emerald-100 font-normal">{posConfig.dashboardDesc}</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Global User Directory shortcut for all authorized staff */}
        {canViewGlobalDirectory && (
          <button
            onClick={() => setActiveTab('all-users')}
            className="w-full mt-3 flex items-center justify-between p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 hover:bg-emerald-900/40 text-emerald-200 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-emerald-400" />
              <div className="text-left">
                <div className="text-xs font-bold text-white">All Users Global Directory</div>
                <div className="text-[11px] text-emerald-300">Browse platform-wide users, roles & customer records</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
          </button>
        )}

        {/* Position Management shortcut for authorized roles */}
        {canManagePositions && (
          <button
            onClick={() => setActiveTab('positions')}
            className="w-full mt-3 flex items-center justify-between p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/40 hover:bg-purple-900/40 text-purple-200 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-purple-400" />
              <div className="text-left">
                <div className="text-xs font-bold text-white">Position Management Console</div>
                <div className="text-[11px] text-purple-300">Search users, appoint positions & inspect audit history</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
          </button>
        )}
      </div>

      {/* Personal Identity & Verification Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Personal Details */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-400" />
            <span>Personal Information</span>
          </h4>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Full Legal Name</span>
              <span className="font-semibold text-slate-200 text-sm">{user.fullName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Email Address</span>
              <span className="font-semibold text-slate-200">{user.email}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Phone Number</span>
              <span className="font-semibold text-slate-200">{user.phone}</span>
            </div>
          </div>
        </div>

        {/* KYC & Identity Status */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Identity Verification (KYC)</span>
            </h4>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
              user.kycStatus === 'verified'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : user.kycStatus === 'pending'
                ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}>
              {user.kycStatus === 'verified' 
                ? 'Verified Tier 2' 
                : user.kycStatus === 'pending' 
                ? 'Pending Verification' 
                : 'Not Started (Tier 1)'}
            </span>
          </div>

          <p className="text-xs text-slate-400">
            {user.kycStatus === 'verified'
              ? 'Your identity has been verified with official NIMC/BVN registry. Full banking limits and withdrawals are active.'
              : 'KYC is optional for purchasing data and airtime. You can verify your identity with either BVN or NIN at your convenience to unlock bank withdrawals.'}
          </p>

          <button
            onClick={() => setActiveTab('kyc')}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              user.kycStatus === 'verified'
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{user.kycStatus === 'verified' ? 'View Identity Details' : 'Verify Identity'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
