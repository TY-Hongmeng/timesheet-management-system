-- 为users表添加软删除功能
-- 添加deleted_at字段用于标记用户删除时间

-- 添加deleted_at字段
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 添加索引以提高查询性能
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
CREATE INDEX idx_users_active_users ON users(id) WHERE deleted_at IS NULL;

-- 添加注释
COMMENT ON COLUMN users.deleted_at IS '用户删除时间，NULL表示用户未删除，有值表示用户已被软删除';

-- 更新RLS策略，确保已删除用户不会在正常查询中显示
-- 但历史记录查询仍可以访问用户信息

-- 删除现有的用户查询策略
DROP POLICY IF EXISTS "Users can view users in their company" ON users;

-- 重新创建策略，排除已删除的用户
CREATE POLICY "Users can view active users in their company" ON users
  FOR SELECT USING (
    deleted_at IS NULL AND (
      -- 超级管理员可以查看所有公司的用户
      EXISTS (
        SELECT 1 FROM user_roles ur 
        WHERE ur.id = auth.uid()::text::uuid 
        AND ur.name = '超级管理员'
      )
      OR
      -- 其他用户只能查看同公司的用户
      company_id = (
        SELECT company_id FROM users 
        WHERE id = auth.uid() 
        AND deleted_at IS NULL
      )
    )
  );

-- 创建历史记录查询策略，允许查看已删除用户的基本信息（用于历史记录显示）
CREATE POLICY "Allow viewing deleted users for history" ON users
  FOR SELECT USING (
    deleted_at IS NOT NULL AND (
      -- 超级管理员可以查看所有已删除用户
      EXISTS (
        SELECT 1 FROM user_roles ur 
        WHERE ur.id = auth.uid()::text::uuid 
        AND ur.name = '超级管理员'
      )
      OR
      -- 其他用户只能查看同公司的已删除用户
      company_id = (
        SELECT company_id FROM users 
        WHERE id = auth.uid() 
        AND deleted_at IS NULL
      )
    )
  );

-- 更新用户插入策略
DROP POLICY IF EXISTS "Users can insert users in their company" ON users;
CREATE POLICY "Users can insert users in their company" ON users
  FOR INSERT WITH CHECK (
    -- 超级管理员可以在任何公司创建用户
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.id = auth.uid()::text::uuid 
      AND ur.name = '超级管理员'
    )
    OR
    -- 其他用户只能在自己公司创建用户
    company_id = (
      SELECT company_id FROM users 
      WHERE id = auth.uid() 
      AND deleted_at IS NULL
    )
  );

-- 更新用户更新策略
DROP POLICY IF EXISTS "Users can update users in their company" ON users;
CREATE POLICY "Users can update users in their company" ON users
  FOR UPDATE USING (
    deleted_at IS NULL AND (
      -- 超级管理员可以更新所有公司的用户
      EXISTS (
        SELECT 1 FROM user_roles ur 
        WHERE ur.id = auth.uid()::text::uuid 
        AND ur.name = '超级管理员'
      )
      OR
      -- 其他用户只能更新同公司的用户
      company_id = (
        SELECT company_id FROM users 
        WHERE id = auth.uid() 
        AND deleted_at IS NULL
      )
    )
  ) WITH CHECK (
    -- 确保更新后的用户仍在同一公司（防止跨公司转移）
    company_id = (
      SELECT company_id FROM users 
      WHERE id = auth.uid() 
      AND deleted_at IS NULL
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.id = auth.uid()::text::uuid 
      AND ur.name = '超级管理员'
    )
  );

-- 更新用户删除策略（实际上是软删除，即更新deleted_at字段）
DROP POLICY IF EXISTS "Users can delete users in their company" ON users;
CREATE POLICY "Users can soft delete users in their company" ON users
  FOR UPDATE USING (
    deleted_at IS NULL AND (
      -- 超级管理员可以删除所有公司的用户
      EXISTS (
        SELECT 1 FROM user_roles ur 
        WHERE ur.id = auth.uid()::text::uuid 
        AND ur.name = '超级管理员'
      )
      OR
      -- 其他用户只能删除同公司的用户
      company_id = (
        SELECT company_id FROM users 
        WHERE id = auth.uid() 
        AND deleted_at IS NULL
      )
    )
  );

-- 确保anon和authenticated角色有适当的权限
GRANT SELECT ON users TO anon;
GRANT ALL PRIVILEGES ON users TO authenticated;