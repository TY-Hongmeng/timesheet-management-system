-- 修复审核状态和表结构

-- 1. 修改timesheet_records表的status字段，添加段长审核通过状态
ALTER TABLE timesheet_records 
DROP CONSTRAINT IF EXISTS timesheet_records_status_check;

ALTER TABLE timesheet_records 
ADD CONSTRAINT timesheet_records_status_check 
CHECK (status IN ('draft', 'submitted', 'pending', 'approved', 'rejected', 'section_chief_approved'));

-- 2. 确保审核历史表存在且结构正确
-- 如果timesheet_approval_history表存在但approval_history不存在，则重命名
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'timesheet_approval_history')
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'approval_history') THEN
        ALTER TABLE timesheet_approval_history RENAME TO approval_history;
    END IF;
END $$;

-- 3. 如果approval_history表不存在，则创建它
CREATE TABLE IF NOT EXISTS approval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timesheet_record_id UUID NOT NULL REFERENCES timesheet_records(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES auth.users(id),
    approver_type VARCHAR(20) NOT NULL CHECK (approver_type IN ('supervisor', 'section_chief', 'admin')),
    action VARCHAR(20) NOT NULL CHECK (action IN ('approved', 'rejected', 'submitted')),
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_approval_history_record_id ON approval_history(timesheet_record_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_approver ON approval_history(approver_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_created_at ON approval_history(created_at DESC);

-- 5. 启用行级安全
ALTER TABLE approval_history ENABLE ROW LEVEL SECURITY;

-- 6. 删除旧的策略（如果存在）
DROP POLICY IF EXISTS "approval_history_access" ON approval_history;
DROP POLICY IF EXISTS "用户可以查看自己工时记录的审核历史" ON approval_history;
DROP POLICY IF EXISTS "班长可以查看和操作审核历史" ON approval_history;
DROP POLICY IF EXISTS "段长可以查看和操作审核历史" ON approval_history;
DROP POLICY IF EXISTS "管理员可以查看所有审核历史" ON approval_history;

-- 7. 创建新的RLS策略
CREATE POLICY "approval_history_access" ON approval_history 
    FOR ALL TO authenticated 
    USING (
        approver_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM timesheet_records tr 
            WHERE tr.id = timesheet_record_id 
            AND (tr.user_id = auth.uid() OR tr.supervisor_id = auth.uid() OR tr.section_chief_id = auth.uid())
        )
    );

-- 8. 授权给认证用户
GRANT ALL PRIVILEGES ON approval_history TO authenticated;

-- 9. 添加表注释
COMMENT ON TABLE approval_history IS '工时记录审核历史表';
COMMENT ON COLUMN approval_history.approver_type IS '审核者类型：supervisor(班长), section_chief(段长), admin(管理员)';
COMMENT ON COLUMN approval_history.action IS '审核动作：approved(通过), rejected(拒绝), submitted(提交)';