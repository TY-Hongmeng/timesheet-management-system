-- 权限管理系统初始化
-- 创建Dashboard模块权限分类

-- 插入权限分类数据
INSERT INTO permission_categories (category, display_name, description, sort_order) VALUES
('time_record', '记录工时', 'Dashboard中的记录工时模块', 1),
('reports', '查看报表', 'Dashboard中的查看报表模块', 2),
('process_management', '工序管理', 'Dashboard中的工序管理模块', 3),
('user_management', '用户管理', 'Dashboard中的用户管理模块', 4),
('company_management', '公司管理', 'Dashboard中的公司管理模块', 5),
('supervisor_review', '班长审核', 'Dashboard中的班长审核模块', 6),
('manager_review', '段长审核', 'Dashboard中的段长审核模块', 7),
('permission_management', '权限管理', 'Dashboard中的权限管理模块', 8)
ON CONFLICT (category) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

-- 更新角色权限配置
-- 超级管理员：拥有所有权限
UPDATE user_roles 
SET permissions = '[
  "time_record",
  "reports", 
  "process_management",
  "user_management",
  "company_management",
  "supervisor_review",
  "manager_review",
  "permission_management"
]'::jsonb
WHERE name = '超级管理员';

-- 生产经理：管理相关权限
UPDATE user_roles 
SET permissions = '[
  "time_record",
  "reports",
  "process_management",
  "user_management",
  "company_management",
  "manager_review"
]'::jsonb
WHERE name = '生产经理';

-- 段长：审核和管理权限
UPDATE user_roles 
SET permissions = '[
  "time_record",
  "reports",
  "process_management",
  "manager_review"
]'::jsonb
WHERE name = '段长';

-- 班长：基础操作权限
UPDATE user_roles 
SET permissions = '[
  "time_record",
  "reports",
  "supervisor_review"
]'::jsonb
WHERE name = '班长';

-- 删除现有函数并重新创建
DROP FUNCTION IF EXISTS check_user_permission(UUID, TEXT);
DROP FUNCTION IF EXISTS get_user_permissions(UUID);

-- 创建权限检查函数
CREATE FUNCTION check_user_permission(user_id UUID, permission_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_permissions JSONB;
    user_role_name TEXT;
BEGIN
    -- 获取用户角色和权限
    SELECT ur.permissions, ur.name
    INTO user_permissions, user_role_name
    FROM users u
    JOIN user_roles ur ON u.role_id = ur.id
    WHERE u.id = user_id AND u.is_active = true;
    
    -- 如果用户不存在或未激活，返回false
    IF user_permissions IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- 超级管理员拥有所有权限
    IF user_role_name = '超级管理员' THEN
        RETURN TRUE;
    END IF;
    
    -- 检查用户是否拥有指定权限
    RETURN user_permissions ? permission_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建获取用户权限的函数
CREATE FUNCTION get_user_permissions(user_id UUID)
RETURNS JSONB AS $$
DECLARE
    user_permissions JSONB;
    user_role_name TEXT;
BEGIN
    -- 获取用户角色和权限
    SELECT ur.permissions, ur.name
    INTO user_permissions, user_role_name
    FROM users u
    JOIN user_roles ur ON u.role_id = ur.id
    WHERE u.id = user_id AND u.is_active = true;
    
    -- 如果用户不存在或未激活，返回空数组
    IF user_permissions IS NULL THEN
        RETURN '[]'::jsonb;
    END IF;
    
    -- 超级管理员拥有所有权限
    IF user_role_name = '超级管理员' THEN
        RETURN '[
            "time_record",
            "reports", 
            "process_management",
            "user_management",
            "company_management",
            "supervisor_review",
            "manager_review",
            "permission_management"
        ]'::jsonb;
    END IF;
    
    RETURN user_permissions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_permission_categories_sort ON permission_categories(sort_order);