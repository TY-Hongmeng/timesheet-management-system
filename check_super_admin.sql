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

-- 如果超级管理员有company_id，则将其设置为null
UPDATE users 
SET company_id = NULL 
WHERE role_id = (SELECT id FROM user_roles WHERE name = '超级管理员')
AND company_id IS NOT NULL;