-- 重新创建工时记录相关表
-- 删除已存在的表（如果存在）
DROP TABLE IF EXISTS approval_history CASCADE;
DROP TABLE IF EXISTS timesheet_record_items CASCADE;
DROP TABLE IF EXISTS timesheet_records CASCADE;
DROP TABLE IF EXISTS production_lines CASCADE;
DROP TABLE IF EXISTS work_types CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- 创建生产线表
CREATE TABLE production_lines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建工时类型表
CREATE TABLE work_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建产品表
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    specification TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建工时记录主表
CREATE TABLE timesheet_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    record_date DATE NOT NULL,
    production_line_id INTEGER NOT NULL REFERENCES production_lines(id),
    supervisor_id UUID REFERENCES users(id),
    section_chief_id UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建工时记录明细表
CREATE TABLE timesheet_record_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timesheet_record_id UUID NOT NULL REFERENCES timesheet_records(id) ON DELETE CASCADE,
    work_type_id INTEGER NOT NULL REFERENCES work_types(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    process_id UUID NOT NULL REFERENCES processes(id),
    quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(20) DEFAULT '件',
    unit_price DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建审核历史表
CREATE TABLE approval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timesheet_record_id UUID NOT NULL REFERENCES timesheet_records(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES users(id),
    approver_type VARCHAR(20) NOT NULL CHECK (approver_type IN ('supervisor', 'section_chief', 'admin')),
    action VARCHAR(20) NOT NULL CHECK (action IN ('approved', 'rejected')),
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_timesheet_records_user_id ON timesheet_records(user_id);
CREATE INDEX idx_timesheet_records_date ON timesheet_records(record_date);
CREATE INDEX idx_timesheet_records_status ON timesheet_records(status);
CREATE INDEX idx_timesheet_records_supervisor ON timesheet_records(supervisor_id);
CREATE INDEX idx_timesheet_records_section_chief ON timesheet_records(section_chief_id);
CREATE INDEX idx_timesheet_record_items_record_id ON timesheet_record_items(timesheet_record_id);
CREATE INDEX idx_approval_history_record_id ON approval_history(timesheet_record_id);
CREATE INDEX idx_approval_history_approver ON approval_history(approver_id);

-- 插入初始数据
-- 生产线数据
INSERT INTO production_lines (name, description) VALUES
('生产线A', '主要生产线A'),
('生产线B', '主要生产线B'),
('生产线C', '主要生产线C');

-- 工时类型数据
INSERT INTO work_types (name, description) VALUES
('正常工时', '正常工作时间'),
('加班工时', '加班工作时间'),
('夜班工时', '夜班工作时间');

-- 产品数据
INSERT INTO products (name, code, specification) VALUES
('产品A', 'PA001', '产品A规格说明'),
('产品B', 'PB001', '产品B规格说明'),
('产品C', 'PC001', '产品C规格说明');

-- 启用行级安全策略
ALTER TABLE production_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_record_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_history ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
-- 基础数据表：所有认证用户可读
CREATE POLICY "production_lines_select" ON production_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "work_types_select" ON work_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_select" ON products FOR SELECT TO authenticated USING (true);

-- 工时记录表：用户只能操作自己的记录，班长和段长可以查看和更新相关记录
CREATE POLICY "timesheet_records_user_access" ON timesheet_records 
    FOR ALL TO authenticated 
    USING (user_id = auth.uid());

CREATE POLICY "timesheet_records_supervisor_access" ON timesheet_records 
    FOR SELECT TO authenticated 
    USING (supervisor_id = auth.uid() OR section_chief_id = auth.uid());

CREATE POLICY "timesheet_records_supervisor_update" ON timesheet_records 
    FOR UPDATE TO authenticated 
    USING (supervisor_id = auth.uid() OR section_chief_id = auth.uid())
    WITH CHECK (supervisor_id = auth.uid() OR section_chief_id = auth.uid());

-- 工时记录项：通过主记录的权限控制
CREATE POLICY "timesheet_record_items_access" ON timesheet_record_items 
    FOR ALL TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM timesheet_records tr 
            WHERE tr.id = timesheet_record_id 
            AND (tr.user_id = auth.uid() OR tr.supervisor_id = auth.uid() OR tr.section_chief_id = auth.uid())
        )
    );

-- 审核历史：相关人员可查看
CREATE POLICY "approval_history_access" ON approval_history 
    FOR ALL TO authenticated 
    USING (
        approver_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM timesheet_records tr 
            WHERE tr.id = timesheet_record_id 
            AND (tr.user_id = auth.uid() OR tr.supervisor_id = auth.uid() OR tr.section_chief_id = auth.uid())
        )
    );

-- 授予权限
GRANT ALL PRIVILEGES ON production_lines TO authenticated;
GRANT ALL PRIVILEGES ON work_types TO authenticated;
GRANT ALL PRIVILEGES ON products TO authenticated;
GRANT ALL PRIVILEGES ON timesheet_records TO authenticated;
GRANT ALL PRIVILEGES ON timesheet_record_items TO authenticated;
GRANT ALL PRIVILEGES ON approval_history TO authenticated;

-- 授予序列权限
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_production_lines_updated_at BEFORE UPDATE ON production_lines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_work_types_updated_at BEFORE UPDATE ON work_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_timesheet_records_updated_at BEFORE UPDATE ON timesheet_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_timesheet_record_items_updated_at BEFORE UPDATE ON timesheet_record_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建计算单价和总金额的触发器函数
CREATE OR REPLACE FUNCTION calculate_timesheet_item_amounts()
RETURNS TRIGGER AS $$
BEGIN
    -- 从processes表获取单价
    SELECT unit_price INTO NEW.unit_price
    FROM processes
    WHERE id = NEW.process_id;
    
    -- 如果没有找到单价，设为0
    IF NEW.unit_price IS NULL THEN
        NEW.unit_price := 0;
    END IF;
    
    -- 计算总金额
    NEW.total_amount := NEW.quantity * NEW.unit_price;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建触发器
CREATE TRIGGER calculate_timesheet_item_amounts_trigger
    BEFORE INSERT OR UPDATE ON timesheet_record_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_timesheet_item_amounts();

-- 添加表注释
COMMENT ON TABLE production_lines IS '生产线表';
COMMENT ON TABLE work_types IS '工时类型表';
COMMENT ON TABLE products IS '产品表';
COMMENT ON TABLE timesheet_records IS '工时记录主表';
COMMENT ON TABLE timesheet_record_items IS '工时记录明细表';
COMMENT ON TABLE approval_history IS '审核历史表';