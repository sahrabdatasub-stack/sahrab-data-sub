import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { dataApi } from '../../utils/api.ts';
import { Wifi, Phone, CheckCircle2, AlertCircle, RefreshCw, Sparkles, ShieldCheck } from 'lucide-react';

interface DataPlan {
  id: string;
  network: string;
  planType: string;
  name: string;
  size: string;
  userPrice: number;
  resellerPrice: number;
  validity: string;
}

export const BuyDataScreen: React.FC = () => {
  const { user, showToast, refreshUser } = useApp();
  const [plans, setPlans] = useState<DataPlan[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<string>('MTN');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>(user?.phone || '');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPurchasing, setIsPurchasing] = useState<boolean>(false);

  const networks = ['MTN', 'AIRTEL', 'GLO', '9MOBILE'];

  useEffect(() => {
    loadPlans();
  }, [selectedNetwork]);

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const res = await dataApi.getPlans(selectedNetwork);
      if (res.success) {
        setPlans(res.plans || []);
        if (res.plans.length > 0) {
          setSelectedPlanId(res.plans[0].id);
        }
      }
    } catch (err: any) {
      showToast('Failed to load plans for ' + selectedNetwork, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const isStaffOrAgent = user ? ['AGENT', 'TEAM_LEADER', 'STATE_MANAGER', 'ADMIN', 'FOUNDER_SUPER_ADMIN'].includes(user.position) : false;

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) {
      showToast('Please select a data bundle.', 'error');
      return;
    }

    const cleanPhone = recipientPhone.replace(/\s+/g, '').replace(/^\+234/, '0');
    if (!/^0(7|8|9)(0|1)\d{8}$/.test(cleanPhone)) {
      showToast('Please provide a valid 11-digit Nigerian phone number.', 'error');
      return;
    }

    setIsPurchasing(true);
    try {
      const res = await dataApi.buyData({
        planId: selectedPlanId,
        recipientPhone: cleanPhone,
      });

      if (res.success) {
        showToast(res.message || 'Data purchase completed successfully!', 'success');
        refreshUser();
      }
    } catch (err: any) {
      showToast(err.message || 'Data purchase failed.', 'error');
    } finally {
      setIsPurchasing(false);
    }
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const effectivePrice = selectedPlan ? (isStaffOrAgent ? selectedPlan.resellerPrice : selectedPlan.userPrice) : 0;

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6 pb-24 sm:pb-8">
      {/* Title */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Wifi className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-extrabold text-white">Buy Instant Data</h2>
          </div>
          <p className="text-xs text-slate-400">Direct SME and corporate data bundles with instant delivery.</p>
        </div>

        {isStaffOrAgent && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Agent Rates Active</span>
          </div>
        )}
      </div>

      {/* Network Select Tabs */}
      <div className="grid grid-cols-4 gap-2">
        {networks.map((net) => {
          const isSelected = selectedNetwork === net;
          return (
            <button
              key={net}
              type="button"
              onClick={() => setSelectedNetwork(net)}
              className={`p-3 rounded-xl border text-xs font-black transition-all flex flex-col items-center gap-1.5 ${
                isSelected
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-black/20 flex items-center justify-center font-bold text-[10px]">
                {net[0]}
              </div>
              <span>{net}</span>
            </button>
          );
        })}
      </div>

      {/* Purchase Form */}
      <form onSubmit={handlePurchase} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
        {/* Recipient Phone */}
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

        {/* Plan Select */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5">
            Select Data Bundle ({selectedNetwork})
          </label>
          {isLoading ? (
            <div className="p-6 text-center text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-400 mb-1" />
              <span className="text-xs">Fetching available bundles...</span>
            </div>
          ) : plans.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              No active plans configured for {selectedNetwork}.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
              {plans.map((p) => {
                const isSelected = selectedPlanId === p.id;
                const price = isStaffOrAgent ? p.resellerPrice : p.userPrice;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlanId(p.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-white">{p.name}</div>
                      <div className="text-[10px] text-slate-400">{p.validity} • {p.planType}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-xs text-emerald-400">₦{price.toLocaleString()}</div>
                      {isStaffOrAgent && (
                        <div className="text-[9px] text-slate-400 line-through">₦{p.userPrice}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Price & Balance Summary */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1.5">
          <div className="flex justify-between text-slate-400">
            <span>Your Wallet Balance:</span>
            <span className="font-bold text-white">₦{parseFloat(user?.walletBalance || '0').toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Amount to Charge:</span>
            <span className="font-bold text-emerald-400">₦{effectivePrice.toLocaleString()}</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPurchasing || !selectedPlanId}
          className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2"
        >
          {isPurchasing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Dispensing Data Bundle...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Purchase Now (₦{effectivePrice.toLocaleString()})</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
