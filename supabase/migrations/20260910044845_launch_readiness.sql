-- Owner reads remain available; writes still require authenticated server routes.
-- Evaluate the verified identity once per statement instead of once per row.
alter policy "Users can view own plan" on public.user_plans to authenticated using ((select auth.uid()) = user_id);
alter policy "Users can view own usage" on public.user_usage to authenticated using ((select auth.uid()) = user_id);
alter policy "Users can view own payments" on public.payment_history to authenticated using ((select auth.uid()) = user_id);
alter policy "Users own their applications" on public.job_applications to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "Users own their resumes" on public.resume_versions to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- The service role already bypasses RLS. Public roles retain no grants or policy.
drop policy "Service role only for stripe_sessions" on public.stripe_sessions;
create index billing_fulfillments_user_id_idx on public.billing_fulfillments(user_id);
create index contact_messages_inbox_idx on public.contact_messages(status, created_at desc, id desc);
