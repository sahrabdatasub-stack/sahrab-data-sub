import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { kycApi } from '../../utils/api.ts';
import { 
  Shield, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Lock, 
  FileCheck, 
  ArrowRight, 
  CreditCard, 
  UserCheck,
  ChevronRight,
  Info,
  Camera,
  CameraOff,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  HelpCircle,
  X
} from 'lucide-react';

export const KycScreen: React.FC = () => {
  const { user, showToast, refreshUser, setActiveTab } = useApp();

  // Multi-Step State:
  // step 1: Select Method & Enter Identifier (BVN / NIN)
  // step 2: Face Verification (Camera Capture & Liveness/Match)
  // step 3: Result (Verified or Failure / Provider Status)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Identifier
  const [method, setMethod] = useState<'NIN' | 'BVN'>('NIN');
  const [identifier, setIdentifier] = useState('');
  const [consent, setConsent] = useState(false);
  const [isVerifyingId, setIsVerifyingId] = useState(false);

  // Step 2: Camera & Face Match
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isMatchingFace, setIsMatchingFace] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Provider configuration & verification session info
  const [providerConfig, setProviderConfig] = useState<any>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isCheckingConfig, setIsCheckingConfig] = useState(false);
  const [verificationSession, setVerificationSession] = useState<any>(null);
  const [serverNotice, setServerNotice] = useState<any>(null);
  const [isSkipping, setIsSkipping] = useState(false);

  // Verification result data
  const [verificationResult, setVerificationResult] = useState<any>(null);

  const isVerified = user?.kycStatus === 'verified';

  useEffect(() => {
    loadProviderConfig();
    return () => {
      stopCamera();
    };
  }, []);

  const loadProviderConfig = async () => {
    setIsLoadingConfig(true);
    try {
      const res = await kycApi.getConfig();
      if (res.success) {
        setProviderConfig(res);
      }
    } catch (err: any) {
      console.warn('KYC config check:', err);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // RETRY / RE-CHECK CONFIGURATION ACTION
  const handleCheckConfig = async () => {
    setIsCheckingConfig(true);
    try {
      const res = await kycApi.checkConfig();
      if (res.success) {
        // Also reload full config
        const fullConfig = await kycApi.getConfig();
        if (fullConfig.success) {
          setProviderConfig(fullConfig);
        }
        if (res.provider?.configured) {
          showToast(`Gateway connected: ${res.provider.activeProviderName}`, 'success');
          setServerNotice(null);
        } else {
          showToast('NIN Verification Service Not Configured: Missing PREMBLY_API_KEY.', 'info');
        }
      }
    } catch (err: any) {
      showToast('Could not query verification service status.', 'error');
    } finally {
      setIsCheckingConfig(false);
    }
  };

  // STOP CAMERA HELPER
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  };

  // START CAMERA HELPER
  const startCamera = async () => {
    setCameraError(null);
    setCapturedPhoto(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your current browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera permission denied. Please allow camera access in your browser address bar to continue with face verification.'
          : err.message || 'Unable to initialize front-facing camera.'
      );
      setCameraActive(false);
    }
  };

  // CAPTURE SELFIE FRAME FROM VIDEO
  const captureSelfie = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontally for natural mirror selfie
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Image = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedPhoto(base64Image);
    stopCamera();
  };

  // RETAKE PHOTO
  const handleRetake = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  // SKIP VERIFICATION / VERIFY LATER
  const handleVerifyLater = async () => {
    setIsSkipping(true);
    stopCamera();
    try {
      const res = await kycApi.skipVerification();
      if (res.success) {
        showToast('Identity verification deferred. You can complete KYC anytime from your Profile.', 'info');
        await refreshUser();
      }
    } catch (err: any) {
      console.warn('Skip verification notice:', err);
    } finally {
      setIsSkipping(false);
      setActiveTab('home');
    }
  };

  // STEP 1 SUBMISSION: Verify BVN / NIN
  const handleSubmitStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      showToast('You must consent to NDPR identity verification.', 'error');
      return;
    }

    const cleanId = identifier.trim();
    if (!/^\d{11}$/.test(cleanId)) {
      showToast(`${method} must be exactly 11 numeric digits.`, 'error');
      return;
    }

    setIsVerifyingId(true);
    setServerNotice(null);

    try {
      const res = await kycApi.verifyIdentifier({
        method,
        identifier: cleanId,
        consent: true,
      });

      if (res.success) {
        setVerificationSession(res);
        showToast(`${method} validated. Proceeding to face verification.`, 'success');
        setCurrentStep(2);
      }
    } catch (err: any) {
      // Check if provider is NOT CONFIGURED
      if (
        err.code === 'NIN_SERVICE_NOT_CONFIGURED' ||
        err.code === 'PROVIDER_NOT_CONFIGURED' ||
        err.status === 503 ||
        err.message?.includes('Not Configured')
      ) {
        setServerNotice({
          type: 'PROVIDER_NOT_CONFIGURED',
          title: err.serviceTitle || 'NIN Verification Service Not Configured',
          message: err.message || 'Live identity verification against NIMC/NIBSS requires backend API credentials.',
          details: err.requiredConfiguration || {
            service: 'Prembly (IdentityPass) Gateway',
            envVars: ['PREMBLY_API_KEY', 'PREMBLY_APP_ID'],
          },
          maskedIdentifier: cleanId.slice(0, 3) + '******' + cleanId.slice(-2),
        });
      } else {
        showToast(err.message || 'Verification lookup failed.', 'error');
      }
    } finally {
      setIsVerifyingId(false);
    }
  };

  // STEP 2 SUBMISSION: Face Verification & Biometric Match
  const handleSubmitStep2 = async () => {
    if (!capturedPhoto) {
      showToast('Please capture a clear live face photo first.', 'error');
      return;
    }

    setIsMatchingFace(true);
    setServerNotice(null);

    try {
      const res = await kycApi.submitFaceMatch({
        selfieBase64: capturedPhoto,
        method,
        maskedIdentifier: verificationSession?.maskedIdentifier,
        verificationSessionId: verificationSession?.verificationSessionId,
      });

      if (res.success && res.status === 'VERIFIED') {
        setVerificationResult(res);
        setCurrentStep(3);
        showToast('Identity & facial biometrics verified successfully!', 'success');
        await refreshUser();
      }
    } catch (err: any) {
      if (
        err.code === 'NIN_SERVICE_NOT_CONFIGURED' ||
        err.code === 'PROVIDER_NOT_CONFIGURED' ||
        err.status === 503 ||
        err.message?.includes('Not Configured')
      ) {
        setServerNotice({
          type: 'PROVIDER_NOT_CONFIGURED',
          title: err.serviceTitle || 'NIN Verification Service Not Configured',
          message: err.message || 'Live biometric face comparison requires PREMBLY_API_KEY.',
          details: err.requiredConfiguration || {
            service: 'Prembly 1-to-1 Facial Match Gateway',
            envVars: ['PREMBLY_API_KEY', 'PREMBLY_APP_ID'],
          },
        });
      } else {
        showToast(err.message || 'Facial verification failed.', 'error');
        setVerificationResult({
          status: 'FAILED',
          message: err.message || 'Face match score was below regulatory threshold.',
        });
        setCurrentStep(3);
      }
    } finally {
      setIsMatchingFace(false);
    }
  };

  // STEP INDICATOR HEADER
  const renderStepIndicator = () => (
    <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-2">
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
          currentStep >= 1 ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
        }`}>
          1
        </div>
        <span className={`text-xs font-bold ${currentStep === 1 ? 'text-white' : 'text-slate-400'}`}>
          Method & ID
        </span>
      </div>

      <div className="h-0.5 w-8 sm:w-16 bg-slate-800" />

      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
          currentStep >= 2 ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
        }`}>
          2
        </div>
        <span className={`text-xs font-bold ${currentStep === 2 ? 'text-white' : 'text-slate-400'}`}>
          Face Match
        </span>
      </div>

      <div className="h-0.5 w-8 sm:w-16 bg-slate-800" />

      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
          currentStep === 3 ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
        }`}>
          3
        </div>
        <span className={`text-xs font-bold ${currentStep === 3 ? 'text-white' : 'text-slate-400'}`}>
          Result
        </span>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6 pb-24 sm:pb-8">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-extrabold text-white">Identity Verification (KYC)</h2>
          </div>
          <p className="text-xs text-slate-400">
            Multi-step Central Bank of Nigeria (CBN) Tier 2 and NDPR compliance.
          </p>
        </div>

        {/* Global Skip Button - Never trap users */}
        {!isVerified && (
          <button
            type="button"
            onClick={handleVerifyLater}
            disabled={isSkipping}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 self-start sm:self-auto shrink-0 shadow-sm"
          >
            {isSkipping ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>Verify Later — Continue to Dashboard</span>
          </button>
        )}
      </div>

      {/* Provider Status Diagnostic Banner */}
      {!providerConfig?.provider?.configured ? (
        <div className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-200">
                  NIN Verification Service Not Configured
                </h3>
                <p className="text-[11px] text-amber-300/80">
                  Verification Status: <span className="font-mono font-bold text-white uppercase">{user?.kycStatus === 'verified' ? 'VERIFIED' : 'NOT_CONFIGURED / PENDING'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="px-2.5 py-1 rounded-full bg-amber-950/90 border border-amber-500/50 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                NOT CONFIGURED
              </span>
            </div>
          </div>

          <p className="text-xs text-amber-100/90 leading-relaxed">
            Direct or aggregated access to the National Identity Management Commission (NIMC) database and NIBSS Bank Verification Number (BVN) registry requires active credentials from an authorized verification provider (such as Prembly / IdentityPass, Dojah, or Seamfix). No provider API credentials are currently configured on the backend.
          </p>

          {/* Missing Credentials Checklist */}
          <div className="bg-slate-950/90 border border-amber-500/20 rounded-xl p-3 text-xs space-y-2">
            <div className="text-[11px] font-bold text-slate-300">
              Required Backend Credentials (Currently Missing):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-amber-300 font-mono">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                <span>PREMBLY_API_KEY (Missing)</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-300 font-mono">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                <span>PREMBLY_APP_ID (Missing)</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 pt-1.5 border-t border-slate-800">
              Per Central Bank of Nigeria (CBN) and NDPR data protection regulations, mock or fabricated identity matches are strictly prohibited. Your account remains safe with full customer data bundle and airtime privileges.
            </p>
          </div>

          {/* Action Row: Retry Check & Verify Later */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleCheckConfig}
              disabled={isCheckingConfig}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingConfig ? 'animate-spin' : ''}`} />
              <span>Check Configuration Again</span>
            </button>

            <button
              type="button"
              onClick={handleVerifyLater}
              disabled={isSkipping}
              className="px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              <span>Verify Later — Continue to Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-300" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                NIN & BVN Verification Service Active
              </h3>
              <p className="text-[11px] text-emerald-300">
                Gateway: <span className="font-semibold">{providerConfig.provider.activeProviderName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
              LIVE CONFIGURED
            </span>
            <button
              type="button"
              onClick={handleCheckConfig}
              disabled={isCheckingConfig}
              title="Refresh provider status"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingConfig ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* CASE A: ALREADY FULLY VERIFIED                                 */}
      {/* ============================================================== */}
      {isVerified ? (
        <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-2xl p-6 text-center space-y-4 shadow-xl">
          <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
          <h3 className="text-xl font-black text-white">Identity Fully Verified</h3>
          <p className="text-xs text-emerald-200 max-w-md mx-auto leading-relaxed">
            Your Tier 2 status is active with official NIMC & NIBSS registries. Bank withdrawals, high-value wallet transactions, and full platform access are completely unlocked.
          </p>

          <div className="pt-2">
            <button
              onClick={() => setActiveTab('home')}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-2 shadow-md"
            >
              <span>Return to Dashboard</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6 shadow-xl">
          {renderStepIndicator()}

          {/* ============================================================== */}
          {/* STEP 1: SELECT METHOD & ENTER BVN OR NIN                       */}
          {/* ============================================================== */}
          {currentStep === 1 && (
            <form onSubmit={handleSubmitStep1} className="space-y-5">
              {/* Optional Notice */}
              <div className="bg-emerald-950/30 border border-emerald-500/30 p-3.5 rounded-xl text-xs text-emerald-300 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-white block">Optional For Everyday Customer Use:</span>
                  <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                    Identity verification is optional for purchasing mobile data bundles, airtime top-ups, and funding your wallet. You can skip now and verify later from your Profile whenever you want to enable bank withdrawals.
                  </p>
                </div>
              </div>

              {/* Method Selection (BVN vs NIN) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  Step 1: Select Verification Identifier (Only One Required)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMethod('NIN');
                      setIdentifier('');
                      setServerNotice(null);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all relative ${
                      method === 'NIN'
                        ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-sm text-emerald-400">NIN</span>
                      <UserCheck className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-[11px] text-slate-300 font-semibold">National Identification Number</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">NIMC Registry</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMethod('BVN');
                      setIdentifier('');
                      setServerNotice(null);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all relative ${
                      method === 'BVN'
                        ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-sm text-emerald-400">BVN</span>
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-[11px] text-slate-300 font-semibold">Bank Verification Number</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Central Bank / NIBSS</div>
                  </button>
                </div>
              </div>

              {/* 11-digit Input Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-300">
                    Enter 11-Digit {method}
                  </label>
                  <span className={`text-[11px] font-mono font-bold ${
                    identifier.length === 11 ? 'text-emerald-400' : 'text-slate-500'
                  }`}>
                    {identifier.length} / 11 digits
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={11}
                  placeholder={`Enter 11-digit ${method} (e.g. 12345678901)`}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono tracking-widest"
                  required
                />
              </div>

              {/* Explicit NDPR Consent Checkbox */}
              <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                  required
                />
                <span className="text-[11px] leading-relaxed text-slate-400">
                  I grant explicit consent to SAHRAB DATA SUB to verify my {method} records and biometric image with official Nigerian registries in strict compliance with the Nigerian Data Protection Regulation (NDPR).
                </span>
              </label>

              {/* Security & Masking Notice */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Encrypted in transit. Raw {method} values are never logged or stored in plaintext.
                </span>
              </div>

              {/* Provider NOT CONFIGURED Honest Notice */}
              {serverNotice && serverNotice.type === 'PROVIDER_NOT_CONFIGURED' && (
                <div className="bg-amber-950/40 border border-amber-500/50 rounded-2xl p-4 text-xs text-amber-200 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-extrabold text-amber-300 text-sm">{serverNotice.title}</h4>
                      <p className="text-[11px] text-amber-200/90 mt-1 leading-relaxed">
                        {serverNotice.message}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-xl border border-amber-500/30 text-[11px] space-y-1">
                    <div className="font-bold text-slate-300">Required Backend Configuration:</div>
                    <div className="text-slate-400">
                      Service: <span className="text-amber-300 font-mono">{serverNotice.details?.service}</span>
                    </div>
                    <div className="text-slate-400">
                      Environment Variables: <span className="text-amber-300 font-mono">PREMBLY_API_KEY, PREMBLY_APP_ID</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-amber-400/80 italic">
                    Per regulatory security guidelines, mock verifications or unverified selfies will never be certified as verified.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCheckConfig}
                      disabled={isCheckingConfig}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isCheckingConfig ? 'animate-spin' : ''}`} />
                      <span>Check Configuration Again</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleVerifyLater}
                      className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <span>Verify Later — Continue to Dashboard</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={isVerifyingId || identifier.length !== 11 || !consent}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {isVerifyingId ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying with Official Registry...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4" />
                      <span>Proceed to Face Verification</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleVerifyLater}
                  disabled={isSkipping}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Verify Later — Continue to Dashboard</span>
                </button>
              </div>
            </form>
          )}

          {/* ============================================================== */}
          {/* STEP 2: FACE VERIFICATION (CAMERA CAPTURE & LIVENESS)          */}
          {/* ============================================================== */}
          {currentStep === 2 && (
            <div className="space-y-5">
              {/* Regulatory explanation */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-white">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span>Why is a Live Face Check Required?</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Under Central Bank of Nigeria (CBN) and NDPR biometric regulations, a 1-to-1 face match against your official identity photograph on file with NIMC/NIBSS is required to prevent identity theft. A simple photo alone cannot be certified without genuine provider biometric comparison.
                </p>
              </div>

              {/* Camera Guide instructions */}
              <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-slate-400">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="font-bold text-slate-200 block mb-0.5">1. Position</span>
                  <span>Center face inside the oval</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="font-bold text-slate-200 block mb-0.5">2. Lighting</span>
                  <span>Avoid glare and shadows</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="font-bold text-slate-200 block mb-0.5">3. Neutral</span>
                  <span>No glasses, hats, or masks</span>
                </div>
              </div>

              {/* Camera Viewport / Captured Preview */}
              <div className="relative rounded-2xl bg-black overflow-hidden border border-slate-700 min-h-[300px] flex items-center justify-center">
                {/* Camera error */}
                {cameraError && (
                  <div className="p-6 text-center text-xs text-rose-300 space-y-2">
                    <CameraOff className="w-8 h-8 text-rose-400 mx-auto" />
                    <p className="max-w-xs">{cameraError}</p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-xs"
                    >
                      Retry Camera
                    </button>
                  </div>
                )}

                {/* Live Camera Stream */}
                {cameraActive && !capturedPhoto && (
                  <div className="relative w-full h-[320px] flex items-center justify-center">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="w-full h-full object-cover transform scale-x-[-1]"
                    />

                    {/* Oval Face Positioning Guide Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-48 h-64 rounded-[50%] border-2 border-dashed border-emerald-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] flex items-center justify-center">
                        <span className="text-[10px] uppercase font-bold text-emerald-300 bg-black/60 px-2 py-0.5 rounded-full">
                          Align Face Here
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Captured Photo Preview */}
                {capturedPhoto && (
                  <div className="relative w-full h-[320px] flex items-center justify-center">
                    <img
                      src={capturedPhoto}
                      alt="Captured Selfie"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-3 left-3 bg-black/70 px-2.5 py-1 rounded-lg text-[10px] font-bold text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Live Frame Captured</span>
                    </div>
                  </div>
                )}

                {/* Initial Inactive State */}
                {!cameraActive && !capturedPhoto && !cameraError && (
                  <div className="p-8 text-center text-slate-400 space-y-3">
                    <Camera className="w-12 h-12 mx-auto text-emerald-400" />
                    <div>
                      <h4 className="text-sm font-bold text-white">Camera Access Required</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Click below to enable your camera and take a live verification selfie.</p>
                    </div>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Start Front Camera</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Camera Controls */}
              <div className="flex items-center justify-center gap-3">
                {cameraActive && !capturedPhoto && (
                  <button
                    type="button"
                    onClick={captureSelfie}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg transition-all flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture Live Selfie</span>
                  </button>
                )}

                {capturedPhoto && (
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retake Photo</span>
                  </button>
                )}
              </div>

              {/* Provider NOT CONFIGURED Notice */}
              {serverNotice && serverNotice.type === 'PROVIDER_NOT_CONFIGURED' && (
                <div className="bg-amber-950/40 border border-amber-500/50 rounded-2xl p-4 text-xs text-amber-200 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-extrabold text-amber-300 text-sm">{serverNotice.title}</h4>
                      <p className="text-[11px] text-amber-200/90 mt-1 leading-relaxed">
                        {serverNotice.message}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-xl border border-amber-500/30 text-[11px] space-y-1">
                    <div className="font-bold text-slate-300">Required Biometric Gateway:</div>
                    <div className="text-slate-400">
                      Service: <span className="text-amber-300 font-mono">Prembly 1-to-1 Facial Match API</span>
                    </div>
                    <div className="text-slate-400">
                      Environment Variable: <span className="text-amber-300 font-mono">PREMBLY_API_KEY</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-amber-400/80 italic">
                    Per regulatory constraints, mock facial verification will not be simulated. You can select "Verify Later — Continue to Dashboard" to access your account.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCheckConfig}
                      disabled={isCheckingConfig}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isCheckingConfig ? 'animate-spin' : ''}`} />
                      <span>Check Configuration Again</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleVerifyLater}
                      className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <span>Verify Later — Continue to Dashboard</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2 Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleSubmitStep2}
                  disabled={isMatchingFace || !capturedPhoto}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {isMatchingFace ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Comparing Biometrics with Official Photo...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4" />
                      <span>Submit Face For Verification</span>
                    </>
                  )}
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      setCurrentStep(1);
                    }}
                    className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors"
                  >
                    Back to Step 1
                  </button>

                  <button
                    type="button"
                    onClick={handleVerifyLater}
                    className="w-1/2 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs rounded-xl transition-colors"
                  >
                    Verify Later
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 3: VERIFICATION RESULT                                   */}
          {/* ============================================================== */}
          {currentStep === 3 && verificationResult && (
            <div className="space-y-5 text-center">
              {verificationResult.status === 'VERIFIED' ? (
                <div className="space-y-4">
                  <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
                  <h3 className="text-xl font-black text-white">Verification Succeeded</h3>
                  <p className="text-xs text-emerald-200 max-w-md mx-auto">
                    {verificationResult.message}
                  </p>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-left max-w-sm mx-auto space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status:</span>
                      <span className="font-bold text-emerald-400">VERIFIED TIER 2</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Facial Match Score:</span>
                      <span className="font-bold text-white">{verificationResult.matchScore}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Registry:</span>
                      <span className="text-white">NIMC / NIBSS Verified</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('home')}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-2 shadow-md"
                  >
                    <span>Proceed to Customer Dashboard</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <AlertCircle className="w-14 h-14 text-rose-400 mx-auto" />
                  <h3 className="text-xl font-black text-white">Verification Incomplete</h3>
                  <p className="text-xs text-rose-200 max-w-md mx-auto">
                    {verificationResult.message || 'We could not verify your identity biometrics.'}
                  </p>

                  <div className="flex justify-center gap-3 pt-2">
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      Try Again
                    </button>

                    <button
                      onClick={handleVerifyLater}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      Verify Later — Continue
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
