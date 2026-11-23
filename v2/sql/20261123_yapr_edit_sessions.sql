-- YAPR isolated schema: existing GLPoche tables left untouched.
create table if not exists public.yapr_edit_sessions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (char_length(title) <= 120),
 style_id text not null,
 source_path text,
 output_path text,
 manifest jsonb not null default '{}'::jsonb check (jsonb_typeof(manifest)='object'),
 status text not null default 'draft' check (status in ('draft','rendering','complete','failed')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists yapr_edit_sessions_user_time_idx on public.yapr_edit_sessions(user_id,created_at desc);
alter table public.yapr_edit_sessions enable row level security;
create policy "yapr_edit_sessions_select_own" on public.yapr_edit_sessions for select to authenticated using ((select auth.uid())=user_id);
create policy "yapr_edit_sessions_insert_own" on public.yapr_edit_sessions for insert to authenticated with check ((select auth.uid())=user_id);
create policy "yapr_edit_sessions_update_own" on public.yapr_edit_sessions for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "yapr_edit_sessions_delete_own" on public.yapr_edit_sessions for delete to authenticated using ((select auth.uid())=user_id);
grant select,insert,update,delete on public.yapr_edit_sessions to authenticated;
