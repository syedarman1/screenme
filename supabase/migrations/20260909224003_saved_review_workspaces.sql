create table public.career_workspaces (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('scan','match','tailor','letter','interview')),
 title text not null check(length(title) between 1 and 160),
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=500000),
 revision integer not null default 1 check(revision>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index career_workspaces_owner_updated on public.career_workspaces(user_id,updated_at desc);
alter table public.career_workspaces enable row level security;
create policy workspace_owner_read on public.career_workspaces for select to authenticated using ((select auth.uid())=user_id);
revoke all on public.career_workspaces from public,anon,authenticated;
grant select on public.career_workspaces to authenticated;
grant select,insert,update,delete on public.career_workspaces to service_role;

create table public.workspace_versions (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.career_workspaces(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, revision integer not null,
 payload jsonb not null, created_at timestamptz not null default now(), unique(workspace_id,revision)
);
create index workspace_versions_owner on public.workspace_versions(user_id,workspace_id,revision desc);
alter table public.workspace_versions enable row level security;
create policy version_owner_read on public.workspace_versions for select to authenticated using ((select auth.uid())=user_id);
revoke all on public.workspace_versions from public,anon,authenticated;
grant select on public.workspace_versions to authenticated;
grant select,insert,delete on public.workspace_versions to service_role;

create function public.screenme_workspace_guard() returns trigger language plpgsql security invoker set search_path='' as $$
declare v_plan text; v_count integer;
begin
 if tg_op='INSERT' then
  insert into public.user_plans(user_id,plan) values(new.user_id,'free') on conflict(user_id) do nothing;
  select plan into v_plan from public.user_plans where user_id=new.user_id for update;
  select count(*) into v_count from public.career_workspaces where user_id=new.user_id;
  if v_count>=(case when v_plan='pro' then 20 else 3 end) then raise exception using errcode='P0001',message='WORKSPACE_LIMIT'; end if;
  new.revision:=1;
 else
  if new.user_id<>old.user_id or new.id<>old.id or new.kind<>old.kind then raise exception using errcode='42501',message='Workspace identity cannot change'; end if;
  new.revision:=old.revision+1;
 end if;
 new.updated_at:=now();
 return new;
end; $$;
create trigger workspace_guard before insert or update on public.career_workspaces for each row execute function public.screenme_workspace_guard();

-- Keep completed report snapshots, not every keystroke. The newest 10 are retained.
create function public.screenme_workspace_snapshot() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.payload->'result' is not null and new.payload->'result'<>'null'::jsonb and
   (tg_op='INSERT' or new.payload->'result'->>'analyzedAt' is distinct from old.payload->'result'->>'analyzedAt') then
  insert into public.workspace_versions(workspace_id,user_id,revision,payload) values(new.id,new.user_id,new.revision,new.payload);
  delete from public.workspace_versions where workspace_id=new.id and id not in
   (select id from public.workspace_versions where workspace_id=new.id order by revision desc limit 10);
 end if;
 return new;
end; $$;
create trigger workspace_snapshot after insert or update on public.career_workspaces for each row execute function public.screenme_workspace_snapshot();
revoke all on function public.screenme_workspace_guard(),public.screenme_workspace_snapshot() from public,anon,authenticated;
