-- 回收站功能数据库表结构
-- 用于存储被删除的工时记录和工序，支持恢复功能

-- 1. 创建回收站主表
CREATE TABLE recycle_bin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('timesheet_record', 'timesheet_record_item', 'process')),
  item_id UUID NOT NULL,
  item_data JSONB NOT NULL,
  deleted_by UUID NOT NULL REFERENCES users(id),
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  original_table VARCHAR(100) NOT NULL,
  company_id UUID REFERENCES companies(id),
  user_id UUID REFERENCES users(id), -- 记录原始拥有者
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  is_permanently_deleted BOOLEAN DEFAULT FALSE,
  restored_at TIMESTAMPTZ,
  restored_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 创建索引
CREATE INDEX idx_recycle_bin_item_type ON recycle_bin(item_type);
CREATE INDEX idx_recycle_bin_deleted_at ON recycle_bin(deleted_at);
CREATE INDEX idx_recycle_bin_expires_at ON recycle_bin(expires_at);
CREATE INDEX idx_recycle_bin_company_id ON recycle_bin(company_id);
CREATE INDEX idx_recycle_bin_user_id ON recycle_bin(user_id);
CREATE INDEX idx_recycle_bin_deleted_by ON recycle_bin(deleted_by);
CREATE INDEX idx_recycle_bin_item_id ON recycle_bin(item_id);
CREATE INDEX idx_recycle_bin_is_permanently_deleted ON recycle_bin(is_permanently_deleted);

-- 3. 创建更新时间戳触发器
CREATE OR REPLACE FUNCTION update_recycle_bin_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_recycle_bin_updated_at
  BEFORE UPDATE ON recycle_bin
  FOR EACH ROW
  EXECUTE FUNCTION update_recycle_bin_updated_at();

-- 4. 启用行级安全
ALTER TABLE recycle_bin ENABLE ROW LEVEL SECURITY;

-- 5. 创建RLS策略

-- 查看策略：用户只能查看自己公司的回收站项目
CREATE POLICY "Users can view recycle bin items in their company" ON recycle_bin
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND deleted_at IS NULL
    ) OR
    user_id = auth.uid() OR
    deleted_by = auth.uid()
  );

-- 恢复策略：普通员工只能恢复自己删除的项目，管理员可以恢复所有项目
CREATE POLICY "Users can restore their own deleted items" ON recycle_bin
  FOR UPDATE
  USING (
    deleted_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND company_id = recycle_bin.company_id 
      AND role_id IN (
        SELECT id FROM user_roles 
        WHERE name IN ('管理员', '超级管理员', 'admin', 'super_admin')
      )
      AND deleted_at IS NULL
    )
  )
  WITH CHECK (
    deleted_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND company_id = recycle_bin.company_id 
      AND role_id IN (
        SELECT id FROM user_roles 
        WHERE name IN ('管理员', '超级管理员', 'admin', 'super_admin')
      )
      AND deleted_at IS NULL
    )
  );

-- 永久删除策略：只有管理员可以永久删除
CREATE POLICY "Only admins can permanently delete items" ON recycle_bin
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND company_id = recycle_bin.company_id 
      AND role_id IN (
        SELECT id FROM user_roles 
        WHERE name IN ('管理员', '超级管理员', 'admin', 'super_admin')
      )
      AND deleted_at IS NULL
    )
  );

-- 6. 创建自动清理过期项目的函数
CREATE OR REPLACE FUNCTION cleanup_expired_recycle_bin_items()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- 永久删除过期的回收站项目
  DELETE FROM recycle_bin 
  WHERE expires_at < NOW() 
  AND is_permanently_deleted = FALSE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建定时清理任务（需要pg_cron扩展）
-- 每天凌晨2点执行清理任务
-- 注意：需要在数据库中启用pg_cron扩展
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('cleanup-recycle-bin', '0 2 * * *', 'SELECT cleanup_expired_recycle_bin_items();');

-- 8. 添加表注释
COMMENT ON TABLE recycle_bin IS '回收站表，存储被删除的工时记录和工序，支持恢复功能';
COMMENT ON COLUMN recycle_bin.id IS '回收站项目唯一ID';
COMMENT ON COLUMN recycle_bin.item_type IS '项目类型：timesheet_record, timesheet_record_item, process';
COMMENT ON COLUMN recycle_bin.item_id IS '原始项目ID';
COMMENT ON COLUMN recycle_bin.item_data IS '被删除项目的完整数据（JSON格式）';
COMMENT ON COLUMN recycle_bin.deleted_by IS '执行删除操作的用户ID';
COMMENT ON COLUMN recycle_bin.deleted_at IS '删除时间';
COMMENT ON COLUMN recycle_bin.original_table IS '原始数据表名';
COMMENT ON COLUMN recycle_bin.company_id IS '公司ID';
COMMENT ON COLUMN recycle_bin.user_id IS '原始项目拥有者用户ID';
COMMENT ON COLUMN recycle_bin.expires_at IS '过期时间，默认30天后';
COMMENT ON COLUMN recycle_bin.is_permanently_deleted IS '是否已永久删除';
COMMENT ON COLUMN recycle_bin.restored_at IS '恢复时间';
COMMENT ON COLUMN recycle_bin.restored_by IS '执行恢复操作的用户ID';

-- 9. 授权访问
GRANT SELECT ON recycle_bin TO anon;
GRANT SELECT, UPDATE ON recycle_bin TO authenticated;
GRANT DELETE ON recycle_bin TO authenticated;