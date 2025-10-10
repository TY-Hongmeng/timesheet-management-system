-- 修改processes表的unit_price字段，允许NULL值
-- 这样可以支持后续补充定价的功能

ALTER TABLE processes 
ALTER COLUMN unit_price DROP NOT NULL;

-- 更新默认值为NULL而不是0.00
ALTER TABLE processes 
ALTER COLUMN unit_price SET DEFAULT NULL;

-- 添加注释说明
COMMENT ON COLUMN processes.unit_price IS '工序单价，可以为空，支持后续补充定价';