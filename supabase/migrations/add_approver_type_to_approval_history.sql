-- Add approver_type column to approval_history table
ALTER TABLE approval_history 
ADD COLUMN approver_type VARCHAR(50) NOT NULL DEFAULT 'supervisor';

-- Add check constraint for approver_type
ALTER TABLE approval_history 
ADD CONSTRAINT approval_history_approver_type_check 
CHECK (approver_type IN ('supervisor', 'section_chief'));

-- Add comment to the column
COMMENT ON COLUMN approval_history.approver_type IS 'Type of approver: supervisor or section_chief';