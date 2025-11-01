-- Simplified Schema for World-News Painting
-- Removes art-style fields, simplifies to daily + breaking images

create extension if not exists pgcrypto;

-- One row per generated image (daily at 6am OR breaking news during day)
create table if not exists daily_paintings (
  id uuid primary key default gen_random_uuid(),
  date date not null,  -- removed UNIQUE constraint to allow multiple per day
  image_url text not null,
  prompt jsonb not null,
  world_theme_summary text not null,
  model_info jsonb not null,
  sources jsonb not null,
  is_daily boolean not null default false,  -- true for 6am generation, false for breaking
  created_at timestamptz default now()
);

-- Indexes for efficient queries
create index if not exists idx_daily_paintings_date on daily_paintings(date desc, created_at desc);
create index if not exists idx_daily_paintings_created on daily_paintings(created_at desc);
create index if not exists idx_daily_paintings_daily on daily_paintings(date desc, is_daily desc);

-- Optional: Drop the old painting_updates table if you want to clean up
-- drop table if exists painting_updates;

-- Migration notes:
-- If you have existing data, you may want to:
-- 1. ALTER TABLE daily_paintings DROP CONSTRAINT daily_paintings_date_key;
-- 2. ALTER TABLE daily_paintings ADD COLUMN is_daily boolean default true;
-- 3. ALTER TABLE daily_paintings DROP COLUMN style_descriptor;
-- 4. ALTER TABLE daily_paintings DROP COLUMN art_style_summary;
-- 5. RENAME COLUMN base_image_url TO image_url;
-- 6. DROP COLUMN final_image_url;