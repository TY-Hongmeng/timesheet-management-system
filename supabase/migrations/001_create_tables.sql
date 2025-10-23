-- 创建公司表
CREATE TABLE companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建部门表
CREATE TABLE departments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- 创建用户角色表
CREATE TABLE user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建用户表
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone VARCHAR(20) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  id_card VARCHAR(18) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  role_id UUID NOT NULL REFERENCES user_roles(id) ON DELETE RESTRICT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_id_card ON users(id_card);
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_departments_company_id ON departments(company_id);

-- 插入默认角色数据
INSERT INTO user_roles (name, description, permissions) VALUES
('超级管理员', '系统超级管理员，拥有所有权限', '["all"]'),
('公司管理员', '公司管理员，可以管理公司内所有用户和部门', '["company_manage", "user_manage", "department_manage"]'),
('部门管理员', '部门管理员，可以管理本部门用户', '["department_user_manage"]'),
('普通用户', '普通用户，只能查看和修改自己的信息', '["self_manage"]');

-- 插入示例公司数据
INSERT INTO companies (name, email) VALUES
('示例科技有限公司', 'contact@example.com'),
('测试企业集团', 'info@test.com');

-- 启用行级安全策略
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
-- 公司表策略
CREATE POLICY "Users can view their own company" ON companies
  FOR SELECT USING (auth.uid()::text IN (
    SELECT id::text FROM users WHERE company_id = companies.id
  ));

CREATE POLICY "Company admins can manage their company" ON companies
  FOR ALL USING (auth.uid()::text IN (
    SELECT u.id::text FROM users u
    JOIN user_roles r ON u.role_id = r.id
    WHERE u.company_id = companies.id
    AND (r.permissions ? 'all' OR r.permissions ? 'company_manage')
  ));

-- 用户表策略
CREATE POLICY "Users can view users in their company" ON users
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM users WHERE id::text = auth.uid()::text
  ));

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (id::text = auth.uid()::text);

CREATE POLICY "Admins can manage users in their company" ON users
  FOR ALL USING (company_id IN (
    SELECT u.company_id FROM users u
    JOIN user_roles r ON u.role_id = r.id
    WHERE u.id::text = auth.uid()::text
    AND (r.permissions ? 'all' OR r.permissions ? 'user_manage')
  ));

-- 部门表策略
CREATE POLICY "Users can view departments in their company" ON departments
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM users WHERE id::text = auth.uid()::text
  ));

CREATE POLICY "Admins can manage departments in their company" ON departments
  FOR ALL USING (company_id IN (
    SELECT u.company_id FROM users u
    JOIN user_roles r ON u.role_id = r.id
    WHERE u.id::text = auth.uid()::text
    AND (r.permissions ? 'all' OR r.permissions ? 'department_manage')
  ));

-- 角色表策略
CREATE POLICY "All authenticated users can view roles" ON user_roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only super admins can manage roles" ON user_roles
  FOR ALL USING (auth.uid()::text IN (
    SELECT u.id::text FROM users u
    JOIN user_roles r ON u.role_id = r.id
    WHERE r.permissions ? 'all'
  ));

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 为所有表添加更新时间触发器
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();