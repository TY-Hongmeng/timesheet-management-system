-- 创建审核历史表
CREATE TABLE IF NOT EXISTS timesheet_approval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timesheet_record_id UUID NOT NULL REFERENCES timesheet_records(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES auth.users(id),
    approver_type VARCHAR(20) NOT NULL CHECK (approver_type IN ('supervisor', 'section_chief')),
    action VARCHAR(20) NOT NULL CHECK (action IN ('approved', 'rejected', 'submitted')),
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_approval_history_record_id ON timesheet_approval_history(timesheet_record_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_approver ON timesheet_approval_history(approver_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_created_at ON timesheet_approval_history(created_at DESC);

-- 启用行级安全
ALTER TABLE timesheet_approval_history ENABLE ROW LEVEL SECURITY;

-- 审核历史策略
CREATE POLICY "用户可以查看自己工时记录的审核历史" ON timesheet_approval_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM timesheet_records 
            WHERE timesheet_records.id = timesheet_approval_history.timesheet_record_id 
            AND timesheet_records.user_id = auth.uid()
        )
    );

-- 班长可以查看和创建审核历史
CREATE POLICY "班长可以查看和操作审核历史" ON timesheet_approval_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN user_roles ur ON u.role_id = ur.id
            WHERE u.id = auth.uid() 
            AND ur.name IN ('班长', '管理员', '超级管理员')
        )
    );

-- 段长可以查看和创建审核历史
CREATE POLICY "段长可以查看和操作审核历史" ON timesheet_approval_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN user_roles ur ON u.role_id = ur.id
            WHERE u.id = auth.uid() 
            AND ur.name IN ('段长', '管理员', '超级管理员')
        )
    );

-- 管理员可以查看所有审核历史
CREATE POLICY "管理员可以查看所有审核历史" ON timesheet_approval_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN user_roles ur ON u.role_id = ur.id
            WHERE u.id = auth.uid() 
            AND ur.name IN ('管理员', '超级管理员')
        )
    );

-- 授权给认证用户
GRANT ALL PRIVILEGES ON timesheet_approval_history TO authenticated;

-- 添加表注释
COMMENT ON TABLE timesheet_approval_history IS '工时记录审核历史表';
COMMENT ON COLUMN timesheet_approval_history.approver_type IS '审核者类型：supervisor(班长), section_chief(段长)';
COMMENT ON COLUMN timesheet_approval_history.action IS '审核动作：approved(通过), rejected(拒绝), submitted(提交)';

-- 更新工时记录表的RLS策略，允许班长查看待审核记录
DROP POLICY IF EXISTS "班长可以查看待审核工时记录" ON timesheet_records;
CREATE POLICY "班长可以查看待审核工时记录" ON timesheet_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN user_roles ur ON u.role_id = ur.id
            WHERE u.id = auth.uid() 
            AND ur.name = '班长'
            AND timesheet_records.supervisor_id = auth.uid()
        )
    );

-- 班长可以更新工时记录状态
DROP POLICY IF EXISTS "班长可以更新工时记录状态" ON timesheet_records;
CREATE POLICY "班长可以更新工时记录状态" ON timesheet_records
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN user_roles ur ON u.role_id = ur.id
            WHERE u.id = auth.uid() 
            AND ur.name = '班长'
            AND timesheet_records.supervisor_id = auth.uid()
        )
    );

-- 段长可以查看待审核工时记录
DROP POLICY IF EXISTS "段长可以查看待审核工时记录" ON timesheet_records;
CREATE POLICY "段长可以查看待审核工时记录" ON timesheet_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN user_roles ur ON u.role_id = ur.id
            WHERE u.id = auth.uid() 
            AND ur.name = '段长'
            AND timesheet_records.section_chief_id = auth.uid()
        )
    );

-- 段长可以更新工时记录状态
DROP POLICY IF EXISTS "段长可以更新工时记录状态" ON timesheet_records;
CREATE POLICY "段长可以更新工时记录状态" ON timesheet_records
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN user_roles ur ON u.role_id = ur.id
            WHERE u.id = auth.uid() 
            AND ur.name = '段长'
            AND timesheet_records.section_chief_id = auth.uid()
        )
    );