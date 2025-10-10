-- 修复工时记录项单价计算触发器
-- 保持NULL单价而不是设为0，以正确显示未定义单价

CREATE OR REPLACE FUNCTION calculate_timesheet_item_amounts()
RETURNS TRIGGER AS $$
BEGIN
    -- 从processes表获取单价
    SELECT unit_price INTO NEW.unit_price
    FROM processes
    WHERE id = NEW.process_id;
    
    -- 如果没有找到单价，保持为NULL（不设为0）
    -- 这样前端可以正确显示"未定义"
    
    -- 计算总金额：如果单价为NULL，总金额也为NULL
    IF NEW.unit_price IS NOT NULL THEN
        NEW.total_amount := NEW.quantity * NEW.unit_price;
    ELSE
        NEW.total_amount := NULL;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 注释说明
COMMENT ON FUNCTION calculate_timesheet_item_amounts() IS '计算工时记录项的单价和总金额，保持NULL单价以支持未定义状态显示';