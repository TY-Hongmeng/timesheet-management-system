-- 修复RLS策略以支持匿名用户操作
-- 删除现有的依赖auth.uid()的策略，创建新的允许匿名用户操作的策略

-- 删除现有的用户表策略
DROP POLICY IF EXISTS "Users can view users in their company" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage users in their company" ON users;

-- 删除现有的公司表策略
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Company admins can manage their company" ON companies;

-- 删除现有的部门表策略
DROP POLICY IF EXISTS "Users can view departments in their company" ON departments;
DROP POLICY IF EXISTS "Admins can manage departments in their company" ON departments;

-- 删除现有的角色表策略
DROP POLICY IF EXISTS "All authenticated users can view roles" ON user_roles;
DROP POLICY IF EXISTS "Only super admins can manage roles" ON user_roles;

-- 创建新的策略，允许匿名用户进行操作
-- 用户表策略 - 允许匿名用户进行所有操作
CREATE POLICY "Allow anonymous access to users" ON users
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated access to users" ON users
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 公司表策略 - 允许匿名用户进行所有操作
CREATE POLICY "Allow anonymous access to companies" ON companies
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated access to companies" ON companies
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 部门表策略 - 允许匿名用户进行所有操作
CREATE POLICY "Allow anonymous access to departments" ON departments
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated access to departments" ON departments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 角色表策略 - 允许匿名用户进行所有操作
CREATE POLICY "Allow anonymous access to user_roles" ON user_roles
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated access to user_roles" ON user_roles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 确保anon和authenticated角色有正确的权限
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;