-- Insert sample companies if they don't exist
INSERT INTO companies (name) 
VALUES 
  ('科技创新有限公司'),
  ('数字化解决方案公司'),
  ('智能制造集团')
ON CONFLICT (name) DO NOTHING;

-- Insert sample user roles if they don't exist
INSERT INTO user_roles (name, description, permissions) 
VALUES 
  ('普通员工', '基础员工角色，可以记录工时和查看个人数据', '["timesheet:create", "timesheet:read", "profile:read"]'),
  ('项目经理', '项目管理角色，可以管理项目和查看团队工时', '["timesheet:create", "timesheet:read", "project:manage", "team:read"]'),
  ('部门主管', '部门管理角色，可以管理部门员工和审批工时', '["timesheet:create", "timesheet:read", "timesheet:approve", "department:manage", "user:read"]'),
  ('人事专员', '人事管理角色，可以管理员工信息和生成报表', '["user:manage", "timesheet:read", "report:generate", "department:read"]')
ON CONFLICT (name) DO NOTHING;