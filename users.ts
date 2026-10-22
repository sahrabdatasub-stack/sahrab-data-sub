import { Router, Request, Response } from 'express';
import { query } from '../db.ts';
import { requireAuth, requirePosition, POSITION_RANK } from '../middleware/auth.ts';

const router = Router();

// Helper to mask sensitive customer information for lower staff ranks (Agents, Team Leaders)
function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return '080********';
  return phone.slice(0, 4) + '****' + phone.slice(-3);
}

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '****@***.com';
  const [local, domain] = email.split('@');
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

// 1. GLOBAL USER DIRECTORY (Accessible by Founder, Admin, State Manager, Team Leader, Agent)
router.get('/directory', requireAuth, requirePosition(['FOUNDER_SUPER_ADMIN', 'ADMIN', 'STATE_MANAGER', 'TEAM_LEADER', 'AGENT']), async (req: Request, res: Response) => {
  try {
    const caller = req.user!;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 15));
    const offset = (page - 1) * limit;

    const search = ((req.query.search as string) || '').trim().toLowerCase();
    const filterPosition = (req.query.position as string) || (req.query.role as string) || '';
    const filterTeam = (req.query.team as string) || '';
    const filterState = (req.query.state as string) || '';
    const filterStatus = (req.query.status as string) || '';
    const dateFrom = (req.query.dateFrom as string) || '';
    const dateTo = (req.query.dateTo as string) || '';

    // Base query with activity aggregations from transactions
    let whereClause = ' WHERE 1=1';
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (LOWER(u.full_name) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length} OR u.phone LIKE $${params.length} OR LOWER(u.id) LIKE $${params.length})`;
    }

    if (filterPosition) {
      params.push(filterPosition);
      whereClause += ` AND (u.position = $${params.length} OR u.role = $${params.length})`;
    }

    if (filterTeam) {
      params.push(filterTeam);
      whereClause += ` AND u.assigned_team = $${params.length}`;
    }

    if (filterState) {
      params.push(filterState);
      whereClause += ` AND u.state_region = $${params.length}`;
    }

    if (filterStatus) {
      params.push(filterStatus);
      whereClause += ` AND u.status = $${params.length}`;
    }

    if (dateFrom) {
      params.push(dateFrom);
      whereClause += ` AND u.created_at >= $${params.length}::timestamptz`;
    }

    if (dateTo) {
      params.push(dateTo);
      whereClause += ` AND u.created_at <= ($${params.length}::timestamptz + INTERVAL '1 day')`;
    }

    // Total count for pagination
    const countSql = `SELECT COUNT(*) FROM users u ${whereClause}`;
    const countRes = await query(countSql, params);
    const totalCount = parseInt(countRes.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit) || 1;

    // Fetch paginated user records along with transaction activity summary
    const usersSql = `
      SELECT 
        u.id, 
        u.full_name, 
        u.email, 
        u.phone, 
        u.role, 
        u.position, 
        u.assigned_team, 
        u.supervisor_id, 
        u.supervisor_name, 
        u.state_region, 
        u.appointed_at, 
        u.status, 
        u.wallet_balance, 
        u.commission_balance, 
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
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const userParams = [...params, limit, offset];
    const userRes = await query(usersSql, userParams);

    // Apply Privacy Rules & Permission Flags
    // Caller ranks: 1 = FOUNDER_SUPER_ADMIN, 2 = ADMIN, 3 = STATE_MANAGER, 4 = TEAM_LEADER, 5 = AGENT
    const callerRank = POSITION_RANK[caller.position] || 99;
    const isCeo = caller.position === 'FOUNDER_SUPER_ADMIN';
    const isHigherManagement = ['FOUNDER_SUPER_ADMIN', 'ADMIN', 'STATE_MANAGER'].includes(caller.position);

    const formattedUsers = userRes.rows.map((row) => {
      const isTargetCustomer = row.position === 'CUSTOMER';
      const targetRank = POSITION_RANK[row.position] || 99;
      const isSelf = row.id === caller.id;

      // Privacy Masking:
      // Agents and Team Leaders see masked contact info for Customers to protect user data from personal harvesting.
      let displayPhone = row.phone;
      let displayEmail = row.email;
      let displayWallet = row.wallet_balance;

      if (!isHigherManagement && isTargetCustomer) {
        displayPhone = maskPhone(row.phone);
        displayEmail = maskEmail(row.email);
        displayWallet = 'Protected';
      }

      // CEO-ONLY CUSTOMER REMOVAL & SCOPE PERMISSION LOGIC:
      // Only the CEO / Founder / Super Admin may deactivate a customer.
      let canDeactivate = false;
      let removalRestrictionNote = '';

      if (isSelf) {
        canDeactivate = false;
        removalRestrictionNote = 'Cannot deactivate own account';
      } else if (row.status === 'deactivated') {
        canDeactivate = false;
        removalRestrictionNote = 'Already deactivated';
      } else if (isTargetCustomer) {
        if (isCeo) {
          canDeactivate = true;
        } else {
          canDeactivate = false;
          removalRestrictionNote = 'CEO-Only Permission: Only the Founder/Super Admin may deactivate customer accounts';
        }
      } else {
        // Target is staff (Admin, State Manager, Team Leader, Agent)
        if (isCeo) {
          canDeactivate = true;
        } else if (callerRank < targetRank) {
          // Caller strictly outranks target
          if (caller.position === 'STATE_MANAGER') {
            // Must be within caller's state/region
            if (!caller.stateRegion || !row.state_region || caller.stateRegion === row.state_region) {
              canDeactivate = true;
            } else {
              canDeactivate = false;
              removalRestrictionNote = 'Outside assigned state territory';
            }
          } else if (caller.position === 'TEAM_LEADER') {
            // Must be agent in caller's assigned team
            if (row.position === 'AGENT' && caller.assignedTeam && row.assigned_team && caller.assignedTeam === row.assigned_team) {
              canDeactivate = true;
            } else {
              canDeactivate = false;
              removalRestrictionNote = 'Outside assigned field team';
            }
          } else if (caller.position === 'ADMIN') {
            canDeactivate = true;
          }
        } else {
          canDeactivate = false;
          removalRestrictionNote = 'Insufficient authority rank';
        }
      }

      return {
        id: row.id,
        fullName: row.full_name,
        email: displayEmail,
        phone: displayPhone,
        role: row.role,
        position: row.position || 'CUSTOMER',
        assignedTeam: row.assigned_team || 'Unassigned',
        supervisorId: row.supervisor_id,
        supervisorName: row.supervisor_name || 'None',
        stateRegion: row.state_region || 'National',
        status: row.status,
        appointedAt: row.appointed_at || row.created_at,
        createdAt: row.created_at,
        walletBalance: displayWallet,
        commissionBalance: isHigherManagement ? row.commission_balance : undefined,
        kycStatus: row.kyc_status,
        activitySummary: {
          totalTransactions: parseInt(row.tx_count),
          totalVolume: parseFloat(row.tx_total),
        },
        deactivatedAt: row.deactivated_at,
        deactivatedBy: row.deactivated_by,
        deactivationReason: row.deactivation_reason,
        canDeactivate,
        removalRestrictionNote: removalRestrictionNote || undefined,
      };
    });

    return res.json({
      success: true,
      directory: formattedUsers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
      callerPermissions: {
        position: caller.position,
        isCeo,
        canDeactivateCustomers: isCeo,
        canManageStaff: ['FOUNDER_SUPER_ADMIN', 'ADMIN', 'STATE_MANAGER', 'TEAM_LEADER'].includes(caller.position),
      },
    });
  } catch (err: any) {
    console.error('Directory fetch error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve global user directory.' });
  }
});

// 2. GET FILTER OPTIONS (Teams, States, Roles)
router.get('/filter-options', requireAuth, async (_req: Request, res: Response) => {
  try {
    const teamsRes = await query('SELECT DISTINCT name FROM teams ORDER BY name ASC');
    const statesRes = await query("SELECT DISTINCT state_region FROM users WHERE state_region IS NOT NULL AND state_region != '' ORDER BY state_region ASC");

    return res.json({
      success: true,
      teams: teamsRes.rows.map(r => r.name),
      states: statesRes.rows.map(r => r.state_region),
      positions: [
        { code: 'FOUNDER_SUPER_ADMIN', label: 'FOUNDER / SUPER ADMIN' },
        { code: 'ADMIN', label: 'ADMIN' },
        { code: 'STATE_MANAGER', label: 'STATE MANAGER' },
        { code: 'TEAM_LEADER', label: 'TEAM LEADER' },
        { code: 'AGENT', label: 'AGENT' },
        { code: 'CUSTOMER', label: 'CUSTOMER' },
      ],
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to load filter options.' });
  }
});

// 3. DEACTIVATE USER ENDPOINT (Strict CEO-Only Customer Removal + Downstream Staff Hierarchy)
router.post('/:id/deactivate', requireAuth, requirePosition(['FOUNDER_SUPER_ADMIN', 'ADMIN', 'STATE_MANAGER', 'TEAM_LEADER']), async (req: Request, res: Response) => {
  try {
    const caller = req.user!;
    const targetUserId = req.params.id;
    const { reason, confirmed } = req.body;

    // A. Validation
    if (!confirmed) {
      return res.status(400).json({
        success: false,
        message: 'Action requires explicit confirmation dialog before deactivation can proceed.'
      });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A documented operational or security reason is strictly required for deactivation.'
      });
    }

    // B. Prevent Self-Deactivation
    if (caller.id === targetUserId) {
      return res.status(403).json({
        success: false,
        message: 'Security violation: You cannot deactivate your own account.'
      });
    }

    // C. Lookup Target User in PostgreSQL
    const targetRes = await query(
      'SELECT id, full_name, email, phone, role, position, assigned_team, state_region, status, wallet_balance FROM users WHERE id = $1',
      [targetUserId]
    );

    if (targetRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Target user record not found in database.' });
    }

    const targetUser = targetRes.rows[0];

    if (targetUser.status === 'deactivated') {
      return res.status(400).json({
        success: false,
        message: `Account for ${targetUser.full_name} is already deactivated.`
      });
    }

    const targetPosition = targetUser.position || 'CUSTOMER';
    const callerRank = POSITION_RANK[caller.position] || 99;
    const targetRank = POSITION_RANK[targetPosition] || 99;

    // D. CRITICAL BUSINESS RULE 3: CEO-ONLY CUSTOMER REMOVAL
    // Only the authenticated CEO / Founder / Super Admin may deactivate or remove a CUSTOMER account!
    if (targetPosition === 'CUSTOMER') {
      if (caller.position !== 'FOUNDER_SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          code: 'CEO_ONLY_CUSTOMER_REMOVAL',
          message: 'Security policy violation: Only the CEO / Founder / Super Admin is authorized to deactivate or remove a customer account.'
        });
      }
    } else {
      // E. STAFF & AGENT REMOVAL HIERARCHY (Rule 4)
      // No manager may remove or demote someone above or equal to their authority
      if (caller.position !== 'FOUNDER_SUPER_ADMIN') {
        if (callerRank >= targetRank) {
          return res.status(403).json({
            success: false,
            message: `Security violation: You cannot deactivate a user with equal or higher rank (${targetPosition}).`
          });
        }

        // State Manager Scope Enforcement
        if (caller.position === 'STATE_MANAGER') {
          if (caller.stateRegion && targetUser.state_region && caller.stateRegion !== targetUser.state_region) {
            return res.status(403).json({
              success: false,
              message: `Security violation: State Managers may only deactivate staff within their assigned state territory (${caller.stateRegion}).`
            });
          }
        }

        // Team Leader Scope Enforcement
        if (caller.position === 'TEAM_LEADER') {
          if (targetPosition !== 'AGENT') {
            return res.status(403).json({
              success: false,
              message: 'Security violation: Team Leaders may only deactivate agents.'
            });
          }
          if (caller.assignedTeam && targetUser.assigned_team && caller.assignedTeam !== targetUser.assigned_team) {
            return res.status(403).json({
              success: false,
              message: `Security violation: Team Leaders may only deactivate agents within their assigned team (${caller.assignedTeam}).`
            });
          }
        }
      }
    }

    // F. Execute Soft Deactivation (Preserving all wallet records, transactions, KYC records, and history)
    await query(
      `UPDATE users 
       SET status = 'deactivated', 
           deactivated_at = NOW(), 
           deactivated_by = $1, 
           deactivation_reason = $2, 
           updated_at = NOW() 
       WHERE id = $3`,
      [caller.id, reason.trim(), targetUserId]
    );

    // G. Record in Immutable Audit Log (`admin_audit_logs`)
    const auditLogId = `log-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const actionName = targetPosition === 'CUSTOMER' ? 'CEO_DEACTIVATE_CUSTOMER' : 'DEACTIVATE_STAFF';

    await query(
      `INSERT INTO admin_audit_logs (id, admin_id, action, target_id, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        auditLogId,
        caller.id,
        actionName,
        targetUserId,
        JSON.stringify({
          action: actionName,
          targetUserId: targetUser.id,
          targetUserName: targetUser.full_name,
          targetPosition,
          targetEmail: targetUser.email,
          callerId: caller.id,
          callerName: caller.fullName,
          callerPosition: caller.position,
          reason: reason.trim(),
          timestamp: new Date().toISOString(),
          preservedWalletBalance: targetUser.wallet_balance,
        }),
        req.ip || '127.0.0.1',
      ]
    );

    return res.json({
      success: true,
      message: `Account for ${targetUser.full_name} (${targetPosition.replace(/_/g, ' ')}) has been deactivated. All financial and transaction records were safely preserved.`,
      auditLogId,
      deactivatedUser: {
        id: targetUser.id,
        fullName: targetUser.full_name,
        position: targetPosition,
        status: 'deactivated',
        deactivationReason: reason.trim(),
      },
    });
  } catch (err: any) {
    console.error('Deactivation error:', err);
    return res.status(500).json({ success: false, message: 'Deactivation failed due to server error.' });
  }
});

// 4. REACTIVATE USER ENDPOINT
router.post('/:id/reactivate', requireAuth, requirePosition(['FOUNDER_SUPER_ADMIN', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const caller = req.user!;
    const targetUserId = req.params.id;
    const { reason } = req.body;

    const targetRes = await query('SELECT id, full_name, position, status FROM users WHERE id = $1', [targetUserId]);
    if (targetRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const targetUser = targetRes.rows[0];

    // Customer reactivation also reserved for CEO or Admin with CEO authorization
    if (targetUser.position === 'CUSTOMER' && caller.position !== 'FOUNDER_SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Security policy violation: Only the CEO / Founder / Super Admin is authorized to restore customer accounts.'
      });
    }

    await query(
      `UPDATE users 
       SET status = 'active', 
           deactivated_at = NULL, 
           deactivated_by = NULL, 
           deactivation_reason = NULL, 
           updated_at = NOW() 
       WHERE id = $1`,
      [targetUserId]
    );

    const auditLogId = `log-act-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    await query(
      `INSERT INTO admin_audit_logs (id, admin_id, action, target_id, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        auditLogId,
        caller.id,
        'REACTIVATE_USER',
        targetUserId,
        JSON.stringify({
          targetUserName: targetUser.full_name,
          targetPosition: targetUser.position,
          callerName: caller.fullName,
          reason: reason || 'Account restored by administrator',
        }),
        req.ip || '127.0.0.1',
      ]
    );

    return res.json({
      success: true,
      message: `Account for ${targetUser.full_name} has been reactivated successfully.`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to reactivate user.' });
  }
});

export default router;
