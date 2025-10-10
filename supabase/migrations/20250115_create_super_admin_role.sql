-- 创建或更新超级管理员角色
-- 确保超级管理员拥有所有权限

-- 首先检查超级管理员角色是否存在，如果不存在则创建
INSERT INTO user_roles (id, name, permissions, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    '超级管理员',
    ARRAY[
        'user:read',
        'user:manage', 
        'user:create',
        'user:delete',
        'company:read',
        'company:manage',
        'company:create', 
        'company:delete',
        'process:read',
        'process:manage',
        'process:create',
        'process:delete',
        'role:manage',
        'system:config'
    ],
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM user_roles WHERE name = '超级管理员'
);

-- 如果超级管理员角色已存在，更新其权限确保包含所有权限
UPDATE user_roles 
SET 
    permissions = ARRAY[
        'user:read',
        'user:manage', 
        'user:create',
        'user:delete',
        'company:read',
        'company:manage',
        'company:create', 
        'company:delete',
        'process:read',
        'process:manage',
        'process:create',
        'process:delete',
        'role:manage',
        'system:config'
    ],
    updated_at = NOW()
WHERE name = '超级管理员';

-- 添加注释说明
COMMENT ON TABLE user_roles IS '用户角色表，超级管理员角色自动拥有所有权限';