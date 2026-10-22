import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.ts';
import { requireAuth } from '../middleware/auth.ts';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'sahrab-data-sub-secure-jwt-secret-key-2026';

// Register Endpoint
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { fullName, email, phone, phoneNumber, pin, password, passwordConfirm, confirmPassword } = req.body;
    const finalPhone = (phone || phoneNumber || '').trim();
    const finalPassword = password || '';
    const finalConfirm = passwordConfirm || confirmPassword || '';

    // 1. Full name validation (Bank standard: minimum 2 name parts)
    if (!fullName || typeof fullName !== 'string' || fullName.trim().split(/\s+/).length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your full legal name (minimum first and last name).'
      });
    }

    // 2. Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim().toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }
    const cleanEmail = email.trim().toLowerCase();

    // 3. Nigerian phone format validation
    const cleanPhone = finalPhone.replace(/\s+/g, '').replace(/^\+234/, '0');
    const ngPhoneRegex = /^0(7|8|9)(0|1)\d{8}$/;
    if (!ngPhoneRegex.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 11-digit Nigerian phone number (e.g. 08012345678).'
      });
    }

    // 4. Password validation
    if (!finalPassword || finalPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }
    if (finalConfirm && finalPassword !== finalConfirm) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.'
      });
    }

    // 5. Check duplicate email or phone in PostgreSQL
    const existing = await query(
      'SELECT id, email, phone FROM users WHERE email = $1 OR phone = $2',
      [cleanEmail, cleanPhone]
    );

    if (existing.rows.length > 0) {
      const match = existing.rows[0];
      if (match.email === cleanEmail) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email address already exists. Please log in.'
        });
      }
      return res.status(409).json({
        success: false,
        message: 'An account with this phone number already exists.'
      });
    }

    // 6. Secure Password Hashing
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(finalPassword, salt);

    // 7. Generate User ID
    const userId = `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const referralCode = `SAH${Math.floor(100000 + Math.random() * 900000)}`;

    // 8. MANDATORY DEFAULT POSITION: CUSTOMER
    // Users can NEVER assign themselves privileged positions!
    const defaultRole = 'customer';
    const defaultPosition = 'CUSTOMER';

    const insertResult = await query(
      `INSERT INTO users (
        id, full_name, email, phone, role, position, password_hash, transaction_pin, 
        wallet_balance, commission_balance, kyc_status, referral_code, status, 
        appointed_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW(), NOW())
      RETURNING id, full_name, email, phone, role, position, wallet_balance, commission_balance, kyc_status, status, appointed_at`,
      [
        userId,
        fullName.trim(),
        cleanEmail,
        cleanPhone,
        defaultRole,
        defaultPosition,
        passwordHash,
        pin || '1234',
        '0.00',
        '0.00',
        'not_verified',
        referralCode,
        'active',
      ]
    );

    const newUser = insertResult.rows[0];

    // Sign JWT token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role, position: newUser.position },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully. Welcome to SAHRAB DATA SUB!',
      token,
      user: {
        id: newUser.id,
        fullName: newUser.full_name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        position: newUser.position,
        walletBalance: newUser.wallet_balance,
        commissionBalance: newUser.commission_balance,
        kycStatus: newUser.kyc_status,
        status: newUser.status,
        appointedAt: newUser.appointed_at,
      },
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({
      success: false,
      message: 'Unable to complete registration due to a server error. Please try again.'
    });
  }
});

// Login Endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, phone, password } = req.body;
    const identifier = (email || phone || '').trim().toLowerCase();

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email/phone and password.'
      });
    }

    // Lookup user by email or phone
    const result = await query(
      `SELECT id, full_name, email, phone, role, position, assigned_team, supervisor_id, supervisor_name, state_region, appointed_at, password_hash, status, wallet_balance, commission_balance, kyc_status 
       FROM users 
       WHERE email = $1 OR phone = $1`,
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your email/phone and password.'
      });
    }

    const user = result.rows[0];

    // Check account status
    if (user.status === 'deactivated' || user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: `Your SAHRAB account has been ${user.status}. Please contact customer care.`
      });
    }

    // Verify Password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your email/phone and password.'
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, position: user.position || 'CUSTOMER' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        position: user.position || 'CUSTOMER',
        assignedTeam: user.assigned_team,
        supervisorId: user.supervisor_id,
        supervisorName: user.supervisor_name,
        stateRegion: user.state_region,
        appointedAt: user.appointed_at,
        walletBalance: user.wallet_balance || '0.00',
        commissionBalance: user.commission_balance || '0.00',
        kycStatus: user.kyc_status || 'not_verified',
        status: user.status,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error during login. Please try again.'
    });
  }
});

// Me Endpoint (Fetches fresh database state)
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  return res.json({
    success: true,
    user: req.user,
  });
});

// Password Reset Endpoint
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and new password (min 6 chars).'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const userCheck = await query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No user account found with this email address.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2',
      [passwordHash, cleanEmail]
    );

    return res.json({
      success: true,
      message: 'Password reset successfully. You may now log in with your new password.'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Password reset failed.' });
  }
});

export default router;
