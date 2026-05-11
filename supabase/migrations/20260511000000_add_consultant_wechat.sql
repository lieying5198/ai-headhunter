-- 为 consultants 表添加 wechat 字段
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS wechat TEXT UNIQUE;

-- 添加注释
COMMENT ON COLUMN consultants.wechat IS '顾问微信号，用于Excel导入时匹配顾问';
