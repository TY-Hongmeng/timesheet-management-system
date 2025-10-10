-- 为users表添加production_line字段
ALTER TABLE users ADD COLUMN production_line VARCHAR(255);

-- 添加索引以提高查询性能
CREATE INDEX idx_users_production_line ON users(production_line);

-- 添加注释
COMMENT ON COLUMN users.production_line IS '生产线名称，仅班长和段长角色需要填写';