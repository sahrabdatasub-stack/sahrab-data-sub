import React from 'react';
import { useApp } from './context/AppContext.tsx';
import { Header } from './components/common/Header.tsx';
import { Navigation } from './components/common/Navigation.tsx';
import { AuthScreen } from './components/screens/AuthScreen.tsx';
import { HomeScreen } from './components/screens/HomeScreen.tsx';
import { BuyDataScreen } from './components/screens/BuyDataScreen.tsx';
import { BuyAirtimeScreen } from './components/screens/BuyAirtimeScreen.tsx';
import { FundWalletScreen } from './components/screens/FundWalletScreen.tsx';
import { KycScreen } from './components/screens/KycScreen.tsx';
import { TransactionsScreen } from './components/screens/TransactionsScreen.tsx';
import { ProfileScreen } from './components/screens/ProfileScreen.tsx';
import { PositionManagementScreen } from './components/screens/PositionManagementScreen.tsx';
import { RoleDashboardScreen } from './components/screens/RoleDashboardScreen.tsx';
import { GlobalUserDirectoryScreen } from './components/screens/GlobalUserDirectoryScreen.tsx';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const App: React.FC = () => {
  const { isAuthenticated, isLoading, activeTab, toasts, removeToast, canManagePositions, canViewGlobalDirectory } = useApp();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 shadow-xl animate-pulse flex items-center justify-center mb-4">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
            <span className="text-emerald-400 font-black text-xl">SD</span>
          </div>
        </div>
        <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Loading SAHRAB DATA SUB...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <AuthScreen />
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </>
    );
  }

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen />;
      case 'buy-data':
        return <BuyDataScreen />;
      case 'buy-airtime':
        return <BuyAirtimeScreen />;
      case 'wallet':
        return <FundWalletScreen />;
      case 'transactions':
        return <TransactionsScreen />;
      case 'kyc':
        return <KycScreen />;
      case 'positions':
        return canManagePositions ? <PositionManagementScreen /> : <HomeScreen />;
      case 'all-users':
      case 'directory':
        return canViewGlobalDirectory ? <GlobalUserDirectoryScreen /> : <HomeScreen />;
      case 'dashboard':
        return <RoleDashboardScreen />;
      case 'profile':
      default:
        return <ProfileScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header />
      <Navigation />

      <main className="flex-1 overflow-y-auto">
        {renderActiveScreen()}
      </main>

      {/* Floating Toasts */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

const ToastContainer: React.FC<{ toasts: any[]; removeToast: (id: string) => void }> = ({ toasts, removeToast }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto p-3.5 rounded-xl border shadow-xl flex items-start gap-2.5 text-xs animate-in fade-in slide-in-from-top-2 duration-200 ${
            t.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200'
              : t.type === 'error'
              ? 'bg-rose-950/95 border-rose-500/50 text-rose-200'
              : 'bg-slate-900/95 border-slate-700 text-slate-200'
          }`}
        >
          {t.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : t.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          )}

          <div className="flex-1 font-medium leading-relaxed">{t.message}</div>

          <button
            onClick={() => removeToast(t.id)}
            className="text-slate-400 hover:text-white p-0.5 rounded shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
