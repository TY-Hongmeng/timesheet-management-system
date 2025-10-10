-- 为历史记录表添加用户姓名冗余字段
-- 这样在删除用户后，历史记录中仍能显示用户姓名

-- 1. 为timesheet_records表添加用户姓名字段
ALTER TABLE timesheet_records 
ADD COLUMN IF NOT EXISTS user_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS supervisor_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS section_chief_name VARCHAR(100);

-- 2. 为approval_history表添加审核者姓名字段
ALTER TABLE approval_history 
ADD COLUMN IF NOT EXISTS approver_name VARCHAR(100);

-- 3. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_timesheet_records_user_name ON timesheet_records(user_name);
CREATE INDEX IF NOT EXISTS idx_approval_history_approver_name ON approval_history(approver_name);

-- 4. 添加字段注释
COMMENT ON COLUMN timesheet_records.user_name IS '员工姓名冗余字段，用于删除用户后保留历史记录中的姓名显示';
COMMENT ON COLUMN timesheet_records.supervisor_name IS '班长姓名冗余字段，用于删除用户后保留历史记录中的姓名显示';
COMMENT ON COLUMN timesheet_records.section_chief_name IS '段长姓名冗余字段，用于删除用户后保留历史记录中的姓名显示';
COMMENT ON COLUMN approval_history.approver_name IS '审核者姓名冗余字段，用于删除用户后保留历史记录中的姓名显示';

-- 5. 更新现有记录的姓名字段（从users表同步）
-- 更新timesheet_records表的用户姓名
UPDATE timesheet_records 
SET user_name = u.name
FROM users u 
WHERE timesheet_records.user_id = u.id 
AND timesheet_records.user_name IS NULL;

-- 更新timesheet_records表的班长姓名
UPDATE timesheet_records 
SET supervisor_name = u.name
FROM users u 
WHERE timesheet_records.supervisor_id = u.id 
AND timesheet_records.supervisor_name IS NULL;

-- 更新timesheet_records表的段长姓名
UPDATE timesheet_records 
SET section_chief_name = u.name
FROM users u 
WHERE timesheet_records.section_chief_id = u.id 
AND timesheet_records.section_chief_name IS NULL;

-- 更新approval_history表的审核者姓名
UPDATE approval_history 
SET approver_name = u.name
FROM users u 
WHERE approval_history.approver_id = u.id 
AND approval_history.approver_name IS NULL;

-- 6. 创建触发器函数，在插入或更新记录时自动填充姓名字段
CREATE OR REPLACE FUNCTION sync_user_names_in_timesheet_records()
RETURNS TRIGGER AS $$
BEGIN
    -- 获取用户姓名
    IF NEW.user_id IS NOT NULL THEN
        SELECT name INTO NEW.user_name FROM users WHERE id = NEW.user_id;
    END IF;
    
    -- 获取班长姓名
    IF NEW.supervisor_id IS NOT NULL THEN
        SELECT name INTO NEW.supervisor_name FROM users WHERE id = NEW.supervisor_id;
    END IF;
    
    -- 获取段长姓名
    IF NEW.section_chief_id IS NOT NULL THEN
        SELECT name INTO NEW.section_chief_name FROM users WHERE id = NEW.section_chief_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器函数，在插入审核历史时自动填充审核者姓名
CREATE OR REPLACE FUNCTION sync_approver_name_in_approval_history()
RETURNS TRIGGER AS $$
BEGIN
    -- 获取审核者姓名
    IF NEW.approver_id IS NOT NULL THEN
        SELECT name INTO NEW.approver_name FROM users WHERE id = NEW.approver_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建触发器
DROP TRIGGER IF EXISTS sync_timesheet_records_user_names ON timesheet_records;
CREATE TRIGGER sync_timesheet_records_user_names
    BEFORE INSERT OR UPDATE ON timesheet_records
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_names_in_timesheet_records();

DROP TRIGGER IF EXISTS sync_approval_history_approver_name ON approval_history;
CREATE TRIGGER sync_approval_history_approver_name
    BEFORE INSERT OR UPDATE ON approval_history
    FOR EACH ROW
    EXECUTE FUNCTION sync_approver_name_in_approval_history();

-- 8. 创建函数用于在删除用户前更新所有相关记录的姓名字段
CREATE OR REPLACE FUNCTION update_user_names_before_delete(user_id_to_delete UUID)
RETURNS VOID AS $$
DECLARE
    user_name_to_preserve VARCHAR(100);
BEGIN
    -- 获取要删除的用户姓名
    SELECT name INTO user_name_to_preserve FROM users WHERE id = user_id_to_delete;
    
    IF user_name_to_preserve IS NULL THEN
        RAISE EXCEPTION '用户不存在: %', user_id_to_delete;
    END IF;
    
    -- 更新timesheet_records表中的相关姓名字段
    UPDATE timesheet_records 
    SET user_name = user_name_to_preserve
    WHERE user_id = user_id_to_delete;
    
    UPDATE timesheet_records 
    SET supervisor_name = user_name_to_preserve
    WHERE supervisor_id = user_id_to_delete;
    
    UPDATE timesheet_records 
    SET section_chief_name = user_name_to_preserve
    WHERE section_chief_id = user_id_to_delete;
    
    -- 更新approval_history表中的审核者姓名字段
    UPDATE approval_history 
    SET approver_name = user_name_to_preserve
    WHERE approver_id = user_id_to_delete;
    
    RAISE NOTICE '已更新用户 % 的所有历史记录姓名字段', user_name_to_preserve;
END;
$$ LANGUAGE plpgsql;

-- 添加函数注释
COMMENT ON FUNCTION update_user_names_before_delete(UUID) IS '在删除用户前更新所有相关历史记录中的姓名字段，确保删除后历史记录仍能显示用户姓名';