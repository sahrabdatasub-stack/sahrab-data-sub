import React from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Shield, Wallet, Bell, RefreshCw, UserCheck } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, activeTab, setActiveTab, refreshUser, isLoading } = useApp();

  const getPositionBadge = (pos?: string) => {
    switch (pos) {
      case 'FOUNDER_SUPER_ADMIN':
        return { label: 'FOUNDER / SUPER ADMIN', color: 'bg-purple-950/80 text-purple-300 border-purple-600/40' };
      case 'ADMIN':
        return { label: 'ADMIN', color: 'bg-rose-950/80 text-rose-300 border-rose-600/40' };
      case 'STATE_MANAGER':
        return { label: 'STATE MANAGER', color: 'bg-amber-950/80 text-amber-300 border-amber-600/40' };
      case 'TEAM_LEADER':
        return { label: 'TEAM LEADER', color: 'bg-blue-950/80 text-blue-300 border-blue-600/40' };
      case 'AGENT':
        return { label: 'AGENT', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-600/40' };
      case 'CUSTOMER':
      default:
        return { label: 'CUSTOMER', color: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  const badge = getPositionBadge(user?.position);

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand & Tagline */}
        <div 
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <span className="text-emerald-400 font-extrabold text-lg tracking-tighter">SD</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-base tracking-tight text-white leading-none">
                SAHRAB <span className="text-emerald-400 font-black">DATA SUB</span>
              </h1>
            </div>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide">
              Stay Connected, Stay Ahead.
            </p>
          </div>
        </div>

        {/* Right side: Wallet, Position & Actions */}
        {user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Position Pill */}
            <div 
              onClick={() => setActiveTab('profile')} 
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer hover:opacity-90 transition-opacity ${badge.color}`}
              title="Click to view full position details in profile"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{badge.label}</span>
            </div>

            {/* Quick Wallet Widget */}
            <button
              onClick={() => setActiveTab('wallet')}
              className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-900/40 transition-colors shadow-sm"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>₦{parseFloat(user.walletBalance || '0').toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            </button>

            {/* Refresh */}
            <button
              onClick={() => refreshUser()}
              disabled={isLoading}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Refresh server state"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
};
