-- Run this in your Supabase SQL editor to set up the database schema

-- Task progress tracker
create table if not exists task_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  task_id text not null,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, task_id)
);

-- Hideout progress tracker
create table if not exists hideout_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  station_id text not null,
  current_level integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, station_id)
);

-- Watched flea market items
create table if not exists watched_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  item_id text not null,
  item_name text not null,
  item_short_name text,
  created_at timestamptz default now(),
  unique(user_id, item_id)
);

-- Enable Row Level Security
alter table task_progress enable row level security;
alter table hideout_progress enable row level security;
alter table watched_items enable row level security;

-- RLS Policies: users can only access their own data
create policy "Users can manage own task progress"
  on task_progress for all
  using (auth.uid() = user_id);

create policy "Users can manage own hideout progress"
  on hideout_progress for all
  using (auth.uid() = user_id);

create policy "Users can manage own watched items"
  on watched_items for all
  using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_task_progress_updated_at
  before update on task_progress
  for each row execute function update_updated_at();

create trigger update_hideout_progress_updated_at
  before update on hideout_progress
  for each row execute function update_updated_at();
