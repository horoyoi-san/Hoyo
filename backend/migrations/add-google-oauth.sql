-- 创建谷歌OAuth配置表
CREATE TABLE IF NOT EXISTS google_oauth_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  enabled INTEGER NOT NULL DEFAULT 0,
  client_id TEXT,
  client_secret TEXT,
  redirect_uri TEXT,
  updated_at INTEGER NOT NULL
);

-- 插入默认配置
INSERT OR IGNORE INTO google_oauth_config (id, enabled, updated_at) 
VALUES (1, 0, strftime('%s', 'now') * 1000);