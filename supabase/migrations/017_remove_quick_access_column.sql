-- 删除user_roles表中未使用的quick_access列
-- 该字段只在角色编辑页面中被配置，但在实际的界面导航和权限控制中没有被使用

ALTER TABLE user_roles DROP COLUMN IF EXISTS quick_access;