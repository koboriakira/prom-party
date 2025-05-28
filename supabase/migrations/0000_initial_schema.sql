-- ユーザー補助テーブル（必要に応じて）
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamp default now()
);

-- テンプレート本体
create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade, -- This links to Supabase's own auth users
  title text not null,
  description text,
  prompt_template text not null, -- User calls this prompt_template
  is_public boolean default false,
  created_at timestamp default now(),
  updated_at timestamp default now() -- Added updated_at, will be managed by a trigger
);

-- テンプレートに紐づくフィールド項目
create table if not exists fields (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references templates(id) on delete cascade,
  name text not null, -- This is the {{variable_name}}
  label text not null, -- This is the UI label
  type text check (type in ('select', 'text', 'checkbox')), -- User added 'checkbox'
  options jsonb, -- For select type
  sort_order int default 0, -- User added sort_order
  created_at timestamp default now()
);

-- タグテーブル（正規化）
create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

-- テンプレートとタグのリレーション
create table if not exists template_tags (
  template_id uuid references templates(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  primary key (template_id, tag_id)
);

-- Initial database schema based on user-provided table creation scripts. This includes tables: users, templates, fields, tags, and template_tags.
