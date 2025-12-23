-- v2 functions accept explicit actor_id to avoid auth.uid() being null in some contexts

CREATE OR REPLACE FUNCTION public.delete_timesheet_item_with_recycle_bin_v2(item_id UUID, actor_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  rec RECORD;
  ok BOOLEAN := FALSE;
  company UUID;
  is_admin BOOLEAN := FALSE;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'actor_id cannot be null';
  END IF;

  SELECT i.*, i.timesheet_record_id AS record_id INTO rec
  FROM timesheet_record_items i WHERE i.id = item_id;

  IF rec IS NULL THEN RETURN FALSE; END IF;

  SELECT EXISTS (
    SELECT 1 FROM users u
    JOIN user_roles ur ON ur.id = u.role_id
    WHERE u.id = actor_id AND ur.name IN ('管理员','超级管理员','admin','super_admin')
  ) INTO is_admin;

  -- 权限：记录所有者/班长/段长/管理员
  PERFORM 1 FROM timesheet_records r
    WHERE r.id = rec.record_id AND (
      actor_id = r.user_id OR actor_id = r.supervisor_id OR actor_id = r.section_chief_id OR is_admin
    );
  IF NOT FOUND THEN RETURN FALSE; END IF;

  SELECT u.company_id INTO company FROM users u WHERE u.id = actor_id;

  INSERT INTO recycle_bin (item_type, item_id, item_data, deleted_by, original_table, company_id, user_id)
  VALUES ('timesheet_record_item', item_id, to_jsonb(rec), actor_id, 'timesheet_record_items', company, NULL);

  DELETE FROM timesheet_record_items WHERE id = item_id;

  -- 如果没有剩余明细，删除主记录到回收站
  IF NOT EXISTS (SELECT 1 FROM timesheet_record_items WHERE timesheet_record_id = rec.record_id) THEN
    PERFORM public.delete_timesheet_record_with_recycle_bin_v2(rec.record_id, actor_id);
  END IF;

  ok := TRUE;
  RETURN ok;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_timesheet_record_with_recycle_bin_v2(record_id UUID, actor_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  r RECORD;
  company UUID;
  is_admin BOOLEAN := FALSE;
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

  INSERT INTO recycle_bin (item_type, item_id, item_data, deleted_by, original_table, company_id, user_id)
  VALUES ('timesheet_record', record_id, to_jsonb(r), actor_id, 'timesheet_records', company, r.user_id);

  DELETE FROM timesheet_records WHERE id = record_id; -- CASCADE 明细与历史
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_process_with_recycle_bin_v2(process_id UUID, actor_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  p RECORD;
  is_admin BOOLEAN := FALSE;
  company UUID;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'actor_id cannot be null';
  END IF;

  SELECT * INTO p FROM processes WHERE id = process_id;
  IF p IS NULL THEN RETURN FALSE; END IF;

  SELECT u.company_id INTO company FROM users u WHERE u.id = actor_id;

  SELECT EXISTS (
    SELECT 1 FROM users u JOIN user_roles ur ON ur.id = u.role_id
    WHERE u.id = actor_id AND ur.name IN ('管理员','超级管理员','admin','super_admin')
  ) INTO is_admin;

  IF NOT (is_admin OR company = p.company_id) THEN
    RETURN FALSE;
  END IF;

  INSERT INTO recycle_bin (item_type, item_id, item_data, deleted_by, original_table, company_id)
  VALUES ('process', process_id, to_jsonb(p), actor_id, 'processes', p.company_id);

  UPDATE processes SET is_active = FALSE WHERE id = process_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.delete_timesheet_item_with_recycle_bin_v2(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_timesheet_record_with_recycle_bin_v2(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_process_with_recycle_bin_v2(UUID, UUID) TO authenticated;
