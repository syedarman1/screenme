-- Lock down user_plans, user_usage, payment_history.
-- Only the service role (bypasses RLS) and SECURITY DEFINER RPCs may write;
-- signed-in users may read only their own rows; anon gets nothing.
--
-- Closes a critical hole: these tables previously had an RLS policy
-- USING(true) for role PUBLIC plus full anon/authenticated write grants, so
-- anyone with the public anon key could upgrade themselves to Pro, reset their
-- usage, and read all payment history directly via the REST API.

-- 1) Drop the over-permissive "Service role can manage" policies.
drop policy if exists "Service role can manage plans"    on public.user_plans;
drop policy if exists "Service role can manage usage"    on public.user_usage;
drop policy if exists "Service role can manage payments" on public.payment_history;

-- 2) Revoke client write privileges (the "Users can view own ..." SELECT policies remain).
revoke insert, update, delete on public.user_plans      from anon, authenticated;
revoke insert, update, delete on public.user_usage      from anon, authenticated;
revoke insert, update, delete on public.payment_history from anon, authenticated;

-- 3) Signed-out users shouldn't read these at all.
revoke select on public.user_plans      from anon;
revoke select on public.user_usage      from anon;
revoke select on public.payment_history from anon;

-- 4) Seed plan/usage rows on signup so nothing depends on client/anon writes.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_plans (user_id, plan)
    values (new.id, 'free')
    on conflict (user_id) do nothing;
  insert into public.user_usage (user_id, resume_scans, cover_letters, job_matches, interview_preps, resume_tailors)
    values (new.id, 0, 0, 0, 0, 0)
    on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
