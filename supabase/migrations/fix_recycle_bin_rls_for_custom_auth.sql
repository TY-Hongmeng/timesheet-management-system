-- 修复回收站RLS策略，使其支持自定义认证系统
-- 由于应用使用自定义认证，auth.uid()返回null，导致RLS策略过滤掉所有数据

-- 删除现有的查看策略
DROP POLICY IF EXISTS "Users can view recycle bin items in their company" ON recycle_bin;

-- 创建新的查看策略：允许所有用户查看所有回收站项目
-- 注意：应用会在客户端进行权限验证
CREATE POLICY "Allow all users to view recycle bin items" ON recycle_bin
  FOR SELECT
  USING (true);

-- 确保anon用户有SELECT权限
GRANT SELECT ON recycle_bin TO anon;

-- 确保authenticated用户有完整权限
GRANT SELECT, UPDATE, DELETE ON recycle_bin TO authenticated;
