-- 创建工序管理表
CREATE TABLE processes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  process_content VARCHAR(255) NOT NULL, -- 工序内容
  production_line VARCHAR(255) NOT NULL, -- 生产线
  production_category VARCHAR(255) NOT NULL, -- 生产类别
  product_name VARCHAR(255) NOT NULL, -- 产品名称
  product_process VARCHAR(255) NOT NULL, -- 产品工序
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00, -- 单价
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_processes_company_id ON processes(company_id);
CREATE INDEX idx_processes_production_line ON processes(production_line);
CREATE INDEX idx_processes_production_category ON processes(production_category);
CREATE INDEX idx_processes_product_name ON processes(product_name);
CREATE INDEX idx_processes_is_active ON processes(is_active);

-- 启用行级安全策略
ALTER TABLE processes ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
-- 用户可以查看自己公司的工序
CREATE POLICY "Users can view processes in their company" ON processes
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM users WHERE id::text = auth.uid()::text
  ));

-- 管理员可以管理自己公司的工序
CREATE POLICY "Admins can manage processes in their company" ON processes
  FOR ALL USING (company_id IN (
    SELECT u.company_id FROM users u
    JOIN user_roles r ON u.role_id = r.id
    WHERE u.id::text = auth.uid()::text
    AND (r.permissions ? 'all' OR r.permissions ? 'company_manage' OR r.permissions ? 'process_manage')
  ));

-- 为工序表添加更新时间触发器
CREATE TRIGGER update_processes_updated_at BEFORE UPDATE ON processes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入示例工序数据
INSERT INTO processes (company_id, process_content, production_line, production_category, product_name, product_process, unit_price)
SELECT 
  c.id,
  '组装工序',
  '生产线A',
  '电子产品',
  '智能手机',
  '主板组装',
  15.50
FROM companies c
WHERE c.name = '示例科技有限公司'
LIMIT 1;

INSERT INTO processes (company_id, process_content, production_line, production_category, product_name, product_process, unit_price)
SELECT 
  c.id,
  '测试工序',
  '生产线B',
  '电子产品',
  '平板电脑',
  '功能测试',
  12.00
FROM companies c
WHERE c.name = '示例科技有限公司'
LIMIT 1;

INSERT INTO processes (company_id, process_content, production_line, production_category, product_name, product_process, unit_price)
SELECT 
  c.id,
  '包装工序',
  '生产线C',
  '消费品',
  '家用电器',
  '产品包装',
  8.75
FROM companies c
WHERE c.name = '测试企业集团'
LIMIT 1;