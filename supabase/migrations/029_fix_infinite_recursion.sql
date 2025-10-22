-- 紧急修复：解决users表RLS策略无限递归问题
-- 问题：策略在查询users表时又要查询users表获取当前用户信息，导致无限递归

-- 临时禁用users表的RLS，恢复登录功能
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 删除所有可能导致递归的策略
DROP POLICY IF EXISTS "Users can view active users in their company" ON users;
DROP POLICY IF EXISTS "Allow viewing deleted users for history" ON users;
DROP POLICY IF EXISTS "Users can insert users in their company" ON users;
DROP POLICY IF EXISTS "Users can update users in their company" ON users;
DROP POLICY IF EXISTS "Users can soft delete users in their company" ON users;

-- 确保anon和authenticated角色有完整权限（临时解决方案）
GRANT ALL PRIVILEGES ON users TO anon;
GRANT ALL PRIVILEGES ON users TO authenticated;

-- 添加注释说明这是临时修复
COMMENT ON TABLE users IS '临时禁用RLS以修复无限递归问题，需要重新设计策略';