-- 创建INSERT触发器来自动填充工时记录的姓名字段
-- 当插入新的工时记录时，自动从users表获取相关用户的姓名并填充到冗余字段中

-- 创建触发器函数
CREATE OR REPLACE FUNCTION fill_user_names_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- 填充用户姓名
  IF NEW.user_id IS NOT NULL AND (NEW.user_name IS NULL OR NEW.user_name = '') THEN
    SELECT name INTO NEW.user_name
    FROM users
    WHERE id = NEW.user_id;
  END IF;
  
  -- 填充主管姓名
  IF NEW.supervisor_id IS NOT NULL AND (NEW.supervisor_name IS NULL OR NEW.supervisor_name = '') THEN
    SELECT name INTO NEW.supervisor_name
    FROM users
    WHERE id = NEW.supervisor_id;
  END IF;
  
  -- 填充科长姓名
  IF NEW.section_chief_id IS NOT NULL AND (NEW.section_chief_name IS NULL OR NEW.section_chief_name = '') THEN
    SELECT name INTO NEW.section_chief_name
    FROM users
    WHERE id = NEW.section_chief_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建INSERT触发器
DROP TRIGGER IF EXISTS trigger_fill_user_names_on_insert ON timesheet_records;
CREATE TRIGGER trigger_fill_user_names_on_insert
  BEFORE INSERT ON timesheet_records
  FOR EACH ROW
  EXECUTE FUNCTION fill_user_names_on_insert();

-- 创建UPDATE触发器（当user_id等字段更新时也要更新姓名）
DROP TRIGGER IF EXISTS trigger_fill_user_names_on_update ON timesheet_records;
CREATE TRIGGER trigger_fill_user_names_on_update
  BEFORE UPDATE ON timesheet_records
  FOR EACH ROW
  WHEN (OLD.user_id IS DISTINCT FROM NEW.user_id OR 
        OLD.supervisor_id IS DISTINCT FROM NEW.supervisor_id OR 
        OLD.section_chief_id IS DISTINCT FROM NEW.section_chief_id)
  EXECUTE FUNCTION fill_user_names_on_insert();

-- 为approval_history表创建类似的触发器函数
CREATE OR REPLACE FUNCTION fill_approval_user_names_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- 填充审批者姓名
  IF NEW.approver_id IS NOT NULL AND (NEW.approver_name IS NULL OR NEW.approver_name = '') THEN
    SELECT name INTO NEW.approver_name
    FROM users
    WHERE id = NEW.approver_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为approval_history表创建INSERT触发器
DROP TRIGGER IF EXISTS trigger_fill_approval_user_names_on_insert ON approval_history;
CREATE TRIGGER trigger_fill_approval_user_names_on_insert
  BEFORE INSERT ON approval_history
  FOR EACH ROW
  EXECUTE FUNCTION fill_approval_user_names_on_insert();

-- 为approval_history表创建UPDATE触发器
DROP TRIGGER IF EXISTS trigger_fill_approval_user_names_on_update ON approval_history;
CREATE TRIGGER trigger_fill_approval_user_names_on_update
  BEFORE UPDATE ON approval_history
  FOR EACH ROW
  WHEN (OLD.approver_id IS DISTINCT FROM NEW.approver_id)
  EXECUTE FUNCTION fill_approval_user_names_on_insert();