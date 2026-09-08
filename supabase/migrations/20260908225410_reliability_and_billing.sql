-- Existing billing data is preserved. New receipts commit with entitlement changes.
alter table public.user_plans add column if not exists billing_observed_at timestamptz;
create table public.billing_fulfillments (
  key text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id text not null,
  status text not null,
  amount bigint,
  currency text,
  created_at timestamptz not null default now()
);
alter table public.billing_fulfillments enable row level security;
revoke all on public.billing_fulfillments from public, anon, authenticated;
grant all on public.billing_fulfillments to service_role;

create function public.screenme_apply_billing(
  p_key text, p_user_id uuid, p_subscription_id text, p_customer_id text,
  p_status text, p_observed_at timestamptz, p_amount bigint default null, p_currency text default null
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_plan public.user_plans;
begin
  if p_key is null or p_subscription_id is null or p_customer_id is null or p_observed_at is null
    or p_status not in ('active','trialing','past_due','unpaid','canceled','incomplete','incomplete_expired','paused') then
    raise exception 'Invalid billing state';
  end if;
  insert into public.user_plans(user_id,plan) values(p_user_id,'free') on conflict(user_id) do nothing;
  select * into strict v_plan from public.user_plans where user_id=p_user_id for update;
  if exists(select 1 from public.billing_fulfillments where key=p_key) then return false; end if;
  if v_plan.stripe_subscription_id is not null and v_plan.stripe_subscription_id <> p_subscription_id
     and v_plan.subscription_status in ('active','trialing','past_due','unpaid','paused') then
    raise exception 'Another subscription is already linked';
  end if;
  if v_plan.billing_observed_at is null or p_observed_at >= v_plan.billing_observed_at then
    update public.user_plans set
      plan=case when p_status in ('active','trialing') then 'pro' else 'free' end,
      stripe_customer_id=p_customer_id, stripe_subscription_id=p_subscription_id,
      subscription_status=p_status, billing_observed_at=p_observed_at,
      subscription_end_date=case when p_status='canceled' then now() else null end, updated_at=now()
    where user_id=p_user_id;
  end if;
  insert into public.billing_fulfillments(key,user_id,subscription_id,status,amount,currency)
    values(p_key,p_user_id,p_subscription_id,p_status,p_amount,p_currency);
  return true;
end;
$$;
revoke all on function public.screenme_apply_billing(text,uuid,text,text,text,timestamptz,bigint,text) from public,anon,authenticated;
grant execute on function public.screenme_apply_billing(text,uuid,text,text,text,timestamptz,bigint,text) to service_role;
