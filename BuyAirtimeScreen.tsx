import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { dataApi } from '../../utils/api.ts';
import { PhoneCall, Phone, CheckCircle2, RefreshCw } from 'lucide-react';

export const BuyAirtimeScreen: React.FC = () => {
  const { user, showToast, refreshUser } = useApp();
  const [network, setNetwork] = useState('MTN');
  const [recipientPhone, setRecipientPhone] = useState(user?.phone || '');
  const [amount, setAmount] = useState('500');
  const [isPurchasing, setIsPurchasing] = useState(false);

  const networks = ['MTN', 'AIRTEL', 'GLO', '9MOBILE'];
  const quickAmounts = ['100', '200', '500', '1000', '2000', '5000'];

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num < 50) {
      showToast('Minimum airtime amount is ₦50.', 'error');
      return;
    }

    const cleanPhone = recipientPhone.replace(/\s+/g, '').replace(/^\+234/, '0');
    if (!/^0(7|8|9)(0|1)\d{8}$/.test(cleanPhone)) {
      showToast('Please enter a valid 11-digit phone number.', 'error');
      return;
    }

    setIsPurchasing(true);
    try {
      const res = await dataApi.buyAirtime({
        network,
        recipientPhone: cleanPhone,
        amount: num,
      });

      if (res.success) {
        showToast(res.message || 'Airtime purchased successfully!', 'success');
        refreshUser();
      }
    } catch (err: any) {
      showToast(err.message || 'Airtime purchase failed.', 'error');
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6 pb-24 sm:pb-8">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <PhoneCall className="w-5 h-5 text-teal-400" />
          <h2 className="text-xl font-extrabold text-white">Buy Airtime (VTU)</h2>
        </div>
        <p className="text-xs text-slate-400">Instant airtime recharge to any Nigerian mobile phone.</p>
      </div>

      {/* Network Select */}
      <div className="grid grid-cols-4 gap-2">
        {networks.map((net) => {
          const isSelected = network === net;
          return (
            <button
              key={net}
              type="button"
              onClick={() => setNetwork(net)}
              className={`p-3 rounded-xl border text-xs font-black transition-all flex flex-col items-center gap-1.5 ${
                isSelected
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span>{net}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handlePurchase} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
            <span>Recipient Phone Number</span>
            <button
              type="button"
              onClick={() => setRecipientPhone(user?.phone || '')}
              className="text-[10px] text-emerald-400 font-semibold hover:underline"
            >
              Use My Number
            </button>
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="tel"
              placeholder="08012345678"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono font-medium"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5">
            Airtime Amount (₦)
          </label>
          <input
            type="number"
            min="50"
            max="100000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono font-bold"
            required
          />

          <div className="flex gap-2 mt-2 flex-wrap">
            {quickAmounts.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setAmount(q)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold"
              >
                ₦{q}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isPurchasing}
          className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2"
        >
          {isPurchasing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Purchasing Airtime...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Recharge ₦{parseFloat(amount || '0').toLocaleString()}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
