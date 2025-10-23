-- 创建工时记录项目修改历史表
CREATE TABLE IF NOT EXISTS timesheet_item_modification_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timesheet_record_item_id UUID NOT NULL REFERENCES timesheet_record_items(id) ON DELETE CASCADE,
    timesheet_record_id UUID NOT NULL REFERENCES timesheet_records(id) ON DELETE CASCADE,
    modifier_id UUID REFERENCES users(id) ON DELETE SET NULL,
    modifier_name VARCHAR(100), -- 冗余字段，用于删除用户后保留历史记录中的姓名显示
    old_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    old_amount NUMERIC(10,2) NOT NULL,
    new_amount NUMERIC(10,2) NOT NULL,
    modification_reason TEXT, -- 修改原因
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_modification_history_record_item ON timesheet_item_modification_history(timesheet_record_item_id);
CREATE INDEX IF NOT EXISTS idx_modification_history_record ON timesheet_item_modification_history(timesheet_record_id);
CREATE INDEX IF NOT EXISTS idx_modification_history_modifier ON timesheet_item_modification_history(modifier_id);
CREATE INDEX IF NOT EXISTS idx_modification_history_created_at ON timesheet_item_modification_history(created_at);

-- 添加注释
COMMENT ON TABLE timesheet_item_modification_history IS '工时记录项目修改历史表 - 记录工时数量的修改历史';
COMMENT ON COLUMN timesheet_item_modification_history.timesheet_record_item_id IS '工时记录项目ID';
COMMENT ON COLUMN timesheet_item_modification_history.timesheet_record_id IS '工时记录ID';
COMMENT ON COLUMN timesheet_item_modification_history.modifier_id IS '修改者ID，允许为null以支持用户删除后保留历史记录';
COMMENT ON COLUMN timesheet_item_modification_history.modifier_name IS '修改者姓名冗余字段，用于删除用户后保留历史记录中的姓名显示';
COMMENT ON COLUMN timesheet_item_modification_history.old_quantity IS '修改前数量';
COMMENT ON COLUMN timesheet_item_modification_history.new_quantity IS '修改后数量';
COMMENT ON COLUMN timesheet_item_modification_history.old_amount IS '修改前金额';
COMMENT ON COLUMN timesheet_item_modification_history.new_amount IS '修改后金额';
COMMENT ON COLUMN timesheet_item_modification_history.modification_reason IS '修改原因';
COMMENT ON COLUMN timesheet_item_modification_history.created_at IS '修改时间';

-- 创建触发器函数，在工时记录项目更新时自动记录修改历史
CREATE OR REPLACE FUNCTION record_timesheet_item_modification()
RETURNS TRIGGER AS $$
DECLARE
    modifier_name_val VARCHAR(100);
BEGIN
    -- 只有当数量发生变化时才记录修改历史
    IF OLD.quantity != NEW.quantity THEN
        -- 获取修改者姓名（如果有的话）
        SELECT name INTO modifier_name_val 
        FROM users 
        WHERE id = COALESCE(current_setting('app.current_user_id', true)::UUID, NULL);
        
        -- 插入修改历史记录
        INSERT INTO timesheet_item_modification_history (
            timesheet_record_item_id,
            timesheet_record_id,
            modifier_id,
            modifier_name,
            old_quantity,
            new_quantity,
            old_amount,
            new_amount,
            modification_reason
        ) VALUES (
            NEW.id,
            NEW.timesheet_record_id,
            COALESCE(current_setting('app.current_user_id', true)::UUID, NULL),
            modifier_name_val,
            OLD.quantity,
            NEW.quantity,
            OLD.amount,
            NEW.amount,
            COALESCE(current_setting('app.modification_reason', true), '数量修改')
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_record_timesheet_item_modification ON timesheet_record_items;
CREATE TRIGGER trigger_record_timesheet_item_modification
    AFTER UPDATE ON timesheet_record_items
    FOR EACH ROW
    EXECUTE FUNCTION record_timesheet_item_modification();

-- 禁用RLS（与其他表保持一致）
ALTER TABLE timesheet_item_modification_history DISABLE ROW LEVEL SECURITY;