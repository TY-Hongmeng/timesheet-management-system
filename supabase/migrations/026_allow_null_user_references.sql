-- 允许历史记录表中的用户引用字段为null，以支持用户删除后保留历史数据

-- 修改timesheet_records表，允许user_id为null（用于已删除用户的历史记录）
ALTER TABLE timesheet_records 
ALTER COLUMN user_id DROP NOT NULL;

-- 修改approval_history表，允许approver_id为null（用于已删除审核人的历史记录）
ALTER TABLE approval_history 
ALTER COLUMN approver_id DROP NOT NULL;

-- 添加注释说明
COMMENT ON COLUMN timesheet_records.user_id IS '用户ID，删除用户后设为null以保留历史记录';
COMMENT ON COLUMN approval_history.approver_id IS '审核人ID，删除用户后设为null以保留审核历史';