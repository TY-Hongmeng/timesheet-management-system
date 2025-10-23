-- 添加工序表的唯一性约束，防止重复数据
-- 约束条件：相同公司、生产线、工时类型、产品名称、产品工序不能重复

-- 首先删除可能存在的重复数据（保留最新的记录）
WITH duplicate_processes AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY 
        company_id, 
        TRIM(production_line), 
        production_category, 
        TRIM(product_name), 
        TRIM(product_process)
      ORDER BY created_at DESC
    ) as rn
  FROM processes
  WHERE is_active = true
)
DELETE FROM processes 
WHERE id IN (
  SELECT id 
  FROM duplicate_processes 
  WHERE rn > 1
);

-- 创建部分唯一索引（仅对活跃记录生效）
CREATE UNIQUE INDEX IF NOT EXISTS idx_processes_unique_active 
ON processes (company_id, production_line, production_category, product_name, product_process) 
WHERE is_active = true;

-- 创建普通索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_processes_lookup 
ON processes (company_id, production_line, production_category, product_name, product_process);

-- 添加注释
COMMENT ON INDEX idx_processes_unique_active IS 
'确保同一公司内相同的生产线、工时类型、产品名称、产品工序组合唯一（仅对活跃记录）';