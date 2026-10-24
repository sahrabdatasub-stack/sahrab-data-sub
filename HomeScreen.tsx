import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { walletApi } from '../../utils/api.ts';
import { 
  Wallet, 
  Wifi, 
  PhoneCall, 
  ArrowDownLeft, 
  Shield, 
  AlertCircle, 
  ChevronRight, 
  Clock, 
  ArrowUpRight,
  Sparkles,
  Users,
  CheckCircle2,
  X
} from 'lucide-react';

export const HomeScreen: React.FC = () => {
  const { user, setActiveTab, canManagePositions } = useApp();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [dismissKycBanner, setDismissKycBanner] = useState(false);

  useEffect(() => {
    walletApi.getTransactions().then((res) => {
      if (res.success) setTransactions(res.transactions.slice(0, 5));
    }).catch(() => {});
  }, []);

  if (!user) return null;

  const isVerified = user.kycStatus === 'verified';

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 pb-24 sm:pb-8">
      {/* Wallet Balance Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-800 to-slate-950 border border-emerald-600/40 p-6 text-white shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-emerald-200 uppercase tracking-wider">Available Balance</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <div className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-black/30 border border-white/10 text-emerald-300">
            {user.position.replace(/_/g, ' ')}
          </div>
        </div>

        <div className="mb-6">
          <div className="text-3xl sm:text-4xl font-black tracking-tight flex items-baseline gap-1">
            <span className="text-emerald-300">₦</span>
            <span>{parseFloat(user.walletBalance || '0').toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
          </div>
          {parseFloat(user.commissionBalance || '0') > 0 && (
            <div className="text-xs text-emerald-200 mt-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Earned Commissions: ₦{parseFloat(user.commissionBalance).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4 pt-2 border-t border-white/10">
          <button
            onClick={() => setActiveTab('wallet')}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-xs font-bold gap-1"
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-300" />
            <span>Fund Wallet</span>
          </button>

          <button
            onClick={() => setActiveTab('buy-data')}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-xs font-bold gap-1"
          >
            <Wifi className="w-4 h-4 text-emerald-300" />
            <span>Buy Data</span>
          </button>

          <button
            onClick={() => setActiveTab('buy-airtime')}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-xs font-bold gap-1"
          >
            <PhoneCall className="w-4 h-4 text-emerald-300" />
            <span>Airtime</span>
          </button>
        </div>
      </div>

      {/* KYC Reminder Banner (Optional for purchasing data & airtime) */}
      {!isVerified && !dismissKycBanner && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md relative">
          <div className="flex items-start sm:items-center gap-3 pr-6 sm:pr-0">
            <div className="p-2 bg-amber-900/60 rounded-xl text-amber-400 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-amber-200">KYC Verification (Optional)</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                  Tier 1 Active
                </span>
              </div>
              <div className="text-[11px] text-amber-300/80 mt-0.5">
                Purchases and wallet funding are enabled! Complete either NIN or BVN verification whenever you want to unlock external bank withdrawals.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              onClick={() => setActiveTab('kyc')}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-xl text-xs font-black transition-colors shadow-sm"
            >
              Verify Identity
            </button>
            <button
              onClick={() => setDismissKycBanner(true)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Dismiss reminder"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Prominent Position Banner on Home */}
      <div 
        onClick={() => setActiveTab('profile')}
        className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-colors shadow-sm group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Official Appointment</div>
            <div className="text-sm font-extrabold text-white flex items-center gap-2">
              <span>MY POSITION: {user.position.replace(/_/g, ' ')}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-purple-400 font-bold group-hover:translate-x-1 transition-transform">
          <span>View Profile</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>

      {/* Quick Services Section */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setActiveTab('buy-data')}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-4 cursor-pointer hover:border-emerald-500/50 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-950/60 text-emerald-400 flex items-center justify-center mb-2">
            <Wifi className="w-5 h-5" />
          </div>
          <div className="font-bold text-sm text-white">SME Data</div>
          <div className="text-[11px] text-slate-400">MTN, Airtel, Glo, 9mobile</div>
        </div>

        <div
          onClick={() => setActiveTab('buy-airtime')}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-4 cursor-pointer hover:border-emerald-500/50 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-teal-950/60 text-teal-400 flex items-center justify-center mb-2">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div className="font-bold text-sm text-white">VTU Airtime</div>
          <div className="text-[11px] text-slate-400">Instant direct top-up</div>
        </div>

        <div
          onClick={() => setActiveTab('dashboard')}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-4 cursor-pointer hover:border-emerald-500/50 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-950/60 text-blue-400 flex items-center justify-center mb-2">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="font-bold text-sm text-white">My Dashboard</div>
          <div className="text-[11px] text-slate-400">Role workspace</div>
        </div>

        {canManagePositions ? (
          <div
            onClick={() => setActiveTab('positions')}
            className="bg-slate-900 border border-purple-500/40 rounded-2xl p-4 cursor-pointer hover:bg-purple-950/20 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-950/60 text-purple-400 flex items-center justify-center mb-2">
              <Users className="w-5 h-5" />
            </div>
            <div className="font-bold text-sm text-white">Positions</div>
            <div className="text-[11px] text-purple-300">Staff management</div>
          </div>
        ) : (
          <div
            onClick={() => setActiveTab('profile')}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 cursor-pointer hover:border-emerald-500/50 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center mb-2">
              <Shield className="w-5 h-5" />
            </div>
            <div className="font-bold text-sm text-white">Identity & KYC</div>
            <div className="text-[11px] text-slate-400">{isVerified ? 'Verified Tier 2' : 'Pending'}</div>
          </div>
        )}
      </div>

      {/* Recent Transactions Preview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Recent Transactions</h3>
          </div>
          <button
            onClick={() => setActiveTab('transactions')}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No transactions yet. Buy data or airtime to see your history here.
          </div>
        ) : (
          <div className="space-y-2.5">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-950/60 text-emerald-400 flex items-center justify-center">
                    <Wifi className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-white">{tx.planName || tx.type.replace(/_/g, ' ')}</div>
                    <div className="text-[10px] text-slate-400">{tx.recipientPhone || tx.reference}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-white">₦{parseFloat(tx.amount || 0).toLocaleString()}</div>
                  <div className="text-[10px] text-emerald-400 uppercase font-semibold">{tx.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
