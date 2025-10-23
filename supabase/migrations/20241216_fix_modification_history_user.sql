-- 创建函数来更新工时记录项并正确设置修改历史的用户信息
CREATE OR REPLACE FUNCTION update_timesheet_item_with_user(
    item_id UUID,
    new_quantity INTEGER,
    new_amount NUMERIC(10,2),
    modifier_id UUID,
    modifier_name VARCHAR(100)
)
RETURNS VOID AS $$
BEGIN
    -- 设置会话变量
    PERFORM set_config('app.current_user_id', modifier_id::text, true);
    PERFORM set_config('app.modifier_name', modifier_name, true);
    
    -- 更新工时记录项（这会触发修改历史记录）
    UPDATE timesheet_record_items 
    SET quantity = new_quantity, amount = new_amount
    WHERE id = item_id;
END;
$$ LANGUAGE plpgsql;

-- 更新触发器函数，优先使用会话变量中的用户信息
CREATE OR REPLACE FUNCTION record_timesheet_item_modification()
RETURNS TRIGGER AS $$
DECLARE
    modifier_name_val VARCHAR(100);
    modifier_id_val UUID;
BEGIN
    -- 只有当数量发生变化时才记录修改历史
    IF OLD.quantity != NEW.quantity THEN
        -- 优先使用会话变量中的用户信息
        BEGIN
            modifier_id_val := current_setting('app.current_user_id', true)::UUID;
            modifier_name_val := current_setting('app.modifier_name', true);
        EXCEPTION WHEN OTHERS THEN
            modifier_id_val := NULL;
            modifier_name_val := NULL;
        END;
        
        -- 如果会话变量中没有用户信息，尝试从用户表查询
        IF modifier_id_val IS NULL OR modifier_name_val IS NULL THEN
            SELECT id, name INTO modifier_id_val, modifier_name_val 
            FROM users 
            WHERE id = COALESCE(current_setting('app.current_user_id', true)::UUID, NULL);
        END IF;
        
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
            modifier_id_val,
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

-- 重新创建触发器
DROP TRIGGER IF EXISTS trigger_record_timesheet_item_modification ON timesheet_record_items;
CREATE TRIGGER trigger_record_timesheet_item_modification
    AFTER UPDATE ON timesheet_record_items
    FOR EACH ROW
    EXECUTE FUNCTION record_timesheet_item_modification();