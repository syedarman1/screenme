create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(name) between 2 and 100),
  email text not null check(length(email)<=254),
  subject text not null check(length(subject) between 1 and 200),
  message text not null check(length(message) between 10 and 2000),
  status text not null default 'new' check(status in ('new','handled')),
  created_at timestamptz not null default now()
);
alter table public.contact_messages enable row level security;
revoke all on public.contact_messages from public,anon,authenticated;
grant all on public.contact_messages to service_role;
