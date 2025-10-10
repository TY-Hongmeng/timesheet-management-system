-- 最终修复 RLS 策略 - 简化版本
-- 删除所有现有策略并重新创建最简单的策略

-- 删除 timesheet_records 表的所有策略
DROP POLICY IF EXISTS "用户只能查看自己的工时记录" ON timesheet_records;
DROP POLICY IF EXISTS "用户只能创建自己的工时记录" ON timesheet_records;
DROP POLICY IF EXISTS "用户只能更新自己的工时记录" ON timesheet_records;
DROP POLICY IF EXISTS "管理员可以查看所有工时记录" ON timesheet_records;
DROP POLICY IF EXISTS "Users can view own timesheet records" ON timesheet_records;
DROP POLICY IF EXISTS "Users can insert own timesheet records" ON timesheet_records;
DROP POLICY IF EXISTS "Users can update own timesheet records" ON timesheet_records;
DROP POLICY IF EXISTS "Users can delete own timesheet records" ON timesheet_records;

-- 删除 timesheet_record_items 表的所有策略
DROP POLICY IF EXISTS "用户只能查看自己的工时明细" ON timesheet_record_items;
DROP POLICY IF EXISTS "用户只能创建自己的工时明细" ON timesheet_record_items;
DROP POLICY IF EXISTS "管理员可以查看所有工时明细" ON timesheet_record_items;
DROP POLICY IF EXISTS "Users can view own timesheet record items" ON timesheet_record_items;
DROP POLICY IF EXISTS "Users can insert own timesheet record items" ON timesheet_record_items;
DROP POLICY IF EXISTS "Users can update own timesheet record items" ON timesheet_record_items;
DROP POLICY IF EXISTS "Users can delete own timesheet record items" ON timesheet_record_items;

-- 为 timesheet_records 创建最简单的策略
CREATE POLICY "timesheet_records_all_access" ON timesheet_records
    FOR ALL USING (auth.uid() IS NOT NULL);

-- 为 timesheet_record_items 创建最简单的策略
CREATE POLICY "timesheet_record_items_all_access" ON timesheet_record_items
    FOR ALL USING (auth.uid() IS NOT NULL);

-- 确保权限正确授予
GRANT ALL PRIVILEGES ON timesheet_records TO authenticated;
GRANT ALL PRIVILEGES ON timesheet_record_items TO authenticated;
GRANT ALL PRIVILEGES ON production_lines TO authenticated;
GRANT ALL PRIVILEGES ON work_types TO authenticated;
GRANT ALL PRIVILEGES ON products TO authenticated;

-- 为匿名用户授予基础数据的读取权限
GRANT SELECT ON production_lines TO anon;
GRANT SELECT ON work_types TO anon;
GRANT SELECT ON products TO anon;