-- Remove phone and address fields from companies table
-- This migration removes the phone and address columns from the companies table

ALTER TABLE companies DROP COLUMN IF EXISTS phone;
ALTER TABLE companies DROP COLUMN IF EXISTS address;

-- Verify the table structure after removal
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND table_schema = 'public'
ORDER BY ordinal_position;