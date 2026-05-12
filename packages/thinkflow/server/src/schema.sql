-- ThinkFlow 数据库 Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT UNIQUE NOT NULL,
  password_hash    TEXT NOT NULL,
  display_name     TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  plan             TEXT NOT NULL DEFAULT 'free',         -- 'free' | 'subscriber'
  -- 永久积分（购买的积分包，不过期）
  credits_permanent INT NOT NULL DEFAULT 0,
  -- 每日赠送积分（当天清零，免费用户每日 20，订阅用户每日 0）
  credits_daily    INT NOT NULL DEFAULT 30,  -- 内测每日赠送30积分，当天清零
  credits_daily_reset_at DATE NOT NULL DEFAULT CURRENT_DATE
);

-- 为已存在的 users 表补充 display_name 字段（幂等）
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN display_name TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 积分流水（审计用）
CREATE TABLE IF NOT EXISTS credit_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta       INT NOT NULL,          -- 正数=充入，负数=消耗
  reason      TEXT NOT NULL,         -- 'daily_reset' | 'run_text' | 'run_image' | 'purchase' | 'refund'
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS canvases (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT '未命名画布',
  nodes_json  JSONB NOT NULL DEFAULT '[]',
  edges_json  JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  canvas_id  UUID REFERENCES canvases(id) ON DELETE SET NULL,
  url        TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'image',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 更新画布时自动刷新 updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER canvases_updated_at
  BEFORE UPDATE ON canvases
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
