import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { walletApi } from '../../utils/api.ts';
import { 
  Wallet, 
  Building2, 
  Copy, 
  Check, 
  ArrowDownLeft, 
  ShieldCheck, 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink,
  Search,
  Sparkles,
  Info
} from 'lucide-react';

interface VirtualAccount {
  bankName: string;
  bankCode?: string;
  accountNumber: string;
  accountName: string;
  accountReference?: string;
  issuedBy?: string;
  environment?: string;
}

export const FundWalletScreen: React.FC = () => {
  const { user, showToast, refreshUser } = useApp();
  const [amount, setAmount] = useState('2000');
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [isFunding, setIsFunding] = useState(false);

  // Monnify Virtual Accounts State
  const [accounts, setAccounts] = useState<VirtualAccount[]>([]);
  const [monnifyConfig, setMonnifyConfig] = useState<any>(null);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Manual Transfer Verification State
  const [manualReference, setManualReference] = useState('');
  const [isVerifyingRef, setIsVerifyingRef] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  useEffect(() => {
    loadVirtualAccounts();
  }, []);

  const loadVirtualAccounts = async () => {
    setIsLoadingAccounts(true);
    try {
      const res = await walletApi.getVirtualAccounts();
      if (res.success) {
        setAccounts(res.accounts || []);
        setMonnifyConfig(res.config);
      }
    } catch (err: any) {
      console.warn('Failed to load virtual accounts:', err);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const handleGenerateAccounts = async () => {
    setIsGenerating(true);
    try {
      const res = await walletApi.generateVirtualAccounts();
      if (res.success) {
        setAccounts(res.accounts || []);
        showToast('Genuine Monnify virtual accounts generated successfully!', 'success');
        refreshUser();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to generate Monnify virtual account.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (accNum: string) => {
    navigator.clipboard.writeText(accNum);
    setCopiedAccount(accNum);
    showToast('Account number copied to clipboard!', 'info');
    setTimeout(() => setCopiedAccount(null), 2500);
  };

  const handleManualVerifyTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualReference.trim()) {
      showToast('Please enter the Monnify transaction reference.', 'error');
      return;
    }

    setIsVerifyingRef(true);
    try {
      const res = await walletApi.verifyTransfer(manualReference.trim());
      if (res.success) {
        showToast(res.message || 'Transfer verified and credited!', 'success');
        setManualReference('');
        setShowVerifyModal(false);
        refreshUser();
      }
    } catch (err: any) {
      showToast(err.message || 'Could not verify transaction with Monnify.', 'error');
    } finally {
      setIsVerifyingRef(false);
    }
  };

  const handleSandboxDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num < 100) {
      showToast('Minimum deposit amount is ₦100.', 'error');
      return;
    }

    setIsFunding(true);
    try {
      const res = await walletApi.fundWallet(num);
      if (res.success) {
        showToast(res.message || 'Deposit processed successfully!', 'success');
        refreshUser();
      }
    } catch (err: any) {
      showToast(err.message || 'Deposit failed.', 'error');
    } finally {
      setIsFunding(false);
    }
  };

  const isConfigured = monnifyConfig?.configured;
  const isSandbox = monnifyConfig?.environment === 'sandbox';

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6 pb-24 sm:pb-8">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl font-extrabold text-white">Fund SAHRAB Wallet</h2>
        </div>
        <p className="text-xs text-slate-400">
          Automated bank transfer via Monnify (Moniepoint) with instant wallet credit.
        </p>
      </div>

      {/* Provider & Environment Status Strip */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Payment Provider:</span>
          <span className="font-bold text-white flex items-center gap-1.5">
            <span>Monnify (Moniepoint MFB)</span>
            {isConfigured && (
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                isSandbox 
                  ? 'bg-amber-950/80 border border-amber-500/40 text-amber-300' 
                  : 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
              }`}>
                {isSandbox ? 'Sandbox' : 'Production'}
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[11px]">Gateway Status:</span>
          {isConfigured ? (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
              ACTIVE
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
              NOT CONFIGURED
            </span>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* CASE 1: GENUINE MONNIFY VIRTUAL ACCOUNTS FOUND                */}
      {/* ============================================================== */}
      {accounts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Dedicated Automated Virtual Accounts</span>
            </div>
            <button
              onClick={loadVirtualAccounts}
              disabled={isLoadingAccounts}
              title="Refresh Accounts"
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAccounts ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {accounts.map((acc) => (
              <div 
                key={acc.accountNumber} 
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md hover:border-slate-700 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    <span>{acc.bankName}</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 rounded font-mono font-medium">
                      Monnify Verified
                    </span>
                  </div>

                  <div className="text-2xl font-black font-mono tracking-wider text-emerald-400">
                    {acc.accountNumber}
                  </div>

                  <div className="text-xs text-slate-400 font-medium">
                    Account Name: <span className="text-white font-semibold">{acc.accountName}</span>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
                  <button
                    onClick={() => handleCopy(acc.accountNumber)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors flex items-center gap-2 text-xs font-bold shadow-sm"
                  >
                    {copiedAccount === acc.accountNumber ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-400" />
                        <span>Copy Account</span>
                      </>
                    )}
                  </button>

                  <span className="text-[10px] text-slate-500">
                    Auto-credit within 60s
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl text-xs text-slate-400 flex items-start gap-2">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Transfer funds from any Nigerian mobile banking app, USSD, or internet banking. Your SAHRAB wallet balance will be credited automatically upon bank confirmation.
            </p>
          </div>

          {/* Transfer Check Action */}
          <div className="pt-1">
            <button
              onClick={() => setShowVerifyModal(!showVerifyModal)}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Already made a transfer? Verify by reference</span>
            </button>
          </div>

          {showVerifyModal && (
            <form onSubmit={handleManualVerifyTransfer} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="text-xs font-bold text-white">Manual Monnify Transfer Verification</div>
              <p className="text-[11px] text-slate-400">
                If your bank completed the transfer but your wallet balance hasn't updated, enter the Monnify transaction reference or bank session ID below:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. MNFY|20261022..."
                  value={manualReference}
                  onChange={(e) => setManualReference(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
                <button
                  type="submit"
                  disabled={isVerifyingRef}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  {isVerifyingRef ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>Verify</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* CASE 2: CONFIGURED BUT ACCOUNTS NOT YET RETRIEVED             */}
      {/* ============================================================== */}
      {!isLoadingAccounts && accounts.length === 0 && isConfigured && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-xl">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl w-fit mx-auto">
            <Sparkles className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white">
              Generate Dedicated Monnify Accounts
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
              Monnify is connected. Click below to issue your dedicated virtual bank accounts (Wema Bank & Sterling Bank) for automated transfer wallet funding.
            </p>
          </div>

          <button
            onClick={handleGenerateAccounts}
            disabled={isGenerating}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all inline-flex items-center gap-2 shadow-lg"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Contacting Monnify Gateway...</span>
              </>
            ) : (
              <>
                <Building2 className="w-4 h-4" />
                <span>Issue Dedicated Virtual Accounts</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* CASE 3: MONNIFY NOT CONFIGURED ON BACKEND                      */}
      {/* ============================================================== */}
      {!isLoadingAccounts && !isConfigured && (
        <div className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-200">
                Monnify Payment Gateway Not Configured
              </h3>
              <p className="text-[11px] text-amber-300/80">
                Virtual account numbers are withheld until issued by Monnify.
              </p>
            </div>
          </div>

          <p className="text-xs text-amber-100/90 leading-relaxed">
            Automated dedicated account creation requires active Monnify merchant credentials on the backend. Per platform security requirements, demo or hardcoded account numbers are never fabricated.
          </p>

          <div className="bg-slate-950/90 border border-amber-500/20 rounded-xl p-3 text-xs space-y-1.5">
            <div className="text-[11px] font-bold text-slate-300">
              Required Backend Environment Variables:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-amber-300 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>MONNIFY_API_KEY</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-300 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>MONNIFY_SECRET_KEY</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-300 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>MONNIFY_CONTRACT_CODE</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-300 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>MONNIFY_BASE_URL</span>
              </div>
            </div>
          </div>

          <div className="pt-1">
            <button
              onClick={loadVirtualAccounts}
              disabled={isLoadingAccounts}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAccounts ? 'animate-spin' : ''}`} />
              <span>Re-check Monnify Configuration</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* Sandbox Instant Credit for testing                             */}
      {/* ============================================================== */}
      <form onSubmit={handleSandboxDeposit} className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 space-y-4 shadow-lg">
        <div className="flex items-center gap-2">
          <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-sm font-bold text-white">Instant Sandbox Top-Up</h3>
            <p className="text-[11px] text-slate-400">
              Developer & QA Sandbox utility: Credit test funds directly to your persistent PostgreSQL wallet balance.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1">Deposit Amount (₦)</label>
          <input
            type="number"
            min="100"
            max="1000000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono font-bold"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isFunding}
          className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2"
        >
          {isFunding ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Processing Deposit...</span>
            </>
          ) : (
            <>
              <Wallet className="w-4 h-4" />
              <span>Simulate Instant Credit (₦{parseFloat(amount || '0').toLocaleString()})</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
