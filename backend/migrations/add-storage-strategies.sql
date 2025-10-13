-- 创建存储策略表
CREATE TABLE IF NOT EXISTS storage_strategies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  config TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 插入默认本地存储策略
INSERT OR IGNORE INTO storage_strategies (
  id, 
  name, 
  type, 
  config, 
  is_active, 
  created_at, 
  updated_at
) VALUES (
  'default-local',
  '默认本地存储',
  'local',
  '{}',
  1,
  strftime('%s', 'now') * 1000,
  strftime('%s', 'now') * 1000
);