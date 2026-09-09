-- Add a separate, refundable monthly allowance for successful job-link imports.
alter table public.user_usage add column job_imports integer not null default 0 check(job_imports>=0);
alter table public.usage_reservations drop constraint usage_reservations_field_check;
alter table public.usage_reservations add constraint usage_reservations_field_check
  check(field in ('resume_scans','cover_letters','job_matches','interview_preps','resume_tailors','job_imports'));

create or replace function public.screenme_usage(p_user_id uuid,p_feature text default null,p_consume boolean default false)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_plan text; v_usage public.user_usage; v_field text; v_limit integer; v_count integer;
  v_period timestamptz := date_trunc('month',now() at time zone 'UTC') at time zone 'UTC';
  v_id uuid; v_expired record;
begin
  v_field := case p_feature when 'resume_scan' then 'resume_scans' when 'cover_letter' then 'cover_letters'
    when 'job_match' then 'job_matches' when 'interview_prep' then 'interview_preps' when 'resume_tailor' then 'resume_tailors' when 'job_import' then 'job_imports' end;
  if (p_feature is not null and v_field is null) or (p_consume and v_field is null) then raise exception 'Invalid feature'; end if;
  insert into public.user_plans(user_id,plan) values(p_user_id,'free') on conflict(user_id) do nothing;
  select plan into strict v_plan from public.user_plans where user_id=p_user_id for update;
  insert into public.user_usage(user_id,last_reset) values(p_user_id,v_period) on conflict(user_id) do nothing;
  select * into strict v_usage from public.user_usage where user_id=p_user_id for update;
  if v_usage.last_reset is null or v_usage.last_reset < v_period then
    update public.user_usage set resume_scans=0,cover_letters=0,job_matches=0,interview_preps=0,resume_tailors=0,job_imports=0,
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
  v_limit := case when v_plan='pro' then -1 when p_feature='resume_scan' then 3 when p_feature='interview_prep' then 0 when p_feature='job_import' then 5 else 2 end;
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

-- App routes own all writes; clients retain owner-scoped read access via RLS.
revoke all on public.resume_versions,public.job_applications from public,anon,authenticated;
grant select on public.resume_versions,public.job_applications to authenticated;
grant select,insert,update,delete on public.resume_versions,public.job_applications to service_role;

-- Serialize saves with the same account row used by billing and usage. A count
-- and insert in separate HTTP requests cannot safely enforce a storage cap.
create function public.screenme_enforce_saved_limit() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare v_plan text; v_limit integer; v_count bigint;
begin
  if tg_op='UPDATE' then
    if new.user_id is distinct from old.user_id then
      raise exception using errcode='42501',message='Saved records cannot change owner.';
    end if;
    return new;
  end if;
  insert into public.user_plans(user_id,plan) values(new.user_id,'free') on conflict(user_id) do nothing;
  select plan into strict v_plan from public.user_plans where user_id=new.user_id for update;
  if tg_table_name='resume_versions' then
    v_limit:=case when v_plan='pro' then 20 else 3 end;
    select count(*) into v_count from public.resume_versions where user_id=new.user_id;
  elsif tg_table_name='job_applications' then
    if v_plan='pro' then return new; end if;
    v_limit:=10;
    select count(*) into v_count from public.job_applications where user_id=new.user_id;
  else
    raise exception 'Unsupported saved record table';
  end if;
  if v_count>=v_limit then
    raise exception using errcode='P0001',message='SAVED_ITEM_LIMIT',
      detail=json_build_object('resource',tg_table_name,'limit',v_limit,'plan',v_plan)::text;
  end if;
  return new;
end;
$$;
revoke all on function public.screenme_enforce_saved_limit() from public,anon,authenticated;
grant execute on function public.screenme_enforce_saved_limit() to service_role;
create trigger enforce_saved_resume_limit before insert or update of user_id on public.resume_versions
  for each row execute function public.screenme_enforce_saved_limit();
create trigger enforce_application_limit before insert or update of user_id on public.job_applications
  for each row execute function public.screenme_enforce_saved_limit();
