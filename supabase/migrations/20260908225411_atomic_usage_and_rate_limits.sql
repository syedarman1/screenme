create table public.usage_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  field text not null check(field in ('resume_scans','cover_letters','job_matches','interview_preps','resume_tailors')),
  period timestamptz not null,
  state text not null default 'reserved' check(state in ('reserved','completed','refunded')),
  created_at timestamptz not null default now()
);
create index usage_reservations_user on public.usage_reservations(user_id, state, created_at);
alter table public.usage_reservations enable row level security;
revoke all on public.usage_reservations from public,anon,authenticated;
grant all on public.usage_reservations to service_role;

create table public.request_limits(key text primary key, count integer not null, expires_at timestamptz not null);
create index request_limits_expiry on public.request_limits(expires_at);
alter table public.request_limits enable row level security;
revoke all on public.request_limits from public,anon,authenticated;
grant all on public.request_limits to service_role;

create function public.screenme_rate_limit(p_key text, p_limit integer default 10, p_window integer default 60)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_count integer; v_expiry timestamptz;
begin
  if p_limit < 1 or p_window < 1 or length(p_key)>200 then raise exception 'Invalid rate limit'; end if;
  delete from public.request_limits where expires_at < now()-interval '1 day';
  insert into public.request_limits as r(key,count,expires_at) values(p_key,1,now()+make_interval(secs=>p_window))
  on conflict(key) do update set
    count=case when r.expires_at<=now() then 1 else r.count+1 end,
    expires_at=case when r.expires_at<=now() then now()+make_interval(secs=>p_window) else r.expires_at end
  returning count,expires_at into v_count,v_expiry;
  return jsonb_build_object('success',v_count<=p_limit,'limit',p_limit,'remaining',greatest(0,p_limit-v_count),
    'retryAfter',greatest(1,ceil(extract(epoch from(v_expiry-now())))));
end;
$$;

create function public.screenme_usage(p_user_id uuid,p_feature text default null,p_consume boolean default false)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_plan text; v_usage public.user_usage; v_field text; v_limit integer; v_count integer;
  v_period timestamptz := date_trunc('month',now() at time zone 'UTC') at time zone 'UTC';
  v_id uuid; v_expired record;
begin
  v_field := case p_feature when 'resume_scan' then 'resume_scans' when 'cover_letter' then 'cover_letters'
    when 'job_match' then 'job_matches' when 'interview_prep' then 'interview_preps' when 'resume_tailor' then 'resume_tailors' end;
  if (p_feature is not null and v_field is null) or (p_consume and v_field is null) then raise exception 'Invalid feature'; end if;
  insert into public.user_plans(user_id,plan) values(p_user_id,'free') on conflict(user_id) do nothing;
  select plan into strict v_plan from public.user_plans where user_id=p_user_id for update;
  insert into public.user_usage(user_id,last_reset) values(p_user_id,v_period) on conflict(user_id) do nothing;
  select * into strict v_usage from public.user_usage where user_id=p_user_id for update;
  if v_usage.last_reset is null or v_usage.last_reset < v_period then
    update public.user_usage set resume_scans=0,cover_letters=0,job_matches=0,interview_preps=0,resume_tailors=0,
      last_reset=v_period,updated_at=now() where user_id=p_user_id;
  end if;
  -- Recover reserved allowances after a crashed/timed-out worker.
  for v_expired in select * from public.usage_reservations where user_id=p_user_id and state='reserved'
      and created_at<now()-interval '10 minutes' for update loop
    if v_expired.period=v_period then
      execute format('update public.user_usage set %I=greatest(0,%I-1) where user_id=$1',v_expired.field,v_expired.field) using p_user_id;
    end if;
    update public.usage_reservations set state='refunded' where id=v_expired.id;
  end loop;
  delete from public.usage_reservations where user_id=p_user_id and created_at<now()-interval '2 months';
  select * into strict v_usage from public.user_usage where user_id=p_user_id;
  if p_feature is null then return to_jsonb(v_usage)||jsonb_build_object('plan',v_plan); end if;
  v_limit := case when v_plan='pro' then -1 when p_feature='resume_scan' then 3 when p_feature='interview_prep' then 0 else 2 end;
  v_count := (to_jsonb(v_usage)->>v_field)::integer;
  if v_limit<>-1 and v_count>=v_limit then
    return jsonb_build_object('allowed',false,'limit',v_limit,'remaining',0,'plan',v_plan,'reason','quota');
  end if;
  if p_consume then
    if (select count(*) from public.usage_reservations where user_id=p_user_id and state='reserved')>=3 then
      return jsonb_build_object('allowed',false,'limit',v_limit,'remaining',greatest(0,v_limit-v_count),'plan',v_plan,'reason','busy');
    end if;
    execute format('update public.user_usage set %I=%I+1,updated_at=now() where user_id=$1',v_field,v_field) using p_user_id;
    insert into public.usage_reservations(user_id,field,period) values(p_user_id,v_field,v_period) returning id into v_id;
    v_count:=v_count+1;
  end if;
  return jsonb_build_object('allowed',true,'limit',v_limit,'remaining',case when v_limit=-1 then -1 else v_limit-v_count end,
    'plan',v_plan,'reservationId',v_id);
end;
$$;

create function public.screenme_finish_usage(p_id uuid,p_success boolean) returns void
language plpgsql security invoker set search_path = '' as $$
declare v_res public.usage_reservations; v_reset timestamptz;
begin
  select * into strict v_res from public.usage_reservations where id=p_id;
  select last_reset into strict v_reset from public.user_usage where user_id=v_res.user_id for update;
  select * into strict v_res from public.usage_reservations where id=p_id for update;
  if v_res.state<>'reserved' then return; end if;
  if not p_success and v_res.period=date_trunc('month',v_reset at time zone 'UTC') at time zone 'UTC' then
    execute format('update public.user_usage set %I=greatest(0,%I-1),updated_at=now() where user_id=$1',v_res.field,v_res.field) using v_res.user_id;
  end if;
  update public.usage_reservations set state=case when p_success then 'completed' else 'refunded' end where id=p_id;
end;
$$;

revoke all on function public.screenme_rate_limit(text,integer,integer),public.screenme_usage(uuid,text,boolean),public.screenme_finish_usage(uuid,boolean) from public,anon,authenticated;
grant execute on function public.screenme_rate_limit(text,integer,integer),public.screenme_usage(uuid,text,boolean),public.screenme_finish_usage(uuid,boolean) to service_role;
