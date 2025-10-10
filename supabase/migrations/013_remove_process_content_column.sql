-- 删除工序内容列
ALTER TABLE processes DROP COLUMN IF EXISTS process_content;

-- 删除相关索引（如果存在）
DROP INDEX IF EXISTS idx_processes_process_content;

-- 注释：已从工序管理表中移除process_content列
-- 此迁移将永久删除该列及其所有数据