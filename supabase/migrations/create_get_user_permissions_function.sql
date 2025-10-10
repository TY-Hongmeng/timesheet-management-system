-- 创建获取用户权限的函数
CREATE OR REPLACE FUNCTION get_user_permissions(user_id_param UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_permissions TEXT[];
    user_role_name TEXT;
BEGIN
    -- 获取用户角色名称
    SELECT ur.name INTO user_role_name
    FROM users u
    JOIN user_roles ur ON u.role_id = ur.id
    WHERE u.id = user_id_param;
    
    -- 如果找不到用户或角色，返回空数组
    IF user_role_name IS NULL THEN
        RETURN ARRAY[]::TEXT[];
    END IF;
    
    -- 如果是超级管理员，返回所有权限
    IF user_role_name = '超级管理员' THEN
        RETURN ARRAY[
            'user:read', 'user:manage', 'user:create', 'user:delete',
            'company:read', 'company:manage', 'company:create', 'company:delete',
            'process:read', 'process:manage', 'process:create', 'process:delete',
            'role:manage', 'system:config',
            'time_record', 'reports', 'process_management', 'user_management',
            'company_management', 'supervisor_review', 'manager_review', 'permission_management'
        ];
    END IF;
    
    -- 获取角色的权限列表
    SELECT 
        CASE 
            WHEN ur.permissions IS NULL THEN ARRAY[]::TEXT[]
            WHEN jsonb_typeof(ur.permissions) = 'array' THEN 
                ARRAY(SELECT jsonb_array_elements_text(ur.permissions))
            ELSE ARRAY[]::TEXT[]
        END
    INTO user_permissions
    FROM users u
    JOIN user_roles ur ON u.role_id = ur.id
    WHERE u.id = user_id_param;
    
    -- 返回权限列表，如果为空则返回空数组
    RETURN COALESCE(user_permissions, ARRAY[]::TEXT[]);
END;
$$;

-- 创建检查用户权限的函数
CREATE OR REPLACE FUNCTION check_user_permission(user_id_param UUID, permission_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_permissions TEXT[];
BEGIN
    -- 获取用户权限列表
    SELECT get_user_permissions(user_id_param) INTO user_permissions;
    
    -- 检查权限是否存在
    RETURN permission_name = ANY(user_permissions);
END;
$$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION get_user_permissions(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_user_permission(UUID, TEXT) TO anon, authenticated;