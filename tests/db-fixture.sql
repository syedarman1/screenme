-- Disposable PostgreSQL test environment only. Never run against production.
do $$begin create role anon; exception when duplicate_object then null; end;$$;
do $$begin create role authenticated; exception when duplicate_object then null; end;$$;
do $$begin create role service_role bypassrls; exception when duplicate_object then null; end;$$;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function auth.role() returns text language sql stable as $$select current_setting('request.jwt.claim.role',true)$$;
grant usage on schema public,auth to anon,authenticated,service_role;
