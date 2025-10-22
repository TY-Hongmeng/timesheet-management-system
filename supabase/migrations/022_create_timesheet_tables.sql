-- 创建工时记录相关表

-- 创建生产线表
CREATE TABLE IF NOT EXISTS production_lines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建工时类型表
CREATE TABLE IF NOT EXISTS work_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建产品表
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    specification TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建工时记录主表
CREATE TABLE IF NOT EXISTS timesheet_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    record_date DATE NOT NULL,
    production_line_id INTEGER NOT NULL REFERENCES production_lines(id),
    supervisor_id UUID REFERENCES auth.users(id),
    section_chief_id UUID REFERENCES auth.users(id),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建工时记录明细表
CREATE TABLE IF NOT EXISTS timesheet_record_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timesheet_record_id UUID NOT NULL REFERENCES timesheet_records(id) ON DELETE CASCADE,
    work_type_id INTEGER NOT NULL REFERENCES work_types(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    process_id UUID NOT NULL REFERENCES processes(id),
    quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(10) NOT NULL DEFAULT '件',
    unit_price DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_timesheet_records_user_id ON timesheet_records(user_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_records_date ON timesheet_records(record_date DESC);
CREATE INDEX IF NOT EXISTS idx_timesheet_records_production_line ON timesheet_records(production_line_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_timesheet_records_user_date ON timesheet_records(user_id, record_date);

CREATE INDEX IF NOT EXISTS idx_timesheet_items_record_id ON timesheet_record_items(timesheet_record_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_items_work_type ON timesheet_record_items(work_type_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_items_product ON timesheet_record_items(product_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_items_process ON timesheet_record_items(process_id);

-- 插入初始数据
INSERT INTO production_lines (name, description) VALUES
('生产线A', '主要生产线A'),
('生产线B', '主要生产线B'),
('生产线C', '主要生产线C')
ON CONFLICT DO NOTHING;

INSERT INTO work_types (name, description) VALUES
('正常工时', '正常工作时间'),
('加班工时', '超出正常工作时间'),
('夜班工时', '夜间工作时间'),
('节假日工时', '节假日工作时间')
ON CONFLICT DO NOTHING;

INSERT INTO products (name, code, specification) VALUES
('产品A', 'PROD-A001', '规格说明A'),
('产品B', 'PROD-B001', '规格说明B'),
('产品C', 'PROD-C001', '规格说明C')
ON CONFLICT DO NOTHING;

-- 启用行级安全
ALTER TABLE timesheet_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_record_items ENABLE ROW LEVEL SECURITY;

-- 工时记录策略
CREATE POLICY "用户只能查看自己的工时记录" ON timesheet_records
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户只能创建自己的工时记录" ON timesheet_records
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户只能更新自己的工时记录" ON timesheet_records
    FOR UPDATE USING (auth.uid() = user_id);

-- 管理员可以查看所有记录
CREATE POLICY "管理员可以查看所有工时记录" ON timesheet_records
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN user_roles ur ON u.role_id = ur.id
            WHERE u.id = auth.uid() 
            AND ur.name IN ('管理员', '超级管理员')
        )
    );

-- 工时记录明细策略
CREATE POLICY "用户只能查看自己的工时明细" ON timesheet_record_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM timesheet_records 
            WHERE timesheet_records.id = timesheet_record_items.timesheet_record_id 
            AND timesheet_records.user_id = auth.uid()
        )
    );

CREATE POLICY "用户只能创建自己的工时明细" ON timesheet_record_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM timesheet_records 
            WHERE timesheet_records.id = timesheet_record_items.timesheet_record_id 
            AND timesheet_records.user_id = auth.uid()
        )
    );

CREATE POLICY "管理员可以查看所有工时明细" ON timesheet_record_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN user_roles ur ON u.role_id = ur.id
            WHERE u.id = auth.uid() 
            AND ur.name IN ('管理员', '超级管理员')
        )
    );

-- 授权给认证用户
GRANT ALL PRIVILEGES ON timesheet_records TO authenticated;
GRANT ALL PRIVILEGES ON timesheet_record_items TO authenticated;
GRANT SELECT ON production_lines TO authenticated;
GRANT SELECT ON work_types TO authenticated;
GRANT SELECT ON products TO authenticated;

-- 授权给匿名用户（只读基础数据）
GRANT SELECT ON production_lines TO anon;
GRANT SELECT ON work_types TO anon;
GRANT SELECT ON products TO anon;

-- 添加更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_timesheet_records_updated_at BEFORE UPDATE ON timesheet_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 添加表注释
COMMENT ON TABLE production_lines IS '生产线表';
COMMENT ON TABLE work_types IS '工时类型表';
COMMENT ON TABLE products IS '产品表';
COMMENT ON TABLE timesheet_records IS '工时记录主表';
COMMENT ON TABLE timesheet_record_items IS '工时记录明细表';