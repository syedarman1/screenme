-- Clear advisor 0011 (function_search_path_mutable). These functions reference
-- public tables unqualified, so we pin search_path to `public, pg_temp` (rather
-- than '') to keep them working; pg_catalog is implicit, auth.* is qualified.
alter function public.can_use_feature(uuid, text)                set search_path = public, pg_temp;
alter function public.downgrade_user_to_free(uuid)               set search_path = public, pg_temp;
alter function public.get_revenue_summary()                      set search_path = public, pg_temp;
alter function public.get_user_payment_summary(uuid)             set search_path = public, pg_temp;
alter function public.get_user_payments(uuid, integer)           set search_path = public, pg_temp;
alter function public.get_user_plan_and_usage(uuid)              set search_path = public, pg_temp;
alter function public.increment_usage(uuid, text)                set search_path = public, pg_temp;
alter function public.initialize_user_data(uuid)                 set search_path = public, pg_temp;
alter function public.is_stripe_session_processed(text)          set search_path = public, pg_temp;
alter function public.record_payment_event(uuid, text, text, bigint, text, text, text, text, text, text, text, text, jsonb, timestamptz) set search_path = public, pg_temp;
alter function public.record_stripe_session(text, uuid, bigint, text, text, text, text, text, text, text, jsonb) set search_path = public, pg_temp;
alter function public.record_stripe_session(text, uuid, jsonb)   set search_path = public, pg_temp;
alter function public.set_updated_at()                           set search_path = public, pg_temp;
alter function public.update_updated_at_column()                 set search_path = public, pg_temp;
alter function public.upgrade_user_to_pro(uuid)                  set search_path = public, pg_temp;
alter function public.upgrade_user_to_pro_with_stripe(uuid, text, text) set search_path = public, pg_temp;
