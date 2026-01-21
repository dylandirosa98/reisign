-- Migration: Add admin plan tier for system administrators

-- Add 'admin' to the plan_tier enum
ALTER TYPE plan_tier ADD VALUE IF NOT EXISTS 'admin';

-- Update system admin accounts to have 'admin' as their actual_plan
-- This gives them free unlimited access while keeping billing_plan as 'free'
UPDATE companies
SET actual_plan = 'admin'
WHERE id IN (
  SELECT company_id FROM users WHERE is_system_admin = true
);
