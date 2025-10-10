-- 为工序表添加生效日期字段
ALTER TABLE processes ADD COLUMN effective_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- 为生效日期字段创建索引，提高查询性能
CREATE INDEX idx_processes_effective_date ON processes(effective_date);

-- 为现有数据设置生效日期为创建日期
UPDATE processes SET effective_date = created_at::date WHERE effective_date IS NULL;

-- 添加注释
COMMENT ON COLUMN processes.effective_date IS '工序单价生效日期，用于版本管理';

-- 创建复合索引，用于查询特定日期的有效工序
CREATE INDEX idx_processes_company_effective ON processes(company_id, effective_date DESC);
CREATE INDEX idx_processes_product_effective ON processes(product_name, product_process, effective_date DESC);