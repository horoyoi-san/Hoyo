-- 添加用户存储策略分配表
CREATE TABLE IF NOT EXISTS "user_storage_assignments" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "strategy_id" TEXT NOT NULL REFERENCES "storage_strategies"("id") ON DELETE CASCADE,
  "user_folder" TEXT NOT NULL,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL
);

-- 添加角色默认存储策略表
CREATE TABLE IF NOT EXISTS "role_storage_defaults" (
  "id" TEXT PRIMARY KEY,
  "role" TEXT NOT NULL UNIQUE,
  "strategy_id" TEXT NOT NULL REFERENCES "storage_strategies"("id") ON DELETE CASCADE,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS "idx_user_storage_assignments_user_id" ON "user_storage_assignments"("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_storage_assignments_strategy_id" ON "user_storage_assignments"("strategy_id");
CREATE INDEX IF NOT EXISTS "idx_role_storage_defaults_role" ON "role_storage_defaults"("role");