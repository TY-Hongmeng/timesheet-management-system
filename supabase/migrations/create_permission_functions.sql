-- 删除现有函数（如果存在）
DROP FUNCTION IF EXISTS public.check_user_permission(UUID, TEXT);
DROP FUNCTION IF EXISTS public.get_user_permissions(UUID);

-- 创建权限检查函数
CREATE OR REPLACE FUNCTION public.check_user_permission(
  user_id_param UUID,
  permission_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 检查用户是否存在且激活
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = user_id_param AND is_active = true
  ) THEN
    RETURN false;
  END IF;

  -- 检查用户是否有指定权限
  RETURN EXISTS (
    SELECT 1 
    FROM public.users u
    JOIN public.user_roles ur ON u.role_id = ur.id
    WHERE u.id = user_id_param 
      AND u.is_active = true
      AND ur.permissions @> ARRAY[permission_name]::text[]
  );
END;
$$;

-- 创建获取用户权限列表函数
CREATE OR REPLACE FUNCTION public.get_user_permissions(
  user_id_param UUID
)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_permissions TEXT[];
BEGIN
  -- 检查用户是否存在且激活
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = user_id_param AND is_active = true
  ) THEN
    RETURN ARRAY[]::TEXT[];
  END IF;

  -- 获取用户权限列表
  SELECT COALESCE(ur.permissions, ARRAY[]::TEXT[])
  INTO user_permissions
  FROM public.users u
  JOIN public.user_roles ur ON u.role_id = ur.id
  WHERE u.id = user_id_param AND u.is_active = true;

  RETURN COALESCE(user_permissions, ARRAY[]::TEXT[]);
END;
$$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION public.check_user_permission(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_permissions(UUID) TO anon, authenticated;