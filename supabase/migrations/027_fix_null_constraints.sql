-- 修复用户删除时的数据库约束问题
-- 允许 timesheet_records.user_id 和 approval_history.approver_id 为 null
-- 这样在删除用户时可以保留历史记录但断开用户关联

-- 移除 timesheet_records 表中 user_id 字段的 NOT NULL 约束
ALTER TABLE timesheet_records ALTER COLUMN user_id DROP NOT NULL;

-- 移除 approval_history 表中 approver_id 字段的 NOT NULL 约束
ALTER TABLE approval_history ALTER COLUMN approver_id DROP NOT NULL;

-- 添加注释说明这些字段现在允许为 null
COMMENT ON COLUMN timesheet_records.user_id IS '用户ID，允许为null以支持用户删除后保留历史记录';
COMMENT ON COLUMN approval_history.approver_id IS '审核者ID，允许为null以支持用户删除后保留历史记录';