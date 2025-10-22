-- 更新单价字段精度为3位小数
-- 修改processes表的unit_price字段精度
ALTER TABLE processes ALTER COLUMN unit_price TYPE DECIMAL(10,3);

-- 修改timesheet_record_items表的unit_price字段精度
ALTER TABLE timesheet_record_items ALTER COLUMN unit_price TYPE DECIMAL(10,3);

-- 修改modification_history表的相关字段精度（如果表存在）
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'modification_history') THEN
        ALTER TABLE modification_history ALTER COLUMN old_amount TYPE NUMERIC(10,3);
        ALTER TABLE modification_history ALTER COLUMN new_amount TYPE NUMERIC(10,3);
        COMMENT ON COLUMN modification_history.old_amount IS '修改前金额，精确到小数点后三位';
        COMMENT ON COLUMN modification_history.new_amount IS '修改后金额，精确到小数点后三位';
    END IF;
END $$;

-- 添加注释
COMMENT ON COLUMN processes.unit_price IS '单价，精确到小数点后三位';
COMMENT ON COLUMN timesheet_record_items.unit_price IS '单价，精确到小数点后三位';