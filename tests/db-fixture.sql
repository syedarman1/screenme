-- Disposable PostgreSQL test environment only. Never run against production.
do $$begin create role anon; exception when duplicate_object then null; end;$$;
do $$begin create role authenticated; exception when duplicate_object then null; end;$$;
do $$begin create role service_role bypassrls; exception when duplicate_object then null; end;$$;
create schema auth;
create table auth.users(id uuid primary key);
create table public.user_plans(
  user_id uuid primary key references auth.users(id), plan text not null default 'free',
  stripe_customer_id text, stripe_subscription_id text, subscription_status text default 'active',
  subscription_end_date timestamptz, updated_at timestamptz default now()
);
create table public.user_usage(
  user_id uuid primary key references auth.users(id),
  resume_scans integer not null default 0, cover_letters integer not null default 0,
  job_matches integer not null default 0, interview_preps integer not null default 0,
  resume_tailors integer not null default 0, last_reset timestamptz default now(), updated_at timestamptz default now()
);
grant usage on schema public to anon,authenticated,service_role;
grant all on public.user_plans,public.user_usage to service_role;
