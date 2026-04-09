-- Job Application Tracker
create table if not exists public.job_applications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  company       text not null,
  role          text not null,
  status        text not null default 'saved'
                  check (status in ('saved','applied','interview','offer','rejected')),
  url           text,
  notes         text,
  job_description text,
  applied_date  date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists job_applications_user_id_idx on public.job_applications(user_id);

alter table public.job_applications enable row level security;

create policy "Users own their applications"
  on public.job_applications
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger job_applications_updated_at
  before update on public.job_applications
  for each row execute function public.set_updated_at();


-- Resume Version Manager
create table if not exists public.resume_versions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null default 'Untitled Resume',
  content     text not null,
  score       integer check (score between 0 and 100),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists resume_versions_user_id_idx on public.resume_versions(user_id);

alter table public.resume_versions enable row level security;

create policy "Users own their resumes"
  on public.resume_versions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger resume_versions_updated_at
  before update on public.resume_versions
  for each row execute function public.set_updated_at();
