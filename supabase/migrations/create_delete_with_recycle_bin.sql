-- Functions to safely delete items/records/processes with recycle_bin backup
-- Uses SECURITY DEFINER and validates permissions based on role and ownership

CREATE OR REPLACE FUNCTION public.can_delete_timesheet(uid UUID, record_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  rec RECORD;
  is_admin BOOLEAN := FALSE;
BEGIN
  SELECT r.user_id, r.supervisor_id, r.section_chief_id INTO rec
  FROM timesheet_records r WHERE r.id = record_id;

  IF rec IS NULL THEN
    RETURN FALSE;
  END IF;

  -- admin/超级管理员角色判定
  SELECT EXISTS (
    SELECT 1 FROM users u
    JOIN user_roles ur ON ur.id = u.role_id
    WHERE u.id = uid AND ur.name IN ('管理员','超级管理员','admin','super_admin')
  ) INTO is_admin;

  RETURN is_admin OR uid = rec.user_id OR uid = rec.supervisor_id OR uid = rec.section_chief_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_timesheet_item_with_recycle_bin(item_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  uid UUID := auth.uid();
  rec RECORD;
  ok BOOLEAN := FALSE;
  company UUID;
BEGIN
  SELECT i.*, i.timesheet_record_id AS record_id INTO rec
  FROM timesheet_record_items i WHERE i.id = item_id;

  IF rec IS NULL THEN RETURN FALSE; END IF;

  IF NOT public.can_delete_timesheet(uid, rec.record_id) THEN
    RETURN FALSE;
  END IF;

  SELECT u.company_id INTO company FROM users u WHERE u.id = uid;

  INSERT INTO recycle_bin (item_type, item_id, item_data, deleted_by, original_table, company_id, user_id)
  VALUES ('timesheet_record_item', item_id, to_jsonb(rec), uid, 'timesheet_record_items', company, NULL);

  DELETE FROM timesheet_record_items WHERE id = item_id;

  -- 如果没有剩余明细，删除主记录到回收站
  IF NOT EXISTS (SELECT 1 FROM timesheet_record_items WHERE timesheet_record_id = rec.record_id) THEN
    PERFORM public.delete_timesheet_record_with_recycle_bin(rec.record_id);
  END IF;

  ok := TRUE;
  RETURN ok;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_timesheet_record_with_recycle_bin(record_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  uid UUID := auth.uid();
  r RECORD;
  company UUID;
BEGIN
  SELECT * INTO r FROM timesheet_records WHERE id = record_id;
  IF r IS NULL THEN RETURN FALSE; END IF;

  IF NOT public.can_delete_timesheet(uid, record_id) THEN
    RETURN FALSE;
  END IF;

  SELECT u.company_id INTO company FROM users u WHERE u.id = uid;

  INSERT INTO recycle_bin (item_type, item_id, item_data, deleted_by, original_table, company_id, user_id)
  VALUES ('timesheet_record', record_id, to_jsonb(r), uid, 'timesheet_records', company, r.user_id);

  DELETE FROM timesheet_records WHERE id = record_id; -- CASCADE 明细与历史
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_process_with_recycle_bin(process_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  uid UUID := auth.uid();
  p RECORD;
  is_admin BOOLEAN := FALSE;
  company UUID;
BEGIN
  SELECT * INTO p FROM processes WHERE id = process_id;
  IF p IS NULL THEN RETURN FALSE; END IF;

  -- 允许管理员或同公司用户删除（软删除）
  SELECT EXISTS (
    SELECT 1 FROM users u JOIN user_roles ur ON ur.id = u.role_id
    WHERE u.id = uid AND ur.name IN ('管理员','超级管理员','admin','super_admin')
  ) INTO is_admin;

  SELECT u.company_id INTO company FROM users u WHERE u.id = uid;

  IF NOT (is_admin OR company = p.company_id) THEN
    RETURN FALSE;
  END IF;

  INSERT INTO recycle_bin (item_type, item_id, item_data, deleted_by, original_table, company_id)
  VALUES ('process', process_id, to_jsonb(p), uid, 'processes', p.company_id);

  UPDATE processes SET is_active = FALSE WHERE id = process_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.delete_timesheet_item_with_recycle_bin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_timesheet_record_with_recycle_bin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_process_with_recycle_bin(UUID) TO authenticated;
