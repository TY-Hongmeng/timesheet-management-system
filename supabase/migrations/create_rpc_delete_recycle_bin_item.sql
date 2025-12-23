-- 创建安全删除回收站条目的 RPC，绕过RLS，保证恢复后能清理
CREATE OR REPLACE FUNCTION public.delete_recycle_bin_item(rid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM recycle_bin WHERE id = rid;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

