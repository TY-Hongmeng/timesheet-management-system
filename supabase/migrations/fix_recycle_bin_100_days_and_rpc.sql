-- 调整回收站保留期为100天，并增强删除RPC以写入明细

-- 1) 将回收站过期时间默认值改为100天
ALTER TABLE public.recycle_bin
  ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '100 days');

-- 同时将现有未永久删除的记录统一到100天（仅当当前默认少于100天时适用）
UPDATE public.recycle_bin
SET expires_at = deleted_at + INTERVAL '100 days'
WHERE is_permanently_deleted = FALSE;

-- 2) 增强 delete_timesheet_record_with_recycle_bin_v2：写入明细及工序信息，并显式设置100天过期
CREATE OR REPLACE FUNCTION public.delete_timesheet_record_with_recycle_bin_v2(record_id UUID, actor_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  r RECORD;
  company UUID;
  is_admin BOOLEAN := FALSE;
  items_json JSONB := '[]'::JSONB;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'actor_id cannot be null';
  END IF;

  SELECT * INTO r FROM timesheet_records WHERE id = record_id;
  IF r IS NULL THEN RETURN FALSE; END IF;

  SELECT EXISTS (
    SELECT 1 FROM users u JOIN user_roles ur ON ur.id = u.role_id
    WHERE u.id = actor_id AND ur.name IN ('管理员','超级管理员','admin','super_admin')
  ) INTO is_admin;

  -- 权限：记录所有者/班长/段长/管理员
  IF NOT (is_admin OR actor_id = r.user_id OR actor_id = r.supervisor_id OR actor_id = r.section_chief_id) THEN
    RETURN FALSE;
  END IF;

  SELECT u.company_id INTO company FROM users u WHERE u.id = actor_id;

  -- 聚合明细并附带工序信息
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO items_json
  FROM (
    SELECT 
      i.id,
      i.work_type_id,
      i.product_id,
      i.process_id,
      i.quantity,
      i.unit,
      i.unit_price,
      i.total_amount,
      i.created_at,
      i.updated_at,
      jsonb_build_object(
        'product_process', p.product_process,
        'product_name', p.product_name,
        'production_category', p.production_category,
        'production_line', p.production_line,
        'unit_price', p.unit_price
      ) AS processes
    FROM timesheet_record_items i
    LEFT JOIN processes p ON p.id = i.process_id
    WHERE i.timesheet_record_id = record_id
  ) t;

  INSERT INTO recycle_bin (
    item_type, item_id, item_data, deleted_by, original_table, company_id, user_id, expires_at
  ) VALUES (
    'timesheet_record', record_id,
    to_jsonb(r) || jsonb_build_object('items', items_json),
    actor_id, 'timesheet_records', company, r.user_id,
    NOW() + INTERVAL '100 days'
  );

  DELETE FROM timesheet_records WHERE id = record_id; -- CASCADE 明细与历史
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

