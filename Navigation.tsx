import React from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Home, Wifi, ArrowLeftRight, Users, User, LayoutDashboard, Globe } from 'lucide-react';

export const Navigation: React.FC = () => {
  const { activeTab, setActiveTab, canManagePositions, canViewGlobalDirectory, user } = useApp();

  const getDashboardLabel = () => {
    switch (user?.position) {
      case 'FOUNDER_SUPER_ADMIN':
        return 'Founder';
      case 'ADMIN':
        return 'Admin';
      case 'STATE_MANAGER':
        return 'State';
      case 'TEAM_LEADER':
        return 'Team';
      case 'AGENT':
        return 'Agent';
      case 'CUSTOMER':
      default:
        return 'Dashboard';
    }
  };

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors ${
            activeTab === 'home' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Home</span>
        </button>

        <button
          onClick={() => setActiveTab('buy-data')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors ${
            activeTab === 'buy-data' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wifi className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Data</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors ${
            activeTab === 'transactions' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowLeftRight className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">History</span>
        </button>

        {canViewGlobalDirectory && (
          <button
            onClick={() => setActiveTab('all-users')}
            className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors relative ${
              activeTab === 'all-users' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">All Users</span>
          </button>
        )}

        {canManagePositions && (
          <button
            onClick={() => setActiveTab('positions')}
            className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors relative ${
              activeTab === 'positions' ? 'text-purple-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Positions</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors ${
            activeTab === 'profile' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Profile</span>
        </button>
      </nav>

      {/* Desktop Navigation Header Bar */}
      <div className="hidden sm:block bg-slate-950/80 border-b border-slate-800/80 px-4">
        <div className="max-w-7xl mx-auto flex items-center gap-1.5 py-1.5">
          <button
            onClick={() => setActiveTab('home')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
              activeTab === 'home' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>

          <button
            onClick={() => setActiveTab('buy-data')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
              activeTab === 'buy-data' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Wifi className="w-4 h-4" />
            <span>Buy Data</span>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
              activeTab === 'transactions' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Transactions</span>
          </button>

          {/* Quick Dashboard link */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
              activeTab === 'dashboard' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>{getDashboardLabel()} Dashboard</span>
          </button>

          {/* All Users Directory link (for all staff ranks: Admin, State Mgr, TL, Agent) */}
          {canViewGlobalDirectory && (
            <button
              onClick={() => setActiveTab('all-users')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors border ${
                activeTab === 'all-users'
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'text-emerald-300 bg-emerald-950/40 border-emerald-500/30 hover:bg-emerald-900/50'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>All Users Directory</span>
            </button>
          )}

          {canManagePositions && (
            <button
              onClick={() => setActiveTab('positions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors border ${
                activeTab === 'positions'
                  ? 'bg-purple-600 text-white border-purple-500'
                  : 'text-purple-300 bg-purple-950/40 border-purple-500/30 hover:bg-purple-900/50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Position Management</span>
            </button>
          )}

          <div className="ml-auto">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
                activeTab === 'profile' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <User className="w-4 h-4" />
              <span>My Profile & Position</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
