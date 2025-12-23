-- 创建获取回收站统计数据的函数
CREATE OR REPLACE FUNCTION get_recycle_bin_stats(user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  user_company_id UUID;
  user_role_name VARCHAR;
BEGIN
  -- 获取用户信息
  SELECT 
    u.company_id,
    ur.name
  INTO 
    user_company_id,
    user_role_name
  FROM users u
  LEFT JOIN user_roles ur ON u.role_id = ur.id
  WHERE u.id = user_id AND u.deleted_at IS NULL;

  -- 构建统计查询
  WITH stats AS (
    SELECT 
      COUNT(*) as total_items,
      COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_items,
      COUNT(*) FILTER (WHERE item_type = 'timesheet_record') as timesheet_records,
      COUNT(*) FILTER (WHERE item_type = 'timesheet_record_item') as timesheet_record_items,
      COUNT(*) FILTER (WHERE item_type = 'process') as processes
    FROM recycle_bin rb
    WHERE rb.is_permanently_deleted = FALSE
      AND (
        -- 普通用户：只能看到自己的删除记录或自己公司的记录
        (user_role_name NOT IN ('管理员', '超级管理员', 'admin', 'super_admin') AND 
         (rb.deleted_by = user_id OR rb.user_id = user_id OR rb.company_id = user_company_id))
        OR
        -- 管理员：可以看到整个公司的记录
        (user_role_name IN ('管理员', 'admin') AND rb.company_id = user_company_id)
        OR
        -- 超级管理员：可以看到所有记录
        (user_role_name IN ('超级管理员', 'super_admin'))
      )
  )
  SELECT json_build_object(
    'totalItems', COALESCE(total_items, 0),
    'expiredItems', COALESCE(expired_items, 0),
    'timesheetRecords', COALESCE(timesheet_records, 0),
    'timesheetRecordItems', COALESCE(timesheet_record_items, 0),
    'processes', COALESCE(processes, 0)
  ) INTO result
  FROM stats;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授权函数访问
GRANT EXECUTE ON FUNCTION get_recycle_bin_stats(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_recycle_bin_stats(UUID) TO authenticated;