-- Add status column to properties table
-- Status is manually set by user, not tracked with documents
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS status text DEFAULT 'none' CHECK (status IN ('none', 'in_escrow', 'terminated', 'pending', 'closed'));

-- Add comment for documentation
COMMENT ON COLUMN properties.status IS 'Manual property status: none, in_escrow, terminated, pending, closed';
