-- 修复users表删除权限问题
-- 确保管理员角色可以删除用户记录

-- 确保users表的RLS已禁用（从029迁移继承）
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 确保anon和authenticated角色有完整权限
GRANT ALL PRIVILEGES ON users TO anon;
GRANT ALL PRIVILEGES ON users TO authenticated;

-- 确保public角色也有必要权限
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO public;

-- 检查并修复序列权限（如果存在）
DO $$
BEGIN
    -- 检查是否存在users相关的序列
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name LIKE '%users%') THEN
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO public;
    END IF;
END $$;

-- 添加注释
COMMENT ON TABLE users IS '用户表 - 已禁用RLS，允许管理员删除用户';

-- 验证权限设置
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND grantee IN ('anon', 'authenticated', 'public')
ORDER BY grantee, privilege_type;