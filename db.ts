import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  return res;
}

export async function initDb() {
  try {
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS position VARCHAR(50) DEFAULT 'CUSTOMER',
      ADD COLUMN IF NOT EXISTS assigned_team VARCHAR(100),
      ADD COLUMN IF NOT EXISTS supervisor_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS supervisor_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS state_region VARCHAR(100),
      ADD COLUMN IF NOT EXISTS appointed_at TIMESTAMPTZ DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS deactivated_by VARCHAR(100),
      ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;

      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id VARCHAR(100) PRIMARY KEY,
        admin_id VARCHAR(100) NOT NULL,
        action VARCHAR(100) NOT NULL,
        target_id VARCHAR(100),
        details JSONB,
        ip_address VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Synchronize founder/super admin
      UPDATE users 
      SET position = 'FOUNDER_SUPER_ADMIN' 
      WHERE (email = 'sahrabdatasub@gmail.com' OR role = 'admin') 
        AND (position IS NULL OR position = 'CUSTOMER');

      UPDATE users 
      SET position = 'CUSTOMER' 
      WHERE position IS NULL;

      CREATE TABLE IF NOT EXISTS position_change_history (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        previous_position VARCHAR(50) NOT NULL,
        new_position VARCHAR(50) NOT NULL,
        admin_id VARCHAR(100) NOT NULL,
        admin_name VARCHAR(255) NOT NULL,
        appointment_date TIMESTAMPTZ NOT NULL,
        reason TEXT NOT NULL,
        state_region VARCHAR(100),
        assigned_team VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS teams (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        state VARCHAR(100),
        team_leader_id VARCHAR(100),
        team_leader_name VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        monthly_target NUMERIC DEFAULT 500000.00,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS operating_expenses (
        id VARCHAR(100) PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        month VARCHAR(50) NOT NULL,
        recorded_by VARCHAR(100) NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS kyc_verification_attempts (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        method VARCHAR(16) NOT NULL,
        identifier_masked VARCHAR(32) NOT NULL,
        status VARCHAR(32) NOT NULL,
        failure_reason TEXT,
        provider_reference VARCHAR(64),
        ip_address VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('[DB] Database schema, position, expense, and KYC audit tables verified.');
  } catch (err) {
    console.error('[DB] Schema init error:', err);
  }
}
