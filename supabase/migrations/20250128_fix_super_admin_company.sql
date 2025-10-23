-- 修改users表的company_id字段，允许为null（针对超级管理员）
ALTER TABLE users ALTER COLUMN company_id DROP NOT NULL;

-- 检查超级管理员的company_id字段
SELECT 
    u.id,
    u.name,
    u.phone,
    u.company_id,
    ur.name as role_name
FROM users u
JOIN user_roles ur ON u.role_id = ur.id
WHERE ur.name = '超级管理员';

-- 将超级管理员的company_id设置为null
UPDATE users 
SET company_id = NULL 
WHERE role_id = (SELECT id FROM user_roles WHERE name = '超级管理员');