-- 修复超级管理员角色ID问题
-- 为超级管理员角色设置正确的ID

UPDATE user_roles 
SET id = 'cf0fc7f2-caf2-453b-b3b7-f18e39625c50' 
WHERE name = '超级管理员' AND id IS NULL;

-- 验证修复结果
SELECT id, name, permissions FROM user_roles WHERE name = '超级管理员';