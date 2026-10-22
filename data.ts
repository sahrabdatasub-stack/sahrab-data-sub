import { Router, Request, Response } from 'express';
import { query } from '../db.ts';
import { requireAuth } from '../middleware/auth.ts';

const router = Router();

// GET data plans
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const network = req.query.network as string;
    let sql = 'SELECT id, network, plan_type, name, size, user_price, reseller_price, validity, enabled FROM data_plans WHERE enabled = true';
    const params: any[] = [];

    if (network) {
      params.push(network.toUpperCase());
      sql += ` AND network = $1`;
    }

    sql += ' ORDER BY user_price ASC';
    const result = await query(sql, params);

    return res.json({
      success: true,
      plans: result.rows.map(r => ({
        id: r.id,
        network: r.network,
        planType: r.plan_type,
        name: r.name,
        size: r.size,
        userPrice: parseFloat(r.user_price),
        resellerPrice: parseFloat(r.reseller_price),
        validity: r.validity,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve data plans.' });
  }
});

// POST buy data
router.post('/buy-data', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { planId, recipientPhone, network } = req.body;

    if (!planId || !recipientPhone) {
      return res.status(400).json({ success: false, message: 'Plan and recipient phone number are required.' });
    }

    // Phone format check
    const cleanPhone = String(recipientPhone).replace(/\s+/g, '').replace(/^\+234/, '0');
    if (!/^0(7|8|9)(0|1)\d{8}$/.test(cleanPhone)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 11-digit recipient phone number.' });
    }

    // Find plan
    const planRes = await query('SELECT * FROM data_plans WHERE id = $1 AND enabled = true', [planId]);
    if (planRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Selected data plan is not available.' });
    }
    const plan = planRes.rows[0];

    // Determine price (agents get reseller price)
    const isAgentOrHigher = ['AGENT', 'TEAM_LEADER', 'STATE_MANAGER', 'ADMIN', 'FOUNDER_SUPER_ADMIN'].includes(user.position);
    const price = parseFloat(isAgentOrHigher ? plan.reseller_price : plan.user_price);

    // Check user balance
    const userDb = await query('SELECT wallet_balance FROM users WHERE id = $1', [user.id]);
    const balance = parseFloat(userDb.rows[0]?.wallet_balance || '0.00');

    if (balance < price) {
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance. You need ₦${price.toLocaleString()} but currently have ₦${balance.toLocaleString()}. Please fund your wallet.`
      });
    }

    const newBalance = (balance - price).toFixed(2);
    await query('UPDATE users SET wallet_balance = $1, updated_at = NOW() WHERE id = $2', [newBalance, user.id]);

    const txId = `tx-dt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const ref = `DAT-${Date.now()}`;

    await query(
      `INSERT INTO transactions (
        id, user_id, user_name, user_phone, type, network, recipient_phone, 
        plan_name, amount, balance_before, balance_after, status, reference, 
        note, is_simulated, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, NOW())`,
      [
        txId,
        user.id,
        user.fullName,
        user.phone,
        'data_purchase',
        plan.network,
        cleanPhone,
        plan.name,
        price,
        balance,
        newBalance,
        'successful',
        ref,
        `Data purchase ${plan.name} to ${cleanPhone}`,
      ]
    );

    return res.json({
      success: true,
      message: `Successfully purchased ${plan.name} for ${cleanPhone}!`,
      newWalletBalance: newBalance,
      reference: ref,
      plan: {
        network: plan.network,
        name: plan.name,
        size: plan.size,
        amount: price,
      },
    });
  } catch (err: any) {
    console.error('Buy data error:', err);
    return res.status(500).json({ success: false, message: 'Data purchase failed due to server error.' });
  }
});

// POST buy airtime
router.post('/buy-airtime', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { network, recipientPhone, amount } = req.body;
    const numAmount = parseFloat(amount);

    if (!network || !recipientPhone || isNaN(numAmount) || numAmount < 50) {
      return res.status(400).json({ success: false, message: 'Invalid airtime details. Minimum amount is ₦50.' });
    }

    const cleanPhone = String(recipientPhone).replace(/\s+/g, '').replace(/^\+234/, '0');
    if (!/^0(7|8|9)(0|1)\d{8}$/.test(cleanPhone)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 11-digit phone number.' });
    }

    // Check user balance
    const userDb = await query('SELECT wallet_balance FROM users WHERE id = $1', [user.id]);
    const balance = parseFloat(userDb.rows[0]?.wallet_balance || '0.00');

    if (balance < numAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance. You need ₦${numAmount.toLocaleString()} but currently have ₦${balance.toLocaleString()}.`
      });
    }

    const newBalance = (balance - numAmount).toFixed(2);
    await query('UPDATE users SET wallet_balance = $1, updated_at = NOW() WHERE id = $2', [newBalance, user.id]);

    const txId = `tx-at-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const ref = `AIR-${Date.now()}`;

    await query(
      `INSERT INTO transactions (
        id, user_id, user_name, user_phone, type, network, recipient_phone, 
        amount, balance_before, balance_after, status, reference, 
        note, is_simulated, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, NOW())`,
      [
        txId,
        user.id,
        user.fullName,
        user.phone,
        'airtime_purchase',
        network.toUpperCase(),
        cleanPhone,
        numAmount,
        balance,
        newBalance,
        'successful',
        ref,
        `Airtime purchase ${network.toUpperCase()} ₦${numAmount} to ${cleanPhone}`,
      ]
    );

    return res.json({
      success: true,
      message: `₦${numAmount.toLocaleString()} ${network.toUpperCase()} airtime successfully delivered to ${cleanPhone}!`,
      newWalletBalance: newBalance,
      reference: ref,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Airtime purchase failed.' });
  }
});

export default router;
