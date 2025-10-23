-- 回滚软删除功能，移除deleted_at字段和相关RLS策略
-- 恢复为硬删除模式，确保用户可以重新注册

-- 1. 删除软删除相关的触发器和函数（如果存在）
DROP TRIGGER IF EXISTS soft_delete_users_trigger ON users;
DROP FUNCTION IF EXISTS soft_delete_users_function();

-- 2. 移除deleted_at字段的索引（如果存在）
DROP INDEX IF EXISTS idx_users_deleted_at;
DROP INDEX IF EXISTS idx_users_active_not_deleted;

-- 4. 删除所有与软删除相关的RLS策略（包括依赖deleted_at字段的策略）
DROP POLICY IF EXISTS "users_select_active_only" ON users;
DROP POLICY IF EXISTS "users_select_for_history" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_soft_delete_policy" ON users;
DROP POLICY IF EXISTS "prevent_hard_delete" ON users;
DROP POLICY IF EXISTS "allow_view_active_users" ON users;
DROP POLICY IF EXISTS "allow_view_deleted_users_for_history" ON users;
DROP POLICY IF EXISTS "Users can view users" ON users;

-- 5. 使用CASCADE删除deleted_at字段及其依赖
ALTER TABLE users DROP COLUMN IF EXISTS deleted_at CASCADE;

-- 6. 确保anon和authenticated角色有适当的权限
GRANT ALL PRIVILEGES ON users TO authenticated;
GRANT SELECT ON users TO anon;

-- 7. 添加注释说明
COMMENT ON TABLE users IS '用户表 - 已移除软删除功能，支持硬删除和重新注册';

-- 8. 清理可能存在的已软删除用户数据（如果有的话）
-- 注意：这个操作会永久删除之前被软删除的用户
-- 如果不希望删除这些数据，可以注释掉下面的语句

-- 查看是否有软删除的用户（在删除字段前）
-- 如果deleted_at字段已经被删除，这个查询会失败，但不影响迁移
DO $$
BEGIN
    -- 尝试查询软删除的用户数量
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'deleted_at'
    ) THEN
        RAISE NOTICE '发现deleted_at字段仍然存在，请检查迁移执行顺序';
    ELSE
        RAISE NOTICE '软删除字段已成功移除，用户表已恢复为硬删除模式';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '检查软删除字段时出现异常，但不影响迁移继续执行';
END $$;

-- 9. 验证表结构
DO $$
DECLARE
    column_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'deleted_at';
    
    IF column_count = 0 THEN
        RAISE NOTICE '✓ 软删除回滚成功：deleted_at字段已移除';
    ELSE
        RAISE WARNING '⚠ 软删除回滚可能未完全成功：deleted_at字段仍然存在';
    END IF;
END $$;

-- 软删除功能回滚完成，用户表已恢复为硬删除模式，支持用户重新注册