-- 扩展 delete_timesheet_item_with_recycle_bin_v2，补充 id、process_id、status 字段

CREATE OR REPLACE FUNCTION public.delete_timesheet_item_with_recycle_bin_v2(item_id UUID, actor_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  rec RECORD;
  r RECORD;
  p RECORD;
  user_name TEXT;
  supervisor_name TEXT;
  section_chief_name TEXT;
  company UUID;
  is_admin BOOLEAN := FALSE;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'actor_id cannot be null';
  END IF;

  SELECT * INTO rec FROM timesheet_record_items WHERE id = item_id;
  IF rec IS NULL THEN RETURN FALSE; END IF;

  SELECT * INTO r FROM timesheet_records WHERE id = rec.timesheet_record_id;
  IF r IS NULL THEN RETURN FALSE; END IF;

  SELECT EXISTS (
    SELECT 1 FROM users u
    JOIN user_roles ur ON ur.id = u.role_id
    WHERE u.id = actor_id AND ur.name IN ('管理员','超级管理员','admin','super_admin')
  ) INTO is_admin;
  IF NOT (is_admin OR actor_id = r.user_id OR actor_id = r.supervisor_id OR actor_id = r.section_chief_id) THEN
    RETURN FALSE;
  END IF;

  SELECT u.company_id INTO company FROM users u WHERE u.id = actor_id;

  SELECT * INTO p FROM processes WHERE id = rec.process_id;
  SELECT name INTO user_name FROM users WHERE id = r.user_id;
  SELECT name INTO supervisor_name FROM users WHERE id = r.supervisor_id;
  SELECT name INTO section_chief_name FROM users WHERE id = r.section_chief_id;

  INSERT INTO recycle_bin (
    item_type, item_id, item_data, deleted_by, original_table, company_id, user_id, expires_at
  ) VALUES (
    'timesheet_record_item', rec.id,
    jsonb_build_object(
      'id', rec.id,
      'timesheet_record_id', rec.timesheet_record_id,
      'work_date', r.work_date,
      'record_date', r.work_date,
      'shift_type', r.shift_type,
      'status', r.status,
      'user_id', r.user_id,
      'user_name', COALESCE(user_name, NULL),
      'supervisor_id', r.supervisor_id,
      'supervisor_name', COALESCE(supervisor_name, NULL),
      'section_chief_id', r.section_chief_id,
      'section_chief_name', COALESCE(section_chief_name, NULL),
      'process_id', rec.process_id,
      'quantity', rec.quantity,
      'unit_price', rec.unit_price,
      'amount', rec.amount,
      'product_name', COALESCE(p.product_name, NULL),
      'product_process', COALESCE(p.product_process, NULL),
      'production_category', COALESCE(p.production_category, NULL),
      'production_line', COALESCE(p.production_line, NULL),
      'processes', to_jsonb(p)
    ),
    actor_id, 'timesheet_record_items', company, r.user_id,
    NOW() + INTERVAL '100 days'
  );

  DELETE FROM timesheet_record_items WHERE id = item_id;

  IF NOT EXISTS (SELECT 1 FROM timesheet_record_items WHERE timesheet_record_id = rec.timesheet_record_id) THEN
    DELETE FROM timesheet_records WHERE id = rec.timesheet_record_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

