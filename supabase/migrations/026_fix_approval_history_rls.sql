-- 修复approval_history表的RLS策略以适配自定义用户系统
-- 问题：原策略使用auth.uid()但我们使用自定义用户系统

-- 1. 删除现有的RLS策略
DROP POLICY IF EXISTS "approval_history_access" ON approval_history;

-- 2. 禁用RLS（因为我们使用自定义用户系统，不依赖Supabase Auth）
ALTER TABLE approval_history DISABLE ROW LEVEL SECURITY;

-- 3. 确保authenticated角色有完整权限
GRANT ALL PRIVILEGES ON approval_history TO authenticated;
GRANT ALL PRIVILEGES ON approval_history TO anon;

-- 4. 添加表注释说明
COMMENT ON TABLE approval_history IS '工时记录审核历史表 - 使用自定义用户系统，已禁用RLS';