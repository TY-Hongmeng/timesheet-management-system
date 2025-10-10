-- 扩展timesheet_records表status字段长度
ALTER TABLE timesheet_records 
ALTER COLUMN status TYPE VARCHAR(30);

-- 更新check约束以确保包含所有状态值
ALTER TABLE timesheet_records 
DROP CONSTRAINT IF EXISTS timesheet_records_status_check;

ALTER TABLE timesheet_records 
ADD CONSTRAINT timesheet_records_status_check 
CHECK (status IN ('draft', 'submitted', 'pending', 'approved', 'rejected', 'section_chief_approved'));

-- 添加注释
COMMENT ON COLUMN timesheet_records.status IS '记录状态：draft(草稿), submitted(已提交), pending(待审核), approved(班长已审核), rejected(已拒绝), section_chief_approved(段长已审核)';