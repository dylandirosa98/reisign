-- Migration: Add team management features

-- Add monthly contract limit for users (null = use company limit, 0 = no limit override)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS monthly_contract_limit integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS contracts_sent_this_period integer DEFAULT 0;

-- Ensure role column accepts manager and user values
-- Update any existing null roles to 'user'
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Add index for team queries
CREATE INDEX IF NOT EXISTS idx_users_company_role ON users(company_id, role);

-- Function to check if user can send contracts based on their personal limit
CREATE OR REPLACE FUNCTION check_user_contract_limit(user_id uuid)
RETURNS boolean AS $$
DECLARE
  user_limit integer;
  user_sent integer;
BEGIN
  SELECT monthly_contract_limit, contracts_sent_this_period
  INTO user_limit, user_sent
  FROM users WHERE id = user_id;

  -- If no personal limit set, allow (company limit will be checked separately)
  IF user_limit IS NULL THEN
    RETURN true;
  END IF;

  -- Check against personal limit
  RETURN user_sent < user_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to increment user's contract count
CREATE OR REPLACE FUNCTION increment_user_contract_count(user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET contracts_sent_this_period = COALESCE(contracts_sent_this_period, 0) + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Reset user contract counts (to be called with company reset)
CREATE OR REPLACE FUNCTION reset_user_contract_counts(company_id_param uuid)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET contracts_sent_this_period = 0
  WHERE company_id = company_id_param;
END;
$$ LANGUAGE plpgsql;
