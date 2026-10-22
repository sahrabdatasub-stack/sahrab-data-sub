import { Router, Request, Response } from 'express';
import { query } from '../db.ts';
import { requireAuth } from '../middleware/auth.ts';

const router = Router();

// GET /api/dashboards/stats
// Returns role-appropriate and position-appropriate statistics
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const position = user.position || 'CUSTOMER';

    if (position === 'FOUNDER_SUPER_ADMIN') {
      const userCountRes = await query('SELECT COUNT(*) FROM users');
      const staffCountRes = await query("SELECT COUNT(*) FROM users WHERE position != 'CUSTOMER'");
      const txCountRes = await query('SELECT COUNT(*), COALESCE(SUM(amount), 0) as total_volume FROM transactions');
      const teamsRes = await query('SELECT COUNT(*) FROM teams');
      const recentAuditRes = await query('SELECT * FROM position_change_history ORDER BY created_at DESC LIMIT 5');

      return res.json({
        success: true,
        position,
        dashboardType: 'FOUNDER / SUPER ADMIN DASHBOARD',
        stats: {
          totalUsers: parseInt(userCountRes.rows[0].count),
          totalStaff: parseInt(staffCountRes.rows[0].count),
          totalTransactions: parseInt(txCountRes.rows[0].count),
          grossTransactionVolume: parseFloat(txCountRes.rows[0].total_volume),
          totalTeams: parseInt(teamsRes.rows[0].count),
          companyStatus: 'Fully Operational',
          recentAuditLogs: recentAuditRes.rows,
        },
      });
    }

    if (position === 'ADMIN') {
      const userCountRes = await query('SELECT COUNT(*) FROM users');
      const kycCountRes = await query("SELECT COUNT(*) FROM users WHERE kyc_status = 'verified'");
      const activePlansRes = await query('SELECT COUNT(*) FROM data_plans WHERE enabled = true');
      const teamsRes = await query('SELECT COUNT(*) FROM teams');

      return res.json({
        success: true,
        position,
        dashboardType: 'ADMIN DASHBOARD',
        stats: {
          totalRegisteredUsers: parseInt(userCountRes.rows[0].count),
          verifiedKycUsers: parseInt(kycCountRes.rows[0].count),
          activeDataPlans: parseInt(activePlansRes.rows[0].count),
          managedTeams: parseInt(teamsRes.rows[0].count),
        },
      });
    }

    if (position === 'STATE_MANAGER') {
      const stateRegion = user.stateRegion || 'Northern Region';
      const teamsRes = await query('SELECT COUNT(*) FROM teams WHERE state = $1 OR state IS NULL', [stateRegion]);
      const agentsRes = await query("SELECT COUNT(*) FROM users WHERE position = 'AGENT' AND (state_region = $1 OR state_region IS NULL)", [stateRegion]);

      return res.json({
        success: true,
        position,
        dashboardType: 'STATE MANAGER DASHBOARD',
        stats: {
          assignedState: stateRegion,
          stateTeams: parseInt(teamsRes.rows[0].count),
          activeAgentsInState: parseInt(agentsRes.rows[0].count),
          monthlyTarget: 1500000,
          currentMonthProgress: 420000,
        },
      });
    }

    if (position === 'TEAM_LEADER') {
      const teamName = user.assignedTeam || 'Kano Central Distribution';
      const membersRes = await query("SELECT COUNT(*) FROM users WHERE assigned_team = $1", [teamName]);

      return res.json({
        success: true,
        position,
        dashboardType: 'TEAM LEADER DASHBOARD',
        stats: {
          assignedTeam: teamName,
          supervisor: user.supervisorName || 'Musa Ibrahim (State Manager)',
          teamMembers: parseInt(membersRes.rows[0].count),
          teamSalesTarget: 500000,
          teamTargetAchieved: 185000,
          targetPercentage: 37,
        },
      });
    }

    if (position === 'AGENT') {
      const txCountRes = await query("SELECT COUNT(*), COALESCE(SUM(amount), 0) as total_sales FROM transactions WHERE user_id = $1 AND type LIKE '%purchase%'", [user.id]);

      return res.json({
        success: true,
        position,
        dashboardType: 'AGENT DASHBOARD',
        stats: {
          agentCode: 'AGT-' + user.id.slice(-6).toUpperCase(),
          assignedTeam: user.assignedTeam || 'Retail Distribution',
          supervisorName: user.supervisorName || 'Team Leader',
          totalSalesVolume: parseFloat(txCountRes.rows[0].total_sales),
          completedTransactions: parseInt(txCountRes.rows[0].count),
          commissionsEarned: parseFloat(user.commissionBalance || '0'),
          resellerDiscountLevel: 'Tier 2 Agent (Max Savings)',
        },
      });
    }

    // Default: CUSTOMER
    const txCountRes = await query('SELECT COUNT(*) FROM transactions WHERE user_id = $1', [user.id]);
    return res.json({
      success: true,
      position: 'CUSTOMER',
      dashboardType: 'CUSTOMER DASHBOARD',
      stats: {
        walletBalance: parseFloat(user.walletBalance || '0'),
        transactionsCount: parseInt(txCountRes.rows[0].count),
        kycStatus: user.kycStatus,
        accountTier: user.kycStatus === 'verified' ? 'Tier 2 Verified' : 'Tier 1 Standard',
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to load dashboard data.' });
  }
});

export default router;
