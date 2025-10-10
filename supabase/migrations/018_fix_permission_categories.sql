-- 修复permission_categories表数据
-- 如果表为空，重新插入权限分类数据

-- 先清空表（以防有部分数据）
TRUNCATE TABLE permission_categories;

-- 重新插入权限分类数据
INSERT INTO permission_categories (category, display_name, description, sort_order) VALUES
('user_management', '用户管理', '用户账户的创建、编辑、删除等操作权限', 1),
('timesheet_management', '工时管理', '工时记录的查看、审批、统计等权限', 2),
('project_management', '项目管理', '项目创建、分配、进度跟踪等权限', 3),
('department_management', '部门管理', '部门结构、人员分配等管理权限', 4),
('report_management', '报表管理', '各类报表的生成、导出、查看权限', 5),
('system_management', '系统管理', '系统配置、权限管理等高级权限', 6);

-- 确保anon和authenticated角色有查看权限
GRANT SELECT ON permission_categories TO anon;
GRANT SELECT ON permission_categories TO authenticated;