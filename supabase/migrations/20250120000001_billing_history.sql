-- Migration: Add billing history and invoice tracking

-- Create billing_cycles table to track each billing period
CREATE TABLE IF NOT EXISTS billing_cycles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  cycle_start timestamp with time zone NOT NULL,
  cycle_end timestamp with time zone NOT NULL,
  plan_at_cycle_start text NOT NULL, -- The plan they were on
  base_amount integer NOT NULL DEFAULT 0, -- Base subscription cost in cents
  extra_seats_count integer DEFAULT 0,
  extra_seats_amount integer DEFAULT 0, -- Cost for extra seats in cents
  extra_contracts_count integer DEFAULT 0,
  extra_contracts_amount integer DEFAULT 0, -- Cost for extra contracts in cents
  total_amount integer NOT NULL DEFAULT 0, -- Total charged in cents
  status text DEFAULT 'pending', -- pending, paid, failed
  stripe_invoice_id text,
  paid_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Create index for billing cycle queries
CREATE INDEX IF NOT EXISTS idx_billing_cycles_company ON billing_cycles(company_id);
CREATE INDEX IF NOT EXISTS idx_billing_cycles_dates ON billing_cycles(cycle_start, cycle_end);

-- Add next billing date to companies
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS next_billing_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS billing_interval text DEFAULT 'monthly', -- monthly or yearly
  ADD COLUMN IF NOT EXISTS extra_seats_this_period integer DEFAULT 0;

-- RLS policies
ALTER TABLE billing_cycles ENABLE ROW LEVEL SECURITY;

-- Companies can view their own billing cycles
CREATE POLICY "Companies can view own billing cycles" ON billing_cycles
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

-- System admins can view all billing cycles
CREATE POLICY "System admins can view all billing cycles" ON billing_cycles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_system_admin = true)
  );

-- System admins can manage billing cycles
CREATE POLICY "System admins can manage billing cycles" ON billing_cycles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_system_admin = true)
  );

-- Function to calculate next billing date based on signup
CREATE OR REPLACE FUNCTION calculate_next_billing_date(signup_date timestamp with time zone, billing_interval text)
RETURNS timestamp with time zone AS $$
DECLARE
  signup_day integer;
  next_date timestamp with time zone;
BEGIN
  signup_day := EXTRACT(DAY FROM signup_date);

  IF billing_interval = 'yearly' THEN
    -- For yearly, just add 1 year
    next_date := signup_date + interval '1 year';
  ELSE
    -- For monthly
    IF signup_day >= 29 THEN
      -- If signup was on 29, 30, or 31, next billing is 1st of month after next
      next_date := date_trunc('month', signup_date + interval '2 months');
    ELSE
      -- Normal case: same day next month
      next_date := signup_date + interval '1 month';
    END IF;
  END IF;

  RETURN next_date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing companies with next billing date
UPDATE companies
SET next_billing_date = calculate_next_billing_date(
  COALESCE(billing_period_start, created_at, now()),
  COALESCE(billing_interval, 'monthly')
)
WHERE next_billing_date IS NULL;
