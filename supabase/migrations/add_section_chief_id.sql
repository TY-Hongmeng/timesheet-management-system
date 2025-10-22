-- 添加段长字段到工时记录表
ALTER TABLE timesheet_records ADD COLUMN IF NOT EXISTS section_chief_id UUID REFERENCES users(id);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_timesheet_records_section_chief ON timesheet_records(section_chief_id);

-- 更新RLS策略以包含段长权限
DROP POLICY IF EXISTS "用户可以查看自己的工时记录" ON timesheet_records;
CREATE POLICY "用户可以查看自己的工时记录" ON timesheet_records
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.uid() = supervisor_id OR 
        auth.uid() = section_chief_id
    );

DROP POLICY IF EXISTS "用户可以更新自己的工时记录" ON timesheet_records;
CREATE POLICY "用户可以更新自己的工时记录" ON timesheet_records
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        auth.uid() = supervisor_id OR 
        auth.uid() = section_chief_id
    );

-- 授权给anon和authenticated角色
GRANT SELECT, INSERT, UPDATE, DELETE ON timesheet_records TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON timesheet_records TO authenticated;