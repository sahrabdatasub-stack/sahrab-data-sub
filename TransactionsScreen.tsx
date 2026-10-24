import React, { useState, useEffect } from 'react';
import { walletApi } from '../../utils/api.ts';
import { ArrowLeftRight, Wifi, PhoneCall, ArrowDownLeft, RefreshCw, CheckCircle2, Clock } from 'lucide-react';

export const TransactionsScreen: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const res = await walletApi.getTransactions();
      if (res.success) {
        setTransactions(res.transactions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getIcon = (type: string) => {
    if (type.includes('data')) return <Wifi className="w-4 h-4 text-emerald-400" />;
    if (type.includes('airtime')) return <PhoneCall className="w-4 h-4 text-teal-400" />;
    return <ArrowDownLeft className="w-4 h-4 text-blue-400" />;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 pb-24 sm:pb-8">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ArrowLeftRight className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-extrabold text-white">Transaction History</h2>
          </div>
          <p className="text-xs text-slate-400">Complete record of purchases, wallet deposits, and statements.</p>
        </div>

        <button
          onClick={loadTransactions}
          disabled={isLoading}
          className="p-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
          <p className="text-xs">Fetching transactions from PostgreSQL...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Clock className="w-8 h-8 mx-auto text-slate-600 mb-2" />
          <p className="text-xs font-semibold">No transactions found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                  {getIcon(tx.type)}
                </div>
                <div>
                  <div className="font-bold text-white text-xs sm:text-sm">
                    {tx.planName || tx.type.replace(/_/g, ' ')}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {tx.recipientPhone ? `Recipient: ${tx.recipientPhone}` : tx.reference}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {new Date(tx.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="font-black text-sm text-white">
                  ₦{parseFloat(tx.amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center justify-end gap-1 text-[10px] text-emerald-400 font-bold uppercase mt-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{tx.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
