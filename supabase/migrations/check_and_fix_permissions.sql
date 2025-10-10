-- 检查当前权限
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND grantee IN ('anon', 'authenticated') 
AND table_name IN ('timesheet_records', 'timesheet_record_items')
ORDER BY table_name, grantee;

-- 为timesheet_records表授权
GRANT SELECT ON timesheet_records TO anon;
GRANT ALL PRIVILEGES ON timesheet_records TO authenticated;

-- 为timesheet_record_items表授权
GRANT SELECT ON timesheet_record_items TO anon;
GRANT ALL PRIVILEGES ON timesheet_record_items TO authenticated;

-- 检查权限是否生效
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND grantee IN ('anon', 'authenticated') 
AND table_name IN ('timesheet_records', 'timesheet_record_items')
ORDER BY table_name, grantee;