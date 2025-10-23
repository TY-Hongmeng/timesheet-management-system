-- 最终修复修改历史记录中用户信息的问题
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
        IF modifier_id_val IS NULL THEN
            BEGIN
                modifier_id_val := current_setting('app.current_user_id', true)::UUID;
                SELECT name INTO modifier_name_val 
                FROM users 
                WHERE id = modifier_id_val;
            EXCEPTION WHEN OTHERS THEN
                modifier_id_val := NULL;
                modifier_name_val := NULL;
            END;
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