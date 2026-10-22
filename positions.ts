import { Router, Request, Response } from 'express';
import { query } from '../db.ts';
import { requireAuth, requirePosition, POSITION_RANK } from '../middleware/auth.ts';

const router = Router();

// Position rank dictionary
// 1 = FOUNDER_SUPER_ADMIN, 2 = ADMIN, 3 = STATE_MANAGER, 4 = TEAM_LEADER, 5 = AGENT, 6 = CUSTOMER
const ALL_POSITIONS = [
  'FOUNDER_SUPER_ADMIN',
  'ADMIN',
  'STATE_MANAGER',
  'TEAM_LEADER',
  'AGENT',
  'CUSTOMER',
];

// Determine which positions an admin can assign based on their own position
function getAssignablePositions(callerPosition: string): string[] {
  switch (callerPosition) {
    case 'FOUNDER_SUPER_ADMIN':
      return ['ADMIN', 'STATE_MANAGER', 'TEAM_LEADER', 'AGENT', 'CUSTOMER'];
    case 'ADMIN':
      return ['STATE_MANAGER', 'TEAM_LEADER', 'AGENT', 'CUSTOMER'];
    case 'STATE_MANAGER':
      return ['TEAM_LEADER', 'AGENT', 'CUSTOMER'];
    default:
      return [];
  }
}

// Map position to database legacy role column for backward compatibility
function mapPositionToRole(pos: string): string {
  switch (pos) {
    case 'FOUNDER_SUPER_ADMIN':
    case 'ADMIN':
      return 'admin';
    case 'STATE_MANAGER':
    case 'TEAM_LEADER':
      return 'manager';
    case 'AGENT':
      return 'sales_agent';
    case 'CUSTOMER':
    default:
      return 'customer';
  }
}

// 1. Get Hierarchy and assignable positions for caller
router.get('/hierarchy', requireAuth, (req: Request, res: Response) => {
  const caller = req.user!;
  const assignable = getAssignablePositions(caller.position);

  return res.json({
    success: true,
    currentPosition: caller.position,
    hierarchy: [
      { code: 'FOUNDER_SUPER_ADMIN', title: 'FOUNDER / SUPER ADMIN', level: 1, description: 'Executive company-wide governance & full policy management' },
      { code: 'ADMIN', title: 'ADMIN', level: 2, description: 'Operations, user & team management, reports' },
      { code: 'STATE_MANAGER', title: 'STATE MANAGER', level: 3, description: 'State-wide branch, team leader, and regional sales oversight' },
      { code: 'TEAM_LEADER', title: 'TEAM LEADER', level: 4, description: 'Field sales team coordination, targets, and agent monitoring' },
      { code: 'AGENT', title: 'AGENT', level: 5, description: 'Data & airtime retail distribution, customer onboarding' },
      { code: 'CUSTOMER', title: 'CUSTOMER', level: 6, description: 'Standard consumer account, self-service data and airtime' },
    ],
    assignablePositions: assignable,
    canAssign: assignable.length > 0,
  });
});

// 2. Searchable list of registered users with positions
router.get('/users', requireAuth, requirePosition(['FOUNDER_SUPER_ADMIN', 'ADMIN', 'STATE_MANAGER', 'TEAM_LEADER']), async (req: Request, res: Response) => {
  try {
    const caller = req.user!;
    const search = ((req.query.search as string) || '').trim().toLowerCase();
    const filterPosition = (req.query.position as string) || '';
    const filterStatus = (req.query.status as string) || '';

    let sql = `
      SELECT id, full_name, email, phone, role, position, assigned_team, supervisor_id, supervisor_name, state_region, appointed_at, status, wallet_balance, commission_balance, created_at 
      FROM users 
      WHERE 1=1
    `;
    const params: any[] = [];

    // State manager scope restriction: only see users in their state or assigned team
    if (caller.position === 'STATE_MANAGER' && caller.stateRegion) {
      params.push(caller.stateRegion);
      sql += ` AND (state_region = $${params.length} OR state_region IS NULL)`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (LOWER(full_name) LIKE $${params.length} OR LOWER(email) LIKE $${params.length} OR phone LIKE $${params.length} OR LOWER(id) LIKE $${params.length})`;
    }

    if (filterPosition && ALL_POSITIONS.includes(filterPosition)) {
      params.push(filterPosition);
      sql += ` AND position = $${params.length}`;
    }

    if (filterStatus) {
      params.push(filterStatus);
      sql += ` AND status = $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC LIMIT 200`;

    const result = await query(sql, params);

    return res.json({
      success: true,
      users: result.rows.map(r => ({
        id: r.id,
        fullName: r.full_name,
        email: r.email,
        phone: r.phone,
        role: r.role,
        position: r.position || 'CUSTOMER',
        assignedTeam: r.assigned_team || 'Unassigned',
        supervisorId: r.supervisor_id,
        supervisorName: r.supervisor_name || 'None',
        stateRegion: r.state_region || 'National',
        status: r.status,
        appointedAt: r.appointed_at || r.created_at,
        createdAt: r.created_at,
        walletBalance: r.wallet_balance || '0.00',
        commissionBalance: r.commission_balance || '0.00',
      })),
    });
  } catch (err: any) {
    console.error('Fetch users error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve user list.' });
  }
});

// 3. Get teams list
router.get('/teams', requireAuth, async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT id, name, state, team_leader_name, status, monthly_target FROM teams ORDER BY name ASC');
    return res.json({ success: true, teams: result.rows });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch teams.' });
  }
});

// 4. Assign Position Endpoint
router.post('/assign', requireAuth, requirePosition(['FOUNDER_SUPER_ADMIN', 'ADMIN', 'STATE_MANAGER']), async (req: Request, res: Response) => {
  try {
    const caller = req.user!;
    const {
      targetUserId,
      newPosition,
      assignedTeam,
      stateRegion,
      supervisorId,
      supervisorName,
      effectiveDate,
      reason,
      confirmed,
    } = req.body;

    // A. Confirmation check
    if (!confirmed) {
      return res.status(400).json({
        success: false,
        message: 'Action requires explicit confirmation before appointment can be finalized.'
      });
    }

    // B. Validation of required fields
    if (!targetUserId || !newPosition || !reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Target user, new position, and appointment reason are required.'
      });
    }

    // C. Self-assignment prevention: A user cannot modify their own position!
    if (caller.id === targetUserId) {
      return res.status(403).json({
        success: false,
        message: 'Security violation: You cannot assign or modify your own position.'
      });
    }

    // D. Validate newPosition is a recognized position
    if (!ALL_POSITIONS.includes(newPosition)) {
      return res.status(400).json({
        success: false,
        message: `Invalid position: '${newPosition}'.`
      });
    }

    // E. Verify caller's authority to grant this position
    const assignable = getAssignablePositions(caller.position);
    if (!assignable.includes(newPosition)) {
      return res.status(403).json({
        success: false,
        message: `Unauthorized: Your position '${caller.position}' cannot appoint someone to '${newPosition}'.`
      });
    }

    // F. Lookup target user in database
    const userRes = await query(
      'SELECT id, full_name, email, phone, position, status, assigned_team, supervisor_name FROM users WHERE id = $1',
      [targetUserId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Target user record not found in database.'
      });
    }

    const targetUser = userRes.rows[0];
    const previousPosition = targetUser.position || 'CUSTOMER';

    // G. Hierarchy protection: Caller cannot modify someone with equal or higher rank
    const callerRank = POSITION_RANK[caller.position] || 99;
    const targetRank = POSITION_RANK[previousPosition] || 99;

    if (caller.position !== 'FOUNDER_SUPER_ADMIN' && targetRank <= callerRank) {
      return res.status(403).json({
        success: false,
        message: `Unauthorized: You cannot modify the position of a user with equal or higher rank (${previousPosition}).`
      });
    }

    const appointmentDate = effectiveDate ? new Date(effectiveDate) : new Date();
    const mappedRole = mapPositionToRole(newPosition);

    // H. Record Audit Log in position_change_history
    const historyId = `pch-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    await query(
      `INSERT INTO position_change_history (
        id, user_id, user_name, previous_position, new_position, admin_id, admin_name, 
        appointment_date, reason, state_region, assigned_team, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
      [
        historyId,
        targetUser.id,
        targetUser.full_name,
        previousPosition,
        newPosition,
        caller.id,
        caller.fullName,
        appointmentDate,
        reason.trim(),
        stateRegion || null,
        assignedTeam || null,
      ]
    );

    // I. Also log in general admin_audit_logs if table exists
    try {
      const auditLogId = `log-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
      await query(
        `INSERT INTO admin_audit_logs (id, admin_id, action, target_id, details, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          auditLogId,
          caller.id,
          'ASSIGN_POSITION',
          targetUser.id,
          JSON.stringify({
            previousPosition,
            newPosition,
            targetUserName: targetUser.full_name,
            reason: reason.trim(),
            assignedTeam,
            stateRegion,
          }),
        ]
      );
    } catch (e) {
      // non-fatal
    }

    // J. Update User record in database
    await query(
      `UPDATE users 
       SET position = $1, 
           role = $2, 
           assigned_team = $3, 
           supervisor_id = $4, 
           supervisor_name = $5, 
           state_region = $6, 
           appointed_at = $7, 
           updated_at = NOW() 
       WHERE id = $8`,
      [
        newPosition,
        mappedRole,
        assignedTeam || targetUser.assigned_team,
        supervisorId || null,
        supervisorName || null,
        stateRegion || null,
        appointmentDate,
        targetUserId,
      ]
    );

    return res.json({
      success: true,
      message: `Successfully appointed ${targetUser.full_name} to '${newPosition}'.`,
      historyId,
      updatedUser: {
        id: targetUser.id,
        fullName: targetUser.full_name,
        previousPosition,
        newPosition,
        assignedTeam: assignedTeam || targetUser.assigned_team,
        supervisorName: supervisorName || null,
        appointedAt: appointmentDate,
      },
    });
  } catch (err: any) {
    console.error('Assign position error:', err);
    return res.status(500).json({ success: false, message: 'Failed to assign position due to server error.' });
  }
});

// 5. Audit History Endpoint
router.get('/history', requireAuth, requirePosition(['FOUNDER_SUPER_ADMIN', 'ADMIN', 'STATE_MANAGER']), async (req: Request, res: Response) => {
  try {
    const caller = req.user!;
    const userId = req.query.userId as string;

    let sql = `
      SELECT id, user_id, user_name, previous_position, new_position, admin_id, admin_name, appointment_date, reason, state_region, assigned_team, created_at 
      FROM position_change_history 
      WHERE 1=1
    `;
    const params: any[] = [];

    if (userId) {
      params.push(userId);
      sql += ` AND user_id = $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC LIMIT 100`;

    const result = await query(sql, params);

    return res.json({
      success: true,
      history: result.rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        previousPosition: r.previous_position,
        newPosition: r.new_position,
        adminId: r.admin_id,
        adminName: r.admin_name,
        appointmentDate: r.appointment_date,
        reason: r.reason,
        stateRegion: r.state_region,
        assignedTeam: r.assigned_team,
        createdAt: r.created_at,
      })),
    });
  } catch (err: any) {
    console.error('Fetch history error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve assignment history.' });
  }
});

export default router;
