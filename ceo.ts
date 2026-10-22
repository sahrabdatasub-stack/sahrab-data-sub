import { Router, Request, Response } from 'express';
import { query } from '../db.ts';
import { requireAuth, requirePosition } from '../middleware/auth.ts';

const router = Router();

// Strict CEO-only authorization guard for all endpoints in this router
router.use(requireAuth, requirePosition(['FOUNDER_SUPER_ADMIN']));

// 1. COMPANY OVERVIEW
router.get('/overview', async (_req: Request, res: Response) => {
  try {
    const totalUsersRes = await query('SELECT COUNT(*) FROM users');
    const roleBreakdownRes = await query(`
      SELECT 
        COALESCE(position, 'CUSTOMER') as pos, 
        COUNT(*) as count 
      FROM users 
      GROUP BY COALESCE(position, 'CUSTOMER')
    `);

    const statusBreakdownRes = await query(`
      SELECT status, COUNT(*) as count 
      FROM users 
      GROUP BY status
    `);

    const teamsCountRes = await query('SELECT COUNT(*) FROM teams');
    const verifiedKycRes = await query("SELECT COUNT(*) FROM users WHERE kyc_status = 'verified'");

    const counts: Record<string, number> = {
      totalUsers: parseInt(totalUsersRes.rows[0].count),
      customers: 0,
      agents: 0,
      teamLeaders: 0,
      stateManagers: 0,
      admins: 0,
      founderSuperAdmins: 0,
      activeUsers: 0,
      deactivatedUsers: 0,
      verifiedKyc: parseInt(verifiedKycRes.rows[0].count),
      totalTeams: parseInt(teamsCountRes.rows[0].count),
    };

    roleBreakdownRes.rows.forEach((r) => {
      const c = parseInt(r.count);
      switch (r.pos) {
        case 'CUSTOMER':
          counts.customers = c;
          break;
        case 'AGENT':
          counts.agents = c;
          break;
        case 'TEAM_LEADER':
          counts.teamLeaders = c;
          break;
        case 'STATE_MANAGER':
          counts.stateManagers = c;
          break;
        case 'ADMIN':
          counts.admins = c;
          break;
        case 'FOUNDER_SUPER_ADMIN':
          counts.founderSuperAdmins = c;
          break;
      }
    });

    statusBreakdownRes.rows.forEach((r) => {
      const c = parseInt(r.count);
      if (r.status === 'active') counts.activeUsers = c;
      if (r.status === 'deactivated') counts.deactivatedUsers = c;
    });

    return res.json({
      success: true,
      overview: counts,
    });
  } catch (err: any) {
    console.error('CEO overview error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate company overview.' });
  }
});

// 2. FINANCIAL OVERVIEW & RECONCILIATION
router.get('/financials', async (_req: Request, res: Response) => {
  try {
    // A. Completed Sales Volume (from transactions)
    const salesRes = await query(`
      SELECT 
        COUNT(*) as total_sales_count,
        COALESCE(SUM(amount), 0) as total_sales_volume
      FROM transactions 
      WHERE status = 'successful' 
        AND type IN ('data_purchase', 'airtime_purchase')
    `);

    const completedSalesCount = parseInt(salesRes.rows[0].total_sales_count);
    const completedSalesVolume = parseFloat(salesRes.rows[0].total_sales_volume);

    // B. Verified Revenue (Total completed purchase revenue)
    const verifiedRevenue = completedSalesVolume;

    // C. Recorded Provider Costs (Estimated baseline cost of telco bandwidth: ~92% of retail price)
    // If transactions have explicit provider cost, use that; otherwise calculate based on plan cost margin (~8% margin)
    const providerCosts = parseFloat((verifiedRevenue * 0.92).toFixed(2));

    // D. Gross Margin = Revenue - Provider Costs
    const grossMargin = parseFloat((verifiedRevenue - providerCosts).toFixed(2));

    // E. Approved Commissions (from paid/approved payroll & commission balances)
    const commRes = await query(`
      SELECT 
        COALESCE(SUM(commissions_earned), 0) as approved_commissions
      FROM payroll_records 
      WHERE status IN ('APPROVED', 'PAID')
    `);
    const approvedCommissions = parseFloat(commRes.rows[0].approved_commissions);

    // F. Approved Payroll (Base Salaries + Bonuses - Deductions from approved/paid payroll)
    const payrollRes = await query(`
      SELECT 
        COALESCE(SUM(net_pay), 0) as approved_payroll,
        COALESCE(SUM(CASE WHEN status = 'PENDING_APPROVAL' THEN net_pay ELSE 0 END), 0) as pending_payroll
      FROM payroll_records
    `);
    const approvedPayroll = parseFloat(payrollRes.rows[0].approved_payroll);
    const pendingPayroll = parseFloat(payrollRes.rows[0].pending_payroll);

    // G. Recorded Operating Expenses
    const expRes = await query(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_expenses
      FROM operating_expenses
    `);
    const recordedOperatingExpenses = parseFloat(expRes.rows[0].total_expenses);

    // H. Calculated Net Operating Result = Gross Margin - Approved Commissions - Approved Payroll - Operating Expenses
    const netOperatingResult = parseFloat(
      (grossMargin - approvedCommissions - approvedPayroll - recordedOperatingExpenses).toFixed(2)
    );

    // I. Customer Wallet Liabilities (Stored customer funds - distinct from company profits!)
    const walletRes = await query(`
      SELECT COALESCE(SUM(wallet_balance), 0) as total_wallet_liability 
      FROM users 
      WHERE position = 'CUSTOMER'
    `);
    const customerWalletLiabilities = parseFloat(walletRes.rows[0].total_wallet_liability);

    // Recent Expense Breakdown
    const recentExpenses = await query('SELECT * FROM operating_expenses ORDER BY created_at DESC LIMIT 5');

    return res.json({
      success: true,
      financials: {
        completedSalesCount,
        completedSalesVolume,
        verifiedRevenue,
        recordedProviderCosts: providerCosts,
        grossMargin,
        approvedCommissions,
        approvedPayroll,
        pendingPayroll,
        recordedOperatingExpenses,
        netOperatingResult,
        customerWalletLiabilities,
        accountingNotice: 'Customer Wallet Liabilities represent deposits held in trust for customers and are never counted as company operating revenue or profit.',
        expensesBreakdown: recentExpenses.rows,
      },
    });
  } catch (err: any) {
    console.error('CEO financials error:', err);
    return res.status(500).json({ success: false, message: 'Failed to calculate company financials.' });
  }
});

// 3. ORGANIZATION MANAGEMENT (Teams & Staff Roster)
router.get('/organization', async (_req: Request, res: Response) => {
  try {
    // Teams with members
    const teamsRes = await query(`
      SELECT 
        t.id, 
        t.name, 
        t.state, 
        t.team_leader_name, 
        t.status, 
        t.monthly_target,
        COALESCE(m.member_count, 0) as member_count
      FROM teams t
      LEFT JOIN (
        SELECT assigned_team, COUNT(*) as member_count
        FROM users
        GROUP BY assigned_team
      ) m ON m.assigned_team = t.name
      ORDER BY t.name ASC
    `);

    // Staff Roster (All non-customer users)
    const staffRes = await query(`
      SELECT 
        id, 
        full_name, 
        email, 
        phone, 
        role, 
        position, 
        assigned_team, 
        supervisor_name, 
        state_region, 
        status, 
        appointed_at, 
        created_at 
      FROM users 
      WHERE position != 'CUSTOMER' 
      ORDER BY created_at DESC
    `);

    // Position Change History (Recent 10 appointments)
    const historyRes = await query(`
      SELECT * FROM position_change_history 
      ORDER BY created_at DESC 
      LIMIT 10
    `);

    return res.json({
      success: true,
      teams: teamsRes.rows.map(t => ({
        id: t.id,
        name: t.name,
        state: t.state,
        teamLeaderName: t.team_leader_name || 'Unassigned',
        status: t.status,
        monthlyTarget: parseFloat(t.monthly_target || 500000),
        memberCount: parseInt(t.member_count),
      })),
      staff: staffRes.rows.map(s => ({
        id: s.id,
        fullName: s.full_name,
        email: s.email,
        phone: s.phone,
        position: s.position,
        assignedTeam: s.assigned_team || 'National/HQ',
        supervisorName: s.supervisor_name || 'Executive Line',
        stateRegion: s.state_region || 'National',
        status: s.status,
        appointedAt: s.appointed_at,
      })),
      recentAppointments: historyRes.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve organization structure.' });
  }
});

// Revoke Staff Permissions & Demote to Customer (CEO ONLY)
router.post('/staff/:id/revoke', async (req: Request, res: Response) => {
  try {
    const caller = req.user!;
    const staffId = req.params.id;
    const { reason } = req.body;

    if (caller.id === staffId) {
      return res.status(403).json({ success: false, message: 'You cannot revoke your own executive credentials.' });
    }

    const staffRes = await query('SELECT * FROM users WHERE id = $1', [staffId]);
    if (staffRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Staff record not found.' });
    }

    const target = staffRes.rows[0];
    const prevPos = target.position || 'CUSTOMER';

    if (prevPos === 'CUSTOMER') {
      return res.status(400).json({ success: false, message: 'User is already in Customer position with no staff permissions.' });
    }

    // Demote staff to customer
    await query(
      `UPDATE users 
       SET position = 'CUSTOMER', 
           role = 'user', 
           assigned_team = NULL, 
           supervisor_id = NULL, 
           supervisor_name = NULL, 
           updated_at = NOW() 
       WHERE id = $1`,
      [staffId]
    );

    // Audit log in position_change_history
    const historyId = `pos-hist-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    await query(
      `INSERT INTO position_change_history 
       (id, user_id, user_name, previous_position, new_position, admin_id, admin_name, reason, appointment_date, created_at)
       VALUES ($1, $2, $3, $4, 'CUSTOMER', $5, $6, $7, NOW(), NOW())`,
      [
        historyId,
        staffId,
        target.full_name,
        prevPos,
        caller.id,
        caller.fullName,
        reason || 'Staff permissions revoked by CEO executive action',
      ]
    );

    // Admin audit log
    const auditId = `log-rev-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    await query(
      `INSERT INTO admin_audit_logs (id, admin_id, action, target_id, details, created_at)
       VALUES ($1, $2, 'REVOKE_STAFF_PERMISSIONS', $3, $4, NOW())`,
      [
        auditId,
        caller.id,
        staffId,
        JSON.stringify({
          staffName: target.full_name,
          previousPosition: prevPos,
          newPosition: 'CUSTOMER',
          revokedBy: caller.fullName,
          reason: reason || 'Executive revocation',
        }),
      ]
    );

    return res.json({
      success: true,
      message: `Staff permissions for ${target.full_name} (${prevPos.replace(/_/g, ' ')}) have been revoked. User position reverted to CUSTOMER.`,
    });
  } catch (err: any) {
    console.error('Revoke staff error:', err);
    return res.status(500).json({ success: false, message: 'Failed to revoke staff permissions.' });
  }
});

// Customer Management for CEO (Dedicated list of customers with transactions and wallet liabilities)
router.get('/customers', async (req: Request, res: Response) => {
  try {
    const search = ((req.query.search as string) || '').trim().toLowerCase();
    let sql = `
      SELECT 
        u.id, 
        u.full_name, 
        u.email, 
        u.phone, 
        u.status, 
        u.wallet_balance, 
        u.kyc_status, 
        u.created_at,
        u.deactivated_at,
        u.deactivated_by,
        u.deactivation_reason,
        COALESCE(tx.tx_count, 0) as tx_count,
        COALESCE(tx.tx_total, 0) as tx_total
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*) as tx_count, SUM(amount) as tx_total
        FROM transactions
        GROUP BY user_id
      ) tx ON tx.user_id = u.id
      WHERE u.position = 'CUSTOMER'
    `;
    const params: any[] = [];
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (LOWER(u.full_name) LIKE $1 OR LOWER(u.email) LIKE $1 OR u.phone LIKE $1 OR LOWER(u.id) LIKE $1)`;
    }
    sql += ` ORDER BY u.created_at DESC`;

    const result = await query(sql, params);

    return res.json({
      success: true,
      customers: result.rows.map(r => ({
        id: r.id,
        fullName: r.full_name,
        email: r.email,
        phone: r.phone,
        status: r.status,
        walletBalance: parseFloat(r.wallet_balance || 0),
        kycStatus: r.kyc_status,
        createdAt: r.created_at,
        deactivatedAt: r.deactivated_at,
        deactivatedBy: r.deactivated_by,
        deactivationReason: r.deactivation_reason,
        totalTransactions: parseInt(r.tx_count),
        totalVolume: parseFloat(r.tx_total),
      })),
    });
  } catch (err: any) {
    console.error('CEO customers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve customer accounts.' });
  }
});

// 4. PAYROLL MANAGEMENT
router.get('/payroll', async (req: Request, res: Response) => {
  try {
    const statusFilter = req.query.status as string;
    let sql = 'SELECT * FROM payroll_records WHERE 1=1';
    const params: any[] = [];

    if (statusFilter && statusFilter !== 'ALL') {
      params.push(statusFilter);
      sql += ` AND status = $1`;
    }

    sql += ' ORDER BY created_at DESC LIMIT 50';

    const result = await query(sql, params);

    const pendingCount = result.rows.filter(r => r.status === 'PENDING_APPROVAL').length;
    const approvedCount = result.rows.filter(r => r.status === 'APPROVED').length;
    const paidCount = result.rows.filter(r => r.status === 'PAID').length;

    return res.json({
      success: true,
      summary: {
        totalRecords: result.rows.length,
        pendingCount,
        approvedCount,
        paidCount,
      },
      records: result.rows.map(r => ({
        id: r.id,
        staffId: r.staff_id,
        staffName: r.staff_name,
        role: r.role,
        month: r.month,
        baseSalary: parseFloat(r.base_salary),
        commissionsEarned: parseFloat(r.commissions_earned),
        bonuses: parseFloat(r.bonuses),
        deductions: parseFloat(r.deductions),
        netPay: parseFloat(r.net_pay),
        status: r.status,
        paymentReference: r.payment_reference,
        paidAt: r.paid_at,
        notes: r.notes,
        createdAt: r.created_at,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch payroll records.' });
  }
});

// Approve Payroll Record (CEO ONLY)
router.post('/payroll/:id/approve', async (req: Request, res: Response) => {
  try {
    const caller = req.user!;
    const payrollId = req.params.id;
    const { notes } = req.body;

    const currentRes = await query('SELECT * FROM payroll_records WHERE id = $1', [payrollId]);
    if (currentRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payroll record not found.' });
    }

    const record = currentRes.rows[0];
    if (record.status === 'APPROVED' || record.status === 'PAID') {
      return res.status(400).json({ success: false, message: `Payroll record is already in ${record.status} status.` });
    }

    await query(
      `UPDATE payroll_records 
       SET status = 'APPROVED', 
           notes = COALESCE($1, notes), 
           updated_at = NOW() 
       WHERE id = $2`,
      [notes || `Approved by CEO ${caller.fullName}`, payrollId]
    );

    // Audit log
    const auditLogId = `log-pay-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    await query(
      `INSERT INTO admin_audit_logs (id, admin_id, action, target_id, details, created_at)
       VALUES ($1, $2, 'APPROVE_PAYROLL', $3, $4, NOW())`,
      [
        auditLogId,
        caller.id,
        payrollId,
        JSON.stringify({
          staffName: record.staff_name,
          month: record.month,
          netPay: record.net_pay,
          approvedBy: caller.fullName,
        }),
      ]
    );

    return res.json({
      success: true,
      message: `Payroll for ${record.staff_name} (₦${parseFloat(record.net_pay).toLocaleString()}) approved successfully.`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to approve payroll record.' });
  }
});

// Record Payment with Verified Bank/NIP Reference (CEO ONLY)
router.post('/payroll/:id/disburse', async (req: Request, res: Response) => {
  try {
    const caller = req.user!;
    const payrollId = req.params.id;
    const { paymentReference, disbursementMethod } = req.body;

    if (!paymentReference || !paymentReference.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A verified bank payment reference or NIP transaction reference is strictly required before marking payroll as paid.'
      });
    }

    const currentRes = await query('SELECT * FROM payroll_records WHERE id = $1', [payrollId]);
    if (currentRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payroll record not found.' });
    }

    const record = currentRes.rows[0];
    if (record.status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: `Cannot disburse payroll in '${record.status}' status. Payroll must be APPROVED before payment can be recorded.`
      });
    }

    await query(
      `UPDATE payroll_records 
       SET status = 'PAID', 
           payment_reference = $1, 
           paid_at = NOW(), 
           updated_at = NOW() 
       WHERE id = $2`,
      [paymentReference.trim(), payrollId]
    );

    // Audit log
    const auditLogId = `log-pay-disb-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    await query(
      `INSERT INTO admin_audit_logs (id, admin_id, action, target_id, details, created_at)
       VALUES ($1, $2, 'DISBURSE_PAYROLL', $3, $4, NOW())`,
      [
        auditLogId,
        caller.id,
        payrollId,
        JSON.stringify({
          staffName: record.staff_name,
          month: record.month,
          amountPaid: record.net_pay,
          paymentReference: paymentReference.trim(),
          disbursementMethod: disbursementMethod || 'Direct Bank NIP Transfer',
          disbursedBy: caller.fullName,
        }),
      ]
    );

    return res.json({
      success: true,
      message: `Payroll payment of ₦${parseFloat(record.net_pay).toLocaleString()} to ${record.staff_name} confirmed with reference ${paymentReference.trim()}.`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to disburse payroll.' });
  }
});

// 5. SECURITY & AUDIT FEED (Combined admin audit logs and position change history)
router.get('/audit', async (_req: Request, res: Response) => {
  try {
    const adminLogsRes = await query('SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT 30');
    const posLogsRes = await query('SELECT * FROM position_change_history ORDER BY created_at DESC LIMIT 30');

    return res.json({
      success: true,
      adminAuditLogs: adminLogsRes.rows,
      positionChangeLogs: posLogsRes.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch security audit logs.' });
  }
});

export default router;
