-- Add sending lock timestamp to prevent duplicate send requests
-- This enables database-level coordination across serverless function instances

ALTER TABLE contracts ADD COLUMN sending_at TIMESTAMPTZ DEFAULT NULL;

-- Index for efficient lock queries (partial index only includes active locks)
CREATE INDEX idx_contracts_sending_at ON contracts(sending_at) WHERE sending_at IS NOT NULL;

COMMENT ON COLUMN contracts.sending_at IS 'Timestamp when send was initiated. Used to prevent duplicate sends. NULL when not sending.';
