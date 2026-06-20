-- Keepalive: a tiny, data-free table that a scheduled GitHub Action reads on a
-- cadence so the Supabase free-tier project is never auto-paused. Free projects
-- pause after 7 days with no requests; the workflow in
-- .github/workflows/keepalive.yml pings this table every 2 days.
create table if not exists public.keepalive (
  id         int primary key default 1 check (id = 1),  -- single-row table
  note       text not null default 'do not delete — keeps the project from auto-pausing on inactivity',
  created_at timestamptz not null default now()
);

insert into public.keepalive (id) values (1)
  on conflict (id) do nothing;

alter table public.keepalive enable row level security;

-- The table holds no user data, so the anon role may read the single row.
-- This is what the keepalive ping selects. No insert/update/delete policy
-- exists, so anon cannot modify it.
grant select on public.keepalive to anon, authenticated;

drop policy if exists "Anyone can read keepalive" on public.keepalive;
create policy "Anyone can read keepalive"
  on public.keepalive
  for select
  to anon, authenticated
  using (true);
