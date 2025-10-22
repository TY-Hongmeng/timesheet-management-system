-- 检查表权限配置
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND grantee IN ('anon', 'authenticated') 
  AND table_name IN ('timesheet_records', 'timesheet_record_items', 'approval_history', 'production_lines', 'work_types', 'products', 'processes')
ORDER BY table_name, grantee;

-- 如果权限不足，添加必要的权限
-- 为anon角色添加基本读取权限
GRANT SELECT ON production_lines TO anon;
GRANT SELECT ON work_types TO anon;
GRANT SELECT ON products TO anon;
GRANT SELECT ON processes TO anon;

-- 为authenticated角色添加完整权限
GRANT ALL PRIVILEGES ON timesheet_records TO authenticated;
GRANT ALL PRIVILEGES ON timesheet_record_items TO authenticated;
GRANT ALL PRIVILEGES ON approval_history TO authenticated;
GRANT ALL PRIVILEGES ON production_lines TO authenticated;
GRANT ALL PRIVILEGES ON work_types TO authenticated;
GRANT ALL PRIVILEGES ON products TO authenticated;
GRANT ALL PRIVILEGES ON processes TO authenticated;

-- 再次检查权限配置
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND grantee IN ('anon', 'authenticated') 
  AND table_name IN ('timesheet_records', 'timesheet_record_items', 'approval_history', 'production_lines', 'work_types', 'products', 'processes')
ORDER BY table_name, grantee;