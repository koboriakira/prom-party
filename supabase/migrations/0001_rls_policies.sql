-- RLS 有効化
alter table
   templates enable row level security;

alter table
   fields enable row level security;

alter table
   template_tags enable row level security;

alter table
   tags enable row level security;

-- templates: 公開 or 自分のものは閲覧OK
create policy "Public or owner can read templates" on templates for
select
   using (
      is_public = true
      OR user_id = auth.uid()
   );

-- templates: 自分のものだけ挿入OK
create policy "User can insert own templates" on templates for
insert
   with check (user_id = auth.uid());

-- templates: 自分のものだけ更新・削除OK
create policy "User can update own templates" on templates for
update
   using (user_id = auth.uid());

create policy "User can delete own templates" on templates for delete using (user_id = auth.uid());

-- fields: 関連テンプレートが自分の or 公開なら閲覧OK
create policy "Fields readable if template is public or owned" on fields for
select
   using (
      exists (
         select
            1
         from
            templates t
         where
            t.id = fields.template_id
            and (
               t.is_public = true
               or t.user_id = auth.uid()
            )
      )
   );

-- fields: 関連テンプレートが自分のものなら insert/update/delete OK
create policy "User can modify fields of own templates" on fields for all using (
   exists (
      select
         1
      from
         templates t
      where
         t.id = fields.template_id
         and t.user_id = auth.uid()
   )
) with check (
   exists (
      select
         1
      from
         templates t
      where
         t.id = fields.template_id
         and t.user_id = auth.uid()
   )
);

-- tags: 全員読める
create policy "Anyone can read tags" on tags for
select
   using (true);

-- template_tags: 関連テンプレートが自分のものだけ操作可
create policy "User can manage their own template tags" on template_tags for all using (
   exists (
      select
         1
      from
         templates t
      where
         t.id = template_tags.template_id
         and t.user_id = auth.uid()
   )
) with check (
   exists (
      select
         1
      from
         templates t
      where
         t.id = template_tags.template_id
         and t.user_id = auth.uid()
   )
);
