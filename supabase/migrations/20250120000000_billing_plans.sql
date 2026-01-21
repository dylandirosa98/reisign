-- Migration: Add billing_plan vs actual_plan for subscription management
-- This allows giving free full access accounts while tracking what they should be billed for

-- Create plan type enum
CREATE TYPE plan_tier AS ENUM ('free', 'individual', 'team', 'business');

-- Add new columns to companies table
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS billing_plan plan_tier DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS actual_plan plan_tier DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS billing_period_start timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS contracts_used_this_period integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS billing_email text;

-- Add is_system_admin to users for platform-level admin access
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_system_admin boolean DEFAULT false;

-- Create usage tracking table for detailed analytics
CREATE TABLE IF NOT EXISTS usage_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action_type text NOT NULL, -- 'contract_created', 'contract_sent', 'ai_generation', etc.
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- Create index for usage queries
CREATE INDEX IF NOT EXISTS idx_usage_logs_company_date ON usage_logs(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_logs_action ON usage_logs(action_type);

-- Create subscription_history table for audit trail
CREATE TABLE IF NOT EXISTS subscription_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  previous_billing_plan plan_tier,
  new_billing_plan plan_tier,
  previous_actual_plan plan_tier,
  new_actual_plan plan_tier,
  changed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reason text, -- 'upgrade', 'downgrade', 'admin_override', 'trial_start', 'trial_end', etc.
  stripe_event_id text,
  created_at timestamp with time zone DEFAULT now()
);

-- Plan limits configuration (stored as reference, enforced in code)
COMMENT ON COLUMN companies.billing_plan IS 'Plan the customer is billed for';
COMMENT ON COLUMN companies.actual_plan IS 'Plan features the customer has access to (can differ for promotions/free accounts)';

-- RLS policies for new tables
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- Usage logs: companies can view their own logs
CREATE POLICY "Companies can view own usage logs" ON usage_logs
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

-- System admins can view all usage logs
CREATE POLICY "System admins can view all usage logs" ON usage_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_system_admin = true)
  );

-- System admins can insert usage logs
CREATE POLICY "Service role can insert usage logs" ON usage_logs
  FOR INSERT WITH CHECK (true);

-- Subscription history: companies can view their own history
CREATE POLICY "Companies can view own subscription history" ON subscription_history
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

-- System admins can view all subscription history
CREATE POLICY "System admins can view all subscription history" ON subscription_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_system_admin = true)
  );

-- System admins can manage subscription history
CREATE POLICY "System admins can manage subscription history" ON subscription_history
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_system_admin = true)
  );

-- Function to reset monthly contract counts (to be called by cron job)
CREATE OR REPLACE FUNCTION reset_monthly_contract_counts()
RETURNS void AS $$
BEGIN
  UPDATE companies
  SET
    contracts_used_this_period = 0,
    billing_period_start = now()
  WHERE billing_period_start < now() - interval '1 month';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment contract count for a company
CREATE OR REPLACE FUNCTION increment_contract_count(p_company_id uuid)
RETURNS integer AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE companies
  SET contracts_used_this_period = contracts_used_this_period + 1
  WHERE id = p_company_id
  RETURNING contracts_used_this_period INTO new_count;

  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set your admin account as system admin (replace with your email)
UPDATE users SET is_system_admin = true WHERE email = 'dylandirosa980@gmail.com';
