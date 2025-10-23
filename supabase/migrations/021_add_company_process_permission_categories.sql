-- 添加公司管理和工序管理权限分类
INSERT INTO permission_categories (category, display_name, description, sort_order) VALUES
('company_management', '公司管理', '管理公司信息、设置和配置', 2),
('process_management', '工序管理', '管理工序流程、创建和配置工序', 3)
ON CONFLICT (category) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

-- 更新现有权限分类的排序
UPDATE permission_categories SET sort_order = 1 WHERE category = 'user_management';
UPDATE permission_categories SET sort_order = 4 WHERE category = 'system_management';