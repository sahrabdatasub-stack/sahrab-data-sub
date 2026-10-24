import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { dashboardApi } from '../../utils/api.ts';
import { 
  LayoutDashboard, 
  Shield, 
  TrendingUp, 
  Users, 
  Wallet, 
  ArrowUpRight, 
  CheckCircle2, 
  Calendar, 
  Building2, 
  Award, 
  RefreshCw,
  ShoppingBag,
  Share2,
  ChevronRight,
} from 'lucide-react';
import { CeoDashboardScreen } from './CeoDashboardScreen.tsx';

export const RoleDashboardScreen: React.FC = () => {
  const { user, setActiveTab } = useApp();

  if (!user) return null;

  if (user.position === 'FOUNDER_SUPER_ADMIN') {
    return <CeoDashboardScreen />;
  }

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, [user?.position]);

  const loadDashboardStats = async () => {
    setIsLoading(true);
    try {
      const res = await dashboardApi.getStats();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 pb-24 sm:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LayoutDashboard className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              {data?.dashboardType || `${user.position.replace(/_/g, ' ')} DASHBOARD`}
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Welcome, {user.fullName}. Tailored operations and performance dashboard for your position.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadDashboardStats}
            disabled={isLoading}
            className="p-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
          <p className="text-xs">Loading operational metrics...</p>
        </div>
      ) : (
        <>

          {/* ============================================================== */}
          {/* VIEW: ADMIN DASHBOARD                                          */}
          {/* ============================================================== */}
          {user.position === 'ADMIN' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-4 shadow-md">
                  <div className="text-[11px] uppercase tracking-wider text-rose-300 font-bold mb-1">Registered Users</div>
                  <div className="text-2xl font-black text-white">{data?.stats?.totalRegisteredUsers || 0}</div>
                </div>

                <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-4 shadow-md">
                  <div className="text-[11px] uppercase tracking-wider text-rose-300 font-bold mb-1">Verified KYC Users</div>
                  <div className="text-2xl font-black text-emerald-400">{data?.stats?.verifiedKycUsers || 0}</div>
                </div>

                <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-4 shadow-md">
                  <div className="text-[11px] uppercase tracking-wider text-rose-300 font-bold mb-1">Active Plans</div>
                  <div className="text-2xl font-black text-white">{data?.stats?.activeDataPlans || 0}</div>
                </div>

                <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-4 shadow-md">
                  <div className="text-[11px] uppercase tracking-wider text-rose-300 font-bold mb-1">Active Teams</div>
                  <div className="text-2xl font-black text-white">{data?.stats?.managedTeams || 0}</div>
                </div>
              </div>

              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => setActiveTab('all-users')}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                >
                  <Users className="w-4 h-4" />
                  <span>All Users Directory</span>
                </button>
                <button
                  onClick={() => setActiveTab('positions')}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md"
                >
                  Manage Positions & Staff
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* VIEW: STATE MANAGER DASHBOARD                                  */}
          {/* ============================================================== */}
          {user.position === 'STATE_MANAGER' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 shadow-md">
                  <div className="text-[11px] uppercase tracking-wider text-amber-300 font-bold mb-1">Assigned Region</div>
                  <div className="text-xl font-black text-white">{data?.stats?.assignedState}</div>
                  <div className="text-[10px] text-slate-400 mt-1">State operations territory</div>
                </div>

                <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 shadow-md">
                  <div className="text-[11px] uppercase tracking-wider text-amber-300 font-bold mb-1">Active State Teams</div>
                  <div className="text-2xl font-black text-white">{data?.stats?.stateTeams || 0}</div>
                </div>

                <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 shadow-md">
                  <div className="text-[11px] uppercase tracking-wider text-amber-300 font-bold mb-1">Active Agents</div>
                  <div className="text-2xl font-black text-emerald-400">{data?.stats?.activeAgentsInState || 0}</div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-white mb-2">Monthly State Sales Target</h3>
                <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: '28%' }} />
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-2">
                  <span>Progress: ₦420,000</span>
                  <span>Target: ₦1,500,000</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setActiveTab('all-users')}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                >
                  <Users className="w-4 h-4" />
                  <span>All Users Directory</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* VIEW: TEAM LEADER DASHBOARD                                    */}
          {/* ============================================================== */}
          {user.position === 'TEAM_LEADER' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-4 shadow-md">
                  <div className="text-[11px] uppercase tracking-wider text-blue-300 font-bold mb-1">My Assigned Team</div>
                  <div className="text-lg font-black text-white">{data?.stats?.assignedTeam}</div>
                  <div className="text-[10px] text-slate-400 mt-1">Supervisor: {data?.stats?.supervisor}</div>
                </div>

                <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-4 shadow-md">
                  <div className="text-[11px] uppercase tracking-wider text-blue-300 font-bold mb-1">Team Members</div>
                  <div className="text-2xl font-black text-white">{data?.stats?.teamMembers || 0}</div>
                </div>

                <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-4 shadow-md">
                  <div className="text-[11px] uppercase tracking-wider text-blue-300 font-bold mb-1">Target Accomplished</div>
                  <div className="text-2xl font-black text-blue-400">{data?.stats?.targetPercentage}%</div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setActiveTab('all-users')}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                >
                  <Users className="w-4 h-4" />
                  <span>All Users Directory</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* VIEW: AGENT DASHBOARD                                          */}
          {/* ============================================================== */}
          {user.position === 'AGENT' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-md">
                  <div className="text-[11px] uppercase tracking-wider text-emerald-300 font-bold mb-1">Agent ID Code</div>
                  <div className="text-xl font-mono font-black text-emerald-400">{data?.stats?.agentCode}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{data?.stats?.resellerDiscountLevel}</div>
                </div>

                <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-md">
                  <div className="text-[11px] uppercase tracking-wider text-emerald-300 font-bold mb-1">Commissions Balance</div>
                  <div className="text-2xl font-black text-emerald-400">
                    ₦{(data?.stats?.commissionsEarned || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Available for wallet transfer</div>
                </div>

                <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-md">
                  <div className="text-[11px] uppercase tracking-wider text-emerald-300 font-bold mb-1">Total Sales Executed</div>
                  <div className="text-2xl font-black text-white">
                    ₦{(data?.stats?.totalSalesVolume || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">{data?.stats?.completedTransactions || 0} sales transactions</div>
                </div>
              </div>

              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => setActiveTab('buy-data')}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md"
                >
                  Sell Data (Agent Rates)
                </button>
                <button
                  onClick={() => setActiveTab('all-users')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>All Users Directory</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* VIEW: CUSTOMER DASHBOARD                                       */}
          {/* ============================================================== */}
          {user.position === 'CUSTOMER' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">Wallet Balance</div>
                  <div className="text-2xl font-black text-emerald-400">
                    ₦{parseFloat(user.walletBalance || '0').toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Instant VTU funding balance</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">Total Transactions</div>
                  <div className="text-2xl font-black text-white">{data?.stats?.transactionsCount || 0}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{data?.stats?.accountTier}</div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setActiveTab('buy-data')}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md"
                >
                  Buy Data Bundle
                </button>
                <button
                  onClick={() => setActiveTab('wallet')}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all"
                >
                  Fund Wallet
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
