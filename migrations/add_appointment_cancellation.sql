-- Migration: Add cancellation columns to appointments table
-- Run this SQL in your PostgreSQL database

-- Add cancellation columns to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(20),
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;

-- Add 'cancelled' to status check if it doesn't exist
-- Note: You may need to drop and recreate the constraint if it exists
-- ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
-- ALTER TABLE appointments ADD CONSTRAINT appointments_status_check 
--   CHECK (status IN ('scheduled', 'started', 'completed', 'cancelled', 'approved'));

-- Create index for cancelled appointments lookup (optional, for performance)
CREATE INDEX IF NOT EXISTS idx_appointments_cancelled 
ON appointments (user_id, status) 
WHERE status = 'cancelled';

CREATE INDEX IF NOT EXISTS idx_appointments_doctor_cancelled 
ON appointments (doctor_id, status) 
WHERE status = 'cancelled';
