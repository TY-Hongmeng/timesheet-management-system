-- 实现安全的users表RLS策略，避免无限递归
-- 使用应用层逻辑而不是数据库层递归查询

-- 重新启用RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 创建简单的策略，避免在策略中查询users表自身
-- 策略1：允许查看未删除的用户（不依赖当前用户查询）
CREATE POLICY "allow_view_active_users" ON users
  FOR SELECT USING (
    deleted_at IS NULL
  );

-- 策略2：允许查看已删除用户的基本信息（用于历史记录）
CREATE POLICY "allow_view_deleted_users_for_history" ON users
  FOR SELECT USING (
    deleted_at IS NOT NULL
  );

-- 策略3：允许插入新用户
CREATE POLICY "allow_insert_users" ON users
  FOR INSERT WITH CHECK (true);

-- 策略4：允许更新用户信息（包括软删除）
CREATE POLICY "allow_update_users" ON users
  FOR UPDATE USING (true) WITH CHECK (true);

-- 策略5：禁止物理删除用户
CREATE POLICY "prevent_delete_users" ON users
  FOR DELETE USING (false);

-- 确保权限正确设置
GRANT SELECT, INSERT, UPDATE ON users TO anon;
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;

-- 移除DELETE权限，强制使用软删除
REVOKE DELETE ON users FROM anon;
REVOKE DELETE ON users FROM authenticated;

-- 更新表注释
COMMENT ON TABLE users IS '用户表，使用软删除机制，通过deleted_at字段标记删除状态';
COMMENT ON COLUMN users.deleted_at IS '软删除时间戳，NULL表示活跃用户，非NULL表示已删除用户';