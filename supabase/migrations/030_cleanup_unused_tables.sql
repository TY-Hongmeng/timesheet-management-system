-- 清理未使用的数据库表
-- 删除departments和permission_categories表，因为代码中未使用这些表

-- 首先删除相关的外键约束
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_department_id_fkey;

-- 删除departments表
DROP TABLE IF EXISTS departments CASCADE;

-- 删除permission_categories表
DROP TABLE IF EXISTS permission_categories CASCADE;

-- 删除users表中不再需要的department_id字段
ALTER TABLE users DROP COLUMN IF EXISTS department_id;

-- 删除相关的权限检查函数（如果存在）
DROP FUNCTION IF EXISTS check_user_permission(UUID, TEXT);

-- 清理可能存在的索引
DROP INDEX IF EXISTS idx_user_roles_permissions;
DROP INDEX IF EXISTS idx_users_role_id;