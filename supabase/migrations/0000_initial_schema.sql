-- ユーザー補助テーブル（必要に応じて）
create table public.users (
  id uuid not null default gen_random_uuid (),
  email text null,
  created_at timestamp without time zone null default now(),
  constraint users_pkey primary key (id),
  constraint users_email_key unique (email)
) TABLESPACE pg_default;

-- テンプレート本体
create table public.templates (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  title text not null,
  description text null,
  prompt_template text not null,
  is_public boolean null default false,
  created_at timestamp without time zone null default now(),
  constraint templates_pkey primary key (id),
  constraint templates_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

-- テンプレートに紐づくフィールド項目
create table public.fields (
  id uuid not null default gen_random_uuid (),
  template_id uuid null,
  name text not null,
  label text not null,
  type text null,
  options jsonb null,
  sort_order integer null default 0,
  created_at timestamp without time zone null default now(),
  constraint fields_pkey primary key (id),
  constraint fields_template_id_fkey foreign KEY (template_id) references templates (id) on delete CASCADE,
  constraint fields_type_check check (
    (
      type = any (
        array ['select'::text, 'text'::text, 'checkbox'::text]
      )
    )
  )
) TABLESPACE pg_default;

-- タグテーブル（正規化）
create table public.tags (
  id uuid not null default gen_random_uuid (),
  name text not null,
  constraint tags_pkey primary key (id),
  constraint tags_name_key unique (name)
) TABLESPACE pg_default;

-- テンプレートとタグの関連付けテーブル
create table public.template_tags (
  template_id uuid not null,
  tag_id uuid not null,
  constraint template_tags_pkey primary key (template_id, tag_id),
  constraint template_tags_tag_id_fkey foreign KEY (tag_id) references tags (id) on delete CASCADE,
  constraint template_tags_template_id_fkey foreign KEY (template_id) references templates (id) on delete CASCADE
) TABLESPACE pg_default;
