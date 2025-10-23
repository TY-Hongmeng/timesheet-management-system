-- 添加公司管理和工序管理权限分类
-- 创建时间: 2025-01-14

-- 添加公司管理权限分类
INSERT INTO permission_categories (category, display_name, description, sort_order) VALUES
('company_management', '公司管理', '管理公司信息、设置和组织结构', 2);

-- 添加工序管理权限分类
INSERT INTO permission_categories (category, display_name, description, sort_order) VALUES
('process_management', '工序管理', '管理生产工序、流程和工艺设置', 3);

-- 更新其他分类的排序，为新分类腾出空间
UPDATE permission_categories SET sort_order = 4 WHERE category = 'timesheet_management';
UPDATE permission_categories SET sort_order = 5 WHERE category = 'project_management';
UPDATE permission_categories SET sort_order = 6 WHERE category = 'department_management';
UPDATE permission_categories SET sort_order = 7 WHERE category = 'report_management';
UPDATE permission_categories SET sort_order = 8 WHERE category = 'system_management';

-- 验证插入结果
SELECT category, display_name, description, sort_order 
FROM permission_categories 
ORDER BY sort_order;