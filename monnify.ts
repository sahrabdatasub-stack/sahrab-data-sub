import crypto from 'crypto';
import { query } from '../db.ts';

// In-memory token cache for Monnify Auth
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

interface MonnifyAccount {
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  accountReference: string;
  reservationReference?: string;
  status: string;
  currencyCode: string;
  issuedBy: 'MONNIFY';
  environment: 'sandbox' | 'production';
  createdOn: string;
}

export interface MonnifyConfigDetails {
  configured: boolean;
  environment: 'sandbox' | 'production';
  baseUrl: string;
  hasApiKey: boolean;
  hasSecretKey: boolean;
  hasContractCode: boolean;
  missingVariables: string[];
  message: string;
}

export function getMonnifyConfigDetails(): MonnifyConfigDetails {
  const apiKey = process.env.MONNIFY_API_KEY?.trim() || '';
  const secretKey = process.env.MONNIFY_SECRET_KEY?.trim() || '';
  const contractCode = process.env.MONNIFY_CONTRACT_CODE?.trim() || '';
  const baseUrl = (process.env.MONNIFY_BASE_URL?.trim() || 'https://sandbox.monnify.com').replace(/\/+$/, '');
  const isSandbox = baseUrl.includes('sandbox');

  const missing: string[] = [];
  if (!apiKey) missing.push('MONNIFY_API_KEY');
  if (!secretKey) missing.push('MONNIFY_SECRET_KEY');
  if (!contractCode) missing.push('MONNIFY_CONTRACT_CODE');

  const configured = missing.length === 0;

  return {
    configured,
    environment: isSandbox ? 'sandbox' : 'production',
    baseUrl,
    hasApiKey: !!apiKey,
    hasSecretKey: !!secretKey,
    hasContractCode: !!contractCode,
    missingVariables: missing,
    message: configured
      ? `Monnify (${isSandbox ? 'Sandbox Test' : 'Live Production'}) integration is configured and active.`
      : `Monnify is not configured. Missing required backend environment variables: ${missing.join(', ')}.`,
  };
}

export function isMonnifyConfigured(): boolean {
  return getMonnifyConfigDetails().configured;
}

/**
 * Obtains or reuses an active OAuth access token from Monnify
 * Official endpoint: POST /api/v1/auth/login
 */
export async function getMonnifyAccessToken(): Promise<string> {
  const config = getMonnifyConfigDetails();
  if (!config.configured) {
    throw new Error('Monnify is not configured. Missing required credentials.');
  }

  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 60000) {
    return cachedToken;
  }

  const apiKey = process.env.MONNIFY_API_KEY!.trim();
  const secretKey = process.env.MONNIFY_SECRET_KEY!.trim();
  const basicAuth = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');

  const response = await fetch(`${config.baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    },
  });

  const data: any = await response.json().catch(() => ({}));

  if (!response.ok || !data.requestSuccessful || !data.responseBody?.accessToken) {
    console.error('[Monnify Auth Error]:', data.responseMessage || response.statusText);
    throw new Error(data.responseMessage || 'Failed to authenticate with Monnify API gateway.');
  }

  const token = data.responseBody.accessToken;
  const expiresInSeconds = Number(data.responseBody.expiresIn) || 3600;

  cachedToken = token;
  tokenExpiresAt = now + (expiresInSeconds * 1000);

  return token;
}

/**
 * Creates or fetches genuine reserved virtual accounts for a user from Monnify
 * Official endpoint: POST /api/v2/bank-transfer/reserved-accounts
 */
export async function createOrFetchReservedAccount(user: {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  bvn?: string;
}): Promise<MonnifyAccount[]> {
  const config = getMonnifyConfigDetails();
  if (!config.configured) {
    throw new Error('Monnify credentials are not configured on the backend.');
  }

  const token = await getMonnifyAccessToken();
  const contractCode = process.env.MONNIFY_CONTRACT_CODE!.trim();
  const accountReference = `sahrab-${user.id}`;
  const cleanName = (user.fullName || 'Customer').trim();
  const accountName = `SAHRAB - ${cleanName}`.substring(0, 100);

  // 1. Try checking if this accountReference already exists in Monnify
  try {
    const checkRes = await fetch(
      `${config.baseUrl}/api/v2/bank-transfer/reserved-accounts/${encodeURIComponent(accountReference)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (checkRes.ok) {
      const checkData: any = await checkRes.json();
      if (checkData.requestSuccessful && Array.isArray(checkData.responseBody?.accounts) && checkData.responseBody.accounts.length > 0) {
        const accounts: MonnifyAccount[] = checkData.responseBody.accounts.map((acc: any) => ({
          bankName: acc.bankName,
          bankCode: acc.bankCode,
          accountNumber: acc.accountNumber,
          accountName: acc.accountName || accountName,
          accountReference,
          reservationReference: checkData.responseBody.reservationReference,
          status: checkData.responseBody.status || 'ACTIVE',
          currencyCode: 'NGN',
          issuedBy: 'MONNIFY',
          environment: config.environment,
          createdOn: new Date().toISOString(),
        }));

        // Persist to user record
        await query('UPDATE users SET virtual_accounts = $1, updated_at = NOW() WHERE id = $2', [
          JSON.stringify(accounts),
          user.id,
        ]);

        return accounts;
      }
    }
  } catch (err) {
    console.warn('[Monnify] Reserved account pre-check error, proceeding to create:', err);
  }

  // 2. Create the reserved account using official Monnify API
  const payload: Record<string, any> = {
    accountReference,
    accountName,
    currencyCode: 'NGN',
    contractCode,
    customerEmail: user.email,
    customerName: cleanName,
    getAllAvailableBanks: true,
  };

  if (user.bvn && /^\d{11}$/.test(user.bvn)) {
    payload.bvn = user.bvn;
  }

  const createRes = await fetch(`${config.baseUrl}/api/v2/bank-transfer/reserved-accounts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const createData: any = await createRes.json().catch(() => ({}));

  if (!createRes.ok || !createData.requestSuccessful || !Array.isArray(createData.responseBody?.accounts)) {
    const errorMsg = createData.responseMessage || createData.error || 'Monnify reserved account creation failed';
    console.error('[Monnify Create Account Error]:', errorMsg);
    throw new Error(errorMsg);
  }

  const rawAccounts = createData.responseBody.accounts;
  if (rawAccounts.length === 0) {
    throw new Error('Monnify returned no bank accounts for the reservation.');
  }

  const accounts: MonnifyAccount[] = rawAccounts.map((acc: any) => ({
    bankName: acc.bankName,
    bankCode: acc.bankCode,
    accountNumber: acc.accountNumber,
    accountName: acc.accountName || accountName,
    accountReference: createData.responseBody.accountReference || accountReference,
    reservationReference: createData.responseBody.reservationReference,
    status: createData.responseBody.status || 'ACTIVE',
    currencyCode: 'NGN',
    issuedBy: 'MONNIFY',
    environment: config.environment,
    createdOn: new Date().toISOString(),
  }));

  // Persist genuine Monnify accounts in user record
  await query('UPDATE users SET virtual_accounts = $1, updated_at = NOW() WHERE id = $2', [
    JSON.stringify(accounts),
    user.id,
  ]);

  return accounts;
}

/**
 * Validates Monnify Webhook signature to ensure the webhook payload actually came from Monnify.
 * Official Monnify webhook signature computation:
 * SHA512(clientSecret + rawBody) or HMAC-SHA512(rawBody, clientSecret)
 */
export function verifyMonnifyWebhookSignature(
  monnifySignature: string | undefined,
  rawBody: string
): boolean {
  if (!monnifySignature) return false;

  const secretKey = process.env.MONNIFY_SECRET_KEY?.trim();
  if (!secretKey) return false;

  try {
    // 1. Monnify Method A: SHA512 of secretKey + rawBody
    const hashA = crypto.createHash('sha512').update(secretKey + rawBody).digest('hex');
    if (crypto.timingSafeEqual(Buffer.from(hashA), Buffer.from(monnifySignature))) {
      return true;
    }

    // 2. Monnify Method B: HMAC-SHA512 of rawBody with secretKey
    const hashB = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');
    if (crypto.timingSafeEqual(Buffer.from(hashB), Buffer.from(monnifySignature))) {
      return true;
    }
  } catch (err) {
    // In case string lengths differ for timingSafeEqual
    const hashA = crypto.createHash('sha512').update(secretKey + rawBody).digest('hex');
    const hashB = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');
    return hashA.toLowerCase() === monnifySignature.toLowerCase() || hashB.toLowerCase() === monnifySignature.toLowerCase();
  }

  return false;
}

/**
 * Verifies a transaction using Monnify's official Transaction Status API
 * Official endpoint: GET /api/v2/transactions/{transactionReference}
 */
export async function verifyMonnifyTransaction(transactionReference: string): Promise<any> {
  const config = getMonnifyConfigDetails();
  if (!config.configured) {
    throw new Error('Monnify is not configured.');
  }

  const token = await getMonnifyAccessToken();
  const encodedRef = encodeURIComponent(transactionReference.trim());

  const response = await fetch(`${config.baseUrl}/api/v2/transactions/${encodedRef}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const data: any = await response.json().catch(() => ({}));

  if (!response.ok || !data.requestSuccessful) {
    throw new Error(data.responseMessage || 'Could not verify transaction with Monnify.');
  }

  return data.responseBody;
}
