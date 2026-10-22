import { Router, Request, Response } from 'express';
import { query } from '../db.ts';
import { requireAuth } from '../middleware/auth.ts';

const router = Router();

// Helper to mask sensitive identifiers (NIN / BVN) - Never log or expose raw values
function maskIdentifier(idStr: string): string {
  if (!idStr || idStr.length < 6) return '******';
  return idStr.slice(0, 3) + '******' + idStr.slice(-2);
}

// Provider detection and configuration metadata
interface ProviderDetails {
  configured: boolean;
  activeProviderName: string;
  statusText: 'CONFIGURED' | 'NOT_CONFIGURED';
  serviceTitle: string;
  supportedMethods: ('BVN' | 'NIN')[];
  biometricFaceMatchSupported: boolean;
  requiredCredentials: string[];
  missingCredentials: string[];
  regulatoryCompliance: string;
  message: string;
  setupInstructions: string;
}

function getProviderDetails(): ProviderDetails {
  const hasPrembly = !!(process.env.PREMBLY_API_KEY && process.env.PREMBLY_APP_ID);
  const hasDojah = !!(process.env.DOJAH_API_KEY && process.env.DOJAH_APP_ID);
  const hasSeamfix = !!(process.env.SEAMFIX_API_KEY && process.env.SEAMFIX_USER_ID);
  const hasNimcDirect = !!(process.env.NIMC_API_KEY && process.env.NIMC_CLIENT_ID);
  const hasIdentityPassLegacy = !!process.env.IDENTITY_PASS_KEY;

  const configured = hasPrembly || hasDojah || hasSeamfix || hasNimcDirect || hasIdentityPassLegacy;

  let activeProviderName = 'None';
  let biometricFaceMatchSupported = false;

  if (hasPrembly || hasIdentityPassLegacy) {
    activeProviderName = 'Prembly (IdentityPass) Gateway';
    biometricFaceMatchSupported = true;
  } else if (hasDojah) {
    activeProviderName = 'Dojah Identity Gateway';
    biometricFaceMatchSupported = true;
  } else if (hasSeamfix) {
    activeProviderName = 'Seamfix (Verified.africa)';
    biometricFaceMatchSupported = true;
  } else if (hasNimcDirect) {
    activeProviderName = 'Direct NIMC Enterprise Gateway';
    biometricFaceMatchSupported = false;
  }

  const missing: string[] = [];
  if (!configured) {
    missing.push('PREMBLY_API_KEY', 'PREMBLY_APP_ID');
  }

  return {
    configured,
    activeProviderName,
    statusText: configured ? 'CONFIGURED' : 'NOT_CONFIGURED',
    serviceTitle: configured ? `${activeProviderName} Active` : 'NIN Verification Service Not Configured',
    supportedMethods: ['BVN', 'NIN'],
    biometricFaceMatchSupported,
    requiredCredentials: ['PREMBLY_API_KEY', 'PREMBLY_APP_ID'],
    missingCredentials: missing,
    regulatoryCompliance: 'National Identity Management Commission (NIMC) & Central Bank of Nigeria (CBN)',
    message: configured
      ? `Live verification with ${activeProviderName} is active.`
      : 'NIN Verification Service Not Configured: No authorized identity-verification provider credentials were found on the backend. Direct or aggregated access to the National Identity Database (NIMC) and NIBSS requires active credentials from an approved verification provider (such as Prembly / IdentityPass, Dojah, or Seamfix).',
    setupInstructions: 'To configure live verification, obtain verified aggregator API keys from Prembly (IdentityPass) at https://myidentitypass.com or Dojah at https://dojah.io and configure PREMBLY_API_KEY and PREMBLY_APP_ID in your environment.',
  };
}

// 1. GET Provider Configuration & User Verification Standing
router.get('/config', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const resDb = await query('SELECT kyc_status, kyc_record FROM users WHERE id = $1', [user.id]);
    const row = resDb.rows[0];
    const status = row?.kyc_status || 'not_started';

    // Count attempts in last 24h to prevent fraudulent attempts
    const attemptsDb = await query(
      `SELECT COUNT(*) FROM kyc_verification_attempts 
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
      [user.id]
    );
    const attemptsCount = parseInt(attemptsDb.rows[0]?.count || '0');

    return res.json({
      success: true,
      provider: getProviderDetails(),
      currentKycStatus: status,
      isVerified: status === 'verified',
      kycRecord: row?.kyc_record || null,
      attemptsRemaining: Math.max(0, 5 - attemptsCount),
      maxAttemptsDaily: 5,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve KYC configuration.' });
  }
});

// Re-check configuration on demand
router.post('/check-config', requireAuth, async (_req: Request, res: Response) => {
  return res.json({
    success: true,
    provider: getProviderDetails(),
    checkedAt: new Date().toISOString(),
  });
});

// 2. GET Current Status
router.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const resDb = await query('SELECT kyc_status, kyc_record FROM users WHERE id = $1', [user.id]);
    const row = resDb.rows[0];
    const status = row?.kyc_status || 'not_started';

    return res.json({
      success: true,
      kycStatus: status,
      isVerified: status === 'verified',
      provider: getProviderDetails(),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve KYC status.' });
  }
});

// 3. STEP 1 & 2: Select Identity Method & Verify BVN/NIN with Provider
router.post('/step1-verify-id', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { method, identifier, consent } = req.body;

    // A. Validate Consent
    if (!consent) {
      return res.status(400).json({
        success: false,
        message: 'Explicit user consent is strictly required under NDPR regulations before identity verification can proceed.'
      });
    }

    // B. Validate Method
    const normMethod = String(method || '').toUpperCase().trim();
    if (normMethod !== 'BVN' && normMethod !== 'NIN') {
      return res.status(400).json({
        success: false,
        message: 'Invalid identification method. Please select either BVN or NIN.'
      });
    }

    // C. Validate Identifier Format (11 Digits)
    const cleanId = String(identifier || '').trim();
    if (!/^\d{11}$/.test(cleanId)) {
      return res.status(400).json({
        success: false,
        message: `${normMethod} must be exactly 11 numeric digits.`
      });
    }

    const masked = maskIdentifier(cleanId);
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    // D. Fraud Prevention & Rate Limiting (Max 5 attempts / 24 hours per user)
    const attemptsDb = await query(
      `SELECT COUNT(*) FROM kyc_verification_attempts 
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
      [user.id]
    );
    const attemptsCount = parseInt(attemptsDb.rows[0]?.count || '0');
    if (attemptsCount >= 5) {
      return res.status(429).json({
        success: false,
        code: 'ATTEMPTS_EXCEEDED',
        message: 'Daily identity verification attempt limit exceeded (5 attempts). Please wait 24 hours or contact SAHRAB support.'
      });
    }

    // E. Provider Verification Check
    const providerInfo = getProviderDetails();
    const attemptId = `att-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    if (!providerInfo.configured) {
      // Record audit attempt
      await query(
        `INSERT INTO kyc_verification_attempts (id, user_id, method, identifier_masked, status, failure_reason, ip_address, created_at)
         VALUES ($1, $2, $3, $4, 'BLOCKED_PROVIDER_NOT_CONFIGURED', $5, $6, NOW())`,
        [attemptId, user.id, normMethod, masked, 'NIN Verification Service Not Configured: Missing provider API keys', clientIp]
      );

      // Log only masked identifier — NEVER raw values
      console.log(`[KYC Step 1] User ${user.id} submitted ${normMethod} (${masked}) - Blocked: ${providerInfo.serviceTitle}`);

      return res.status(503).json({
        success: false,
        code: 'NIN_SERVICE_NOT_CONFIGURED',
        providerConfigured: false,
        serviceTitle: 'NIN Verification Service Not Configured',
        message: 'NIN Verification Service Not Configured: No authorized identity-verification provider credentials were found on the backend. Live verification with the National Identity Management Commission (NIMC) and NIBSS requires active credentials from an approved verification gateway (e.g., PREMBLY_API_KEY and PREMBLY_APP_ID).',
        requiredConfiguration: {
          service: 'Prembly (IdentityPass) API Gateway',
          envVars: ['PREMBLY_API_KEY', 'PREMBLY_APP_ID'],
          endpointsRequired: [
            normMethod === 'BVN' ? '/api/v1/biometrics/merchant/data/verification/bvn_validation' : '/api/v1/biometrics/merchant/data/verification/nin_validation',
            '/api/v1/biometrics/merchant/face/match'
          ]
        },
        maskedIdentifier: masked,
        canRetry: true,
        canSkip: true,
        helpMessage: 'You can select "Verify Later — Continue to Dashboard" to enjoy all customer features like purchasing data and airtime.'
      });
    }

    // F. When real provider credentials ARE configured:
    // Call live Prembly/Identitypass API securely from backend
    try {
      const premblyKey = process.env.PREMBLY_API_KEY || process.env.IDENTITY_PASS_KEY!;
      const premblyAppId = process.env.PREMBLY_APP_ID || '';
      const url = normMethod === 'BVN'
        ? 'https://api.myidentitypass.com/api/v1/biometrics/merchant/data/verification/bvn_validation'
        : 'https://api.myidentitypass.com/api/v1/biometrics/merchant/data/verification/nin_validation';

      const headers: Record<string, string> = {
        'x-api-key': premblyKey,
        'Content-Type': 'application/json',
      };
      if (premblyAppId) headers['app-id'] = premblyAppId;

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ number: cleanId }),
      });

      const providerData: any = await response.json();

      if (!response.ok || !providerData.status) {
        await query(
          `INSERT INTO kyc_verification_attempts (id, user_id, method, identifier_masked, status, failure_reason, ip_address, created_at)
           VALUES ($1, $2, $3, $4, 'FAILED_PROVIDER_LOOKUP', $5, $6, NOW())`,
          [attemptId, user.id, normMethod, masked, providerData.detail || 'Registry lookup failed', clientIp]
        );

        return res.status(400).json({
          success: false,
          code: 'PROVIDER_LOOKUP_FAILED',
          message: providerData.detail || `We could not verify this ${normMethod} with the national registry. Please check the digits and try again.`
        });
      }

      // Check if provider supports biometric face match
      const biometricSupported = providerInfo.biometricFaceMatchSupported;

      if (!biometricSupported) {
        // Direct NIMC or provider without face-matching: mark verified directly upon verified registry match
        const kycRecord = {
          status: 'verified',
          provider: providerInfo.activeProviderName,
          method: normMethod,
          identifierMasked: masked,
          verifiedName: providerData.data?.full_name || providerData.data?.firstname || user.fullName,
          verifiedAt: new Date().toISOString(),
          providerReference: providerData.reference || attemptId,
        };

        await query(
          `UPDATE users SET kyc_status = 'verified', kyc_record = $1, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(kycRecord), user.id]
        );

        return res.json({
          success: true,
          status: 'VERIFIED',
          message: `${normMethod} verified successfully against official registry. Tier 2 limits active.`,
          proceedToFaceMatch: false,
          maskedIdentifier: masked,
        });
      }

      // Record successful step 1 and generate verification session token for Step 3 (Face Match)
      const verificationSessionId = `vses-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
      await query(
        `INSERT INTO kyc_verification_attempts (id, user_id, method, identifier_masked, status, provider_reference, ip_address, created_at)
         VALUES ($1, $2, $3, $4, 'STEP1_VERIFIED', $5, $6, NOW())`,
        [attemptId, user.id, normMethod, masked, providerData.reference || verificationSessionId, clientIp]
      );

      return res.json({
        success: true,
        message: `${normMethod} verified successfully against official registry. Proceeding to face verification.`,
        verificationSessionId,
        proceedToFaceMatch: true,
        maskedIdentifier: masked,
        verifiedName: providerData.data?.full_name || providerData.data?.firstname || user.fullName,
        hasOfficialPhoto: !!providerData.data?.photo,
      });
    } catch (providerErr: any) {
      console.error('[KYC Provider Request Error]:', providerErr);
      return res.status(502).json({
        success: false,
        message: 'Could not connect to identity verification provider gateway. Please try again shortly.'
      });
    }
  } catch (err: any) {
    console.error('KYC step 1 error:', err);
    return res.status(500).json({ success: false, message: 'Server error processing verification step 1.' });
  }
});

// 4. STEP 3 & 4: Face Verification & Biometric Result Validation
router.post('/step2-face-match', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { selfieBase64, method, maskedIdentifier, verificationSessionId } = req.body;

    if (!selfieBase64 || typeof selfieBase64 !== 'string' || !selfieBase64.startsWith('data:image/')) {
      return res.status(400).json({
        success: false,
        message: 'A valid live camera image is required for biometric face verification.'
      });
    }

    const providerInfo = getProviderDetails();
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const attemptId = `att-face-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    if (!providerInfo.configured) {
      await query(
        `INSERT INTO kyc_verification_attempts (id, user_id, method, identifier_masked, status, failure_reason, ip_address, created_at)
         VALUES ($1, $2, $3, $4, 'BLOCKED_PROVIDER_NOT_CONFIGURED', $5, $6, NOW())`,
        [attemptId, user.id, method || 'BIOMETRIC', maskedIdentifier || 'NONE', 'Biometric comparison provider not configured', clientIp]
      );

      return res.status(503).json({
        success: false,
        code: 'NIN_SERVICE_NOT_CONFIGURED',
        providerConfigured: false,
        serviceTitle: 'NIN Verification Service Not Configured',
        message: 'NIN Verification Service Not Configured: Live biometric comparison requires an authorized verification provider (PREMBLY_API_KEY). A simple camera selfie cannot be certified as an official biometric match without provider validation.',
        requiredConfiguration: {
          service: 'Prembly 1-to-1 Biometric Facial Comparison API',
          envVars: ['PREMBLY_API_KEY', 'PREMBLY_APP_ID']
        },
        canRetry: true,
        canSkip: true
      });
    }

    // Call live Prembly Biometric Face Match API if configured
    try {
      const premblyKey = process.env.PREMBLY_API_KEY || process.env.IDENTITY_PASS_KEY!;
      const premblyAppId = process.env.PREMBLY_APP_ID || '';

      const headers: Record<string, string> = {
        'x-api-key': premblyKey,
        'Content-Type': 'application/json',
      };
      if (premblyAppId) headers['app-id'] = premblyAppId;

      const response = await fetch('https://api.myidentitypass.com/api/v1/biometrics/merchant/face/match', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          image_one: selfieBase64,
          session_id: verificationSessionId,
        }),
      });

      const faceResult: any = await response.json();
      const matchScore = parseFloat(faceResult.confidence || faceResult.match_score || 0);

      // CBN standard: >= 85% match confidence required
      if (matchScore >= 85) {
        const kycRecord = {
          status: 'verified',
          provider: providerInfo.activeProviderName,
          method: method || 'BVN_NIN',
          identifierMasked: maskedIdentifier || 'Verified',
          facialMatchScore: matchScore,
          verifiedAt: new Date().toISOString(),
          providerReference: faceResult.reference || attemptId,
        };

        await query(
          `UPDATE users 
           SET kyc_status = 'verified', 
               kyc_record = $1, 
               updated_at = NOW() 
           WHERE id = $2`,
          [JSON.stringify(kycRecord), user.id]
        );

        await query(
          `INSERT INTO kyc_verification_attempts (id, user_id, method, identifier_masked, status, provider_reference, ip_address, created_at)
           VALUES ($1, $2, $3, $4, 'VERIFIED_SUCCESSFUL', $5, $6, NOW())`,
          [attemptId, user.id, method || 'BIOMETRIC', maskedIdentifier || 'Verified', faceResult.reference || attemptId, clientIp]
        );

        return res.json({
          success: true,
          status: 'VERIFIED',
          message: 'Identity and facial biometrics verified successfully! Tier 2 banking limits are now active.',
          matchScore,
        });
      } else {
        await query(
          `UPDATE users SET kyc_status = 'failed', updated_at = NOW() WHERE id = $1`,
          [user.id]
        );

        return res.status(400).json({
          success: false,
          code: 'FACE_MISMATCH',
          message: `Facial match score (${matchScore}%) was below the required 85% threshold. Please ensure you are in a well-lit area without glasses or hats, and try again.`
        });
      }
    } catch (providerErr: any) {
      console.error('[Biometric Provider Error]:', providerErr);
      return res.status(502).json({
        success: false,
        message: 'Error communicating with biometric verification gateway.'
      });
    }
  } catch (err: any) {
    console.error('KYC face match error:', err);
    return res.status(500).json({ success: false, message: 'Server error processing face verification.' });
  }
});

// 5. POST Skip / Defer KYC Verification (Optional KYC)
router.post('/skip', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const checkDb = await query('SELECT kyc_status FROM users WHERE id = $1', [user.id]);
    const currentStatus = checkDb.rows[0]?.kyc_status;

    let newStatus = currentStatus;
    if (currentStatus !== 'verified') {
      newStatus = 'pending';
      await query(
        `UPDATE users SET kyc_status = $1, updated_at = NOW() WHERE id = $2`,
        [newStatus, user.id]
      );
    }

    return res.json({
      success: true,
      message: 'Identity verification deferred. You can complete verification anytime from your Profile.',
      kycStatus: newStatus || 'pending',
      canProceed: true,
    });
  } catch (err: any) {
    console.error('KYC skip error:', err);
    return res.status(500).json({ success: false, message: 'Failed to defer identity verification.' });
  }
});

// Backward-compatible verify route (maps to step 1)
router.post('/verify', requireAuth, async (req: Request, res: Response) => {
  try {
    const { nin, bvn, consent } = req.body;
    const method = nin ? 'NIN' : 'BVN';
    const identifier = nin || bvn;
    req.body.method = method;
    req.body.identifier = identifier;

    const cleanId = String(identifier || '').trim();
    if (!cleanId || !/^\d{11}$/.test(cleanId)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 11-digit BVN or NIN.' });
    }

    const masked = maskIdentifier(cleanId);
    const providerInfo = getProviderDetails();

    if (!providerInfo.configured) {
      return res.status(503).json({
        success: false,
        code: 'NIN_SERVICE_NOT_CONFIGURED',
        serviceTitle: 'NIN Verification Service Not Configured',
        message: 'NIN Verification Service Not Configured: Live verification against NIMC/NIBSS requires authorized provider credentials (PREMBLY_API_KEY and PREMBLY_APP_ID).',
        maskedIdentifier: masked,
        canRetry: true,
        canSkip: true,
      });
    }

    return res.status(503).json({
      success: false,
      code: 'NIN_SERVICE_NOT_CONFIGURED',
      message: 'Provider integration in maintenance. You can select "Verify Later — Continue to Dashboard" to proceed.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'KYC processing error.' });
  }
});

export default router;
