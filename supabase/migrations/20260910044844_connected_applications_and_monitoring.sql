alter table public.job_applications add constraint application_owner_unique unique(id,user_id);
alter table public.career_workspaces add constraint workspace_owner_unique unique(id,user_id);
create table public.application_workspaces (
 workspace_id uuid primary key, application_id uuid not null, user_id uuid not null,
 foreign key(workspace_id,user_id) references public.career_workspaces(id,user_id) on delete cascade,
 foreign key(application_id,user_id) references public.job_applications(id,user_id) on delete cascade
);
create index application_workspaces_owner on public.application_workspaces(user_id,application_id);
alter table public.application_workspaces enable row level security;
create policy application_work_owner_read on public.application_workspaces for select to authenticated using((select auth.uid())=user_id);
revoke all on public.application_workspaces from public,anon,authenticated;
grant select on public.application_workspaces to authenticated;
grant all on public.application_workspaces to service_role;

create function public.screenme_start_application_work(p_user_id uuid,p_application_id uuid,p_kind text,p_resume text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare a public.job_applications; w uuid;
begin
 select * into a from public.job_applications where id=p_application_id and user_id=p_user_id for share;
 if not found then raise exception 'Application not found'; end if;
 if length(p_resume)>50000 then raise exception 'Resume too large'; end if;
 insert into public.career_workspaces(user_id,kind,title,payload) values(p_user_id,p_kind,left(a.company||' — '||a.role||' / '||p_kind,160),
 jsonb_build_object('resume',p_resume,'job',coalesce(a.job_description,''),'targetRole',left(a.role,120),'company',a.company,'jobTitle',a.role,'tone','Professional','result',null,'reportResume','','reportJob','','notes','')) returning id into w;
 insert into public.application_workspaces(workspace_id,application_id,user_id) values(w,a.id,p_user_id);
 return w;
end; $$;
revoke all on function public.screenme_start_application_work(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.screenme_start_application_work(uuid,uuid,text,text) to service_role;

-- Monitoring has no document, prompt, output, email, or free-text error columns.
create table public.ai_runs (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 feature text not null check(feature in ('resume_scan','job_match','resume_tailor','cover_letter','interview_prep','job_import')),
 status integer not null check(status between 100 and 599), duration_ms integer not null check(duration_ms>=0),
 calls integer not null check(calls>=0), input_tokens bigint not null check(input_tokens>=0), output_tokens bigint not null check(output_tokens>=0),
 model text not null check(length(model)<=120), cost_usd numeric, cost_complete boolean not null default false,
 helpful boolean, created_at timestamptz not null default now()
);
create index ai_runs_owner_created on public.ai_runs(user_id,created_at desc);
create index ai_runs_created on public.ai_runs(created_at desc);
alter table public.ai_runs enable row level security;
revoke all on public.ai_runs from public,anon,authenticated;
grant select,insert,update,delete on public.ai_runs to service_role;

create function public.screenme_ai_summary(p_user_id uuid default null) returns jsonb language sql security invoker set search_path='' as $$
 select coalesce(jsonb_agg(t),'[]'::jsonb) from (
 select feature,count(*) as runs,count(*) filter(where status between 200 and 299) as successes,
 round(avg(duration_ms)) as average_ms,sum(input_tokens) as input_tokens,sum(output_tokens) as output_tokens,
 sum(cost_usd) as known_cost_usd,count(*) filter(where not cost_complete) as unpriced_runs,
 count(*) filter(where helpful=true) as helpful,count(*) filter(where helpful=false) as unhelpful
 from public.ai_runs where created_at>=now()-interval '30 days' and (p_user_id is null or user_id=p_user_id) group by feature
 ) t;
$$;
revoke all on function public.screenme_ai_summary(uuid) from public,anon,authenticated;
grant execute on function public.screenme_ai_summary(uuid) to service_role;
