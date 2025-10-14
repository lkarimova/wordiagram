-- Schema for World-News Painting
create extension if not exists pgcrypto;

create table if not exists daily_paintings (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  base_image_url text not null,
  final_image_url text,
  prompt jsonb not null,
  style_descriptor jsonb not null,
  world_theme_summary text not null,
  art_style_summary text not null,
  model_info jsonb not null,
  sources jsonb not null,
  created_at timestamptz default now()
);

create table if not exists painting_updates (
  id uuid primary key default gen_random_uuid(),
  daily_id uuid references daily_paintings(id) on delete cascade,
  update_type text not null check (update_type in ('world_addition','art_restyle')),
  mask_url text,
  overlay_image_url text,
  update_prompt jsonb not null,
  sources jsonb not null,
  rationale text not null,
  created_at timestamptz default now()
);

create index if not exists idx_daily_paintings_date on daily_paintings(date desc);
create index if not exists idx_updates_daily on painting_updates(daily_id);
