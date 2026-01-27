-- Add 'ready' and other statuses to contracts status check constraint
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_status_check;

ALTER TABLE contracts ADD CONSTRAINT contracts_status_check
  CHECK (status IN ('draft', 'ready', 'sent', 'viewed', 'seller_signed', 'buyer_pending', 'completed', 'cancelled'));

-- Add comment for documentation
COMMENT ON COLUMN contracts.status IS 'Contract status: draft (initial), ready (wholesaler signed), sent, viewed, seller_signed, buyer_pending, completed, cancelled';
