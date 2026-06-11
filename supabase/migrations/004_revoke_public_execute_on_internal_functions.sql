-- These functions should never be callable via the public REST API.
-- handle_new_user is a trigger function (triggers fire regardless of EXECUTE
-- grants); get_revenue_summary / get_user_usage_summary are admin/internal and
-- unused by the app, but were anon/authenticated-executable as SECURITY DEFINER
-- (a revenue/data-leak surface via /rest/v1/rpc/...).
revoke execute on function public.handle_new_user()        from public, anon, authenticated;
revoke execute on function public.get_revenue_summary()    from public, anon, authenticated;
revoke execute on function public.get_user_usage_summary() from public, anon, authenticated;
