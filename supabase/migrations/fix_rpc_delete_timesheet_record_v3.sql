-- 修复 delete_timesheet_record_with_recycle_bin_v2 引用不存在的列（work_type_id、product_id、unit）
-- 与当前表结构对齐：timesheet_record_items 仅包含 id, timesheet_record_id, process_id, quantity, unit_price, amount, created_at, updated_at

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

  -- 聚合明细并附带工序信息（对齐现有列）
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO items_json
  FROM (
    SELECT 
      i.id,
      i.timesheet_record_id,
      i.process_id,
      i.quantity,
      i.unit_price,
      i.amount,
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

