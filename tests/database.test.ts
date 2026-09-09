import { test, before } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, readdirSync } from "node:fs";

const container = process.env.SCREENME_TEST_DB;
function sql(query: string) {
  return execFileSync("docker", ["exec", "-i", container!, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-At"], { input: query, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}
before(() => {
  if (!container) return;
  assert.match(container, /^codex-screenme-/);
  sql("drop schema if exists public cascade; drop schema if exists auth cascade; create schema public;");
  sql(readFileSync("tests/db-fixture.sql", "utf8"));
  sql(readFileSync("supabase/schema-baseline.sql", "utf8"));
  for (const file of readdirSync("supabase/migrations").filter(name => /^\d{14}_/.test(name)).sort()) sql(readFileSync(`supabase/migrations/${file}`, "utf8"));
});
const uid = "00000000-0000-4000-8000-000000000001";
const billing = (key: string, status = "active", observed = "2026-09-08T12:00:00Z") =>
  `select public.screenme_apply_billing('${key}','${uid}','sub_test','cus_test','${status}','${observed}');`;

test("billing transaction rolls back completely on receipt failure, and can retry", { skip: !container }, () => {
  sql(`insert into auth.users values('${uid}'); insert into public.user_plans(user_id) values('${uid}') on conflict do nothing;
    create function public.fail_receipt() returns trigger language plpgsql as $$begin raise exception 'injected failure'; end;$$;
    create trigger fail_receipt before insert on public.billing_fulfillments for each row execute function public.fail_receipt();`);
  assert.throws(() => sql(billing("evt_retry")));
  assert.equal(sql(`select plan from user_plans where user_id='${uid}';`), "free");
  assert.equal(sql("select count(*) from billing_fulfillments;"), "0");
  sql("drop trigger fail_receipt on billing_fulfillments;");
  assert.equal(sql(billing("evt_retry")), "t");
  assert.equal(sql(billing("evt_retry")), "f");
  assert.equal(sql(`select plan from user_plans where user_id='${uid}';`), "pro");
});

test("an older observation cannot undo a cancellation", { skip: !container }, () => {
  sql(billing("evt_cancel", "canceled", "2026-09-08T14:00:00Z"));
  sql(billing("evt_delayed", "active", "2026-09-08T13:00:00Z"));
  assert.equal(sql(`select plan from user_plans where user_id='${uid}';`), "free");
});

test("public clients cannot fulfill payments", { skip: !container }, () => {
  assert.throws(() => sql("set role anon;" + billing("evt_attack")));
  assert.throws(() => sql("set role authenticated;" + billing("evt_attack")));
});

const usageUser = "00000000-0000-4000-8000-000000000002";
test("parallel requests cannot exceed the Free allowance", { skip: !container }, async () => {
  sql(`insert into auth.users values('${usageUser}');`);
  const requests = Array.from({ length: 10 }, () => promisify(execFile)("docker", ["exec", container!, "psql", "-U", "postgres", "-At", "-v", "ON_ERROR_STOP=1", "-c", `select screenme_usage('${usageUser}','resume_scan',true);`]));
  const results = await Promise.all(requests);
  assert.equal(results.filter(result => JSON.parse(result.stdout).allowed).length, 3);
  assert.equal(sql(`select resume_scans from user_usage where user_id='${usageUser}';`), "3");
});

test("failed requests refund once, and stale requests cannot refund a new month", { skip: !container }, () => {
  const id = sql(`select id from usage_reservations where user_id='${usageUser}' limit 1;`);
  sql(`select screenme_finish_usage('${id}',false); select screenme_finish_usage('${id}',false);`);
  assert.equal(sql(`select resume_scans from user_usage where user_id='${usageUser}';`), "2");
  const old = sql(`select id from usage_reservations where user_id='${usageUser}' and state='reserved' limit 1;`);
  sql(`update user_usage set last_reset='2000-01-01' where user_id='${usageUser}'; update usage_reservations set period='2000-01-01' where user_id='${usageUser}';`);
  const snapshot = JSON.parse(sql(`select screenme_usage('${usageUser}');`));
  assert.equal(snapshot.resume_scans, 0);
  sql(`select screenme_usage('${usageUser}','resume_scan',true); select screenme_finish_usage('${old}',false);`);
  assert.equal(sql(`select resume_scans from user_usage where user_id='${usageUser}';`), "1");
});

test("crashed reservations are reclaimed and Pro plans are never overwritten", { skip: !container }, () => {
  sql(`update user_plans set plan='pro' where user_id='${usageUser}'; update usage_reservations set created_at=now()-interval '11 minutes' where user_id='${usageUser}' and state='reserved';`);
  const snapshot = JSON.parse(sql(`select screenme_usage('${usageUser}');`));
  assert.equal(snapshot.plan, "pro");
  assert.equal(snapshot.resume_scans, 0);
  assert.equal(JSON.parse(sql(`select screenme_usage('${usageUser}','interview_prep',true);`)).limit, -1);
});

test("rate limiting shares an atomic counter across processes", { skip: !container }, async () => {
  const results = await Promise.all(Array.from({ length: 15 }, () => promisify(execFile)("docker", ["exec", container!, "psql", "-U", "postgres", "-At", "-c", "select screenme_rate_limit('test-shared',10,60); "])));
  assert.equal(results.filter(result => JSON.parse(result.stdout).success).length, 10);
  assert.throws(() => sql(`set role authenticated; select screenme_usage('${usageUser}','resume_scan',true);`));
});


test("contact messages are durable and inaccessible to public clients", { skip: !container }, () => {
  sql("set role service_role; insert into contact_messages(name,email,subject,message) values('Test User','test@example.invalid','Test','Synthetic support message');");
  assert.equal(sql("select count(*) from contact_messages;"), "1");
  for (const role of ["anon", "authenticated"]) {
    assert.throws(() => sql(`set role ${role}; select * from contact_messages;`));
    assert.throws(() => sql(`set role ${role}; select upgrade_user_to_pro('${uid}');`));
  }
});

test("signed-in users can read only their own saved records", { skip: !container }, () => {
  sql(`insert into resume_versions(user_id,name,content) values('${uid}','Resume','Synthetic resume');`);
  assert.equal(sql(`set role authenticated; set request.jwt.claim.sub='${usageUser}'; select count(*) from resume_versions;`).split("\n").at(-1), "0");
  assert.equal(sql(`set role authenticated; set request.jwt.claim.sub='${uid}'; select count(*) from resume_versions;`).split("\n").at(-1), "1");
});

const importUser = "00000000-0000-4000-8000-000000000003";
test("job imports share one atomic five-use allowance and do not consume other tools", { skip: !container }, async () => {
  sql(`insert into auth.users values('${importUser}');`);
  await Promise.all(Array.from({ length: 12 }, () => promisify(execFile)("docker", ["exec", container!, "psql", "-U", "postgres", "-At", "-v", "ON_ERROR_STOP=1", "-c", `set role service_role; do $$declare v jsonb; begin v:=screenme_usage('${importUser}','job_import',true); if (v->>'allowed')::boolean then perform screenme_finish_usage((v->>'reservationId')::uuid,true); end if; end$$;`])));
  const usage = JSON.parse(sql(`select screenme_usage('${importUser}');`));
  assert.equal(usage.job_imports, 5);
  assert.equal(usage.job_matches, 0);
  assert.equal(usage.resume_tailors, 0);
  assert.equal(JSON.parse(sql(`select screenme_usage('${importUser}','job_import',true);`)).allowed, false);
  sql(`update user_usage set last_reset='2000-01-01' where user_id='${importUser}';`);
  assert.equal(JSON.parse(sql(`select screenme_usage('${importUser}');`)).job_imports, 0);
  const reservation = JSON.parse(sql(`select screenme_usage('${importUser}','job_import',true);`));
  sql(`select screenme_finish_usage('${reservation.reservationId}',false); select screenme_finish_usage('${reservation.reservationId}',false);`);
  assert.equal(JSON.parse(sql(`select screenme_usage('${importUser}');`)).job_imports, 0);
  sql(`update user_plans set plan='pro' where user_id='${importUser}'; update user_usage set job_imports=100 where user_id='${importUser}';`);
  assert.equal(JSON.parse(sql(`select screenme_usage('${importUser}','job_import',true);`)).limit, -1);
});

const savedUser = "00000000-0000-4000-8000-000000000004";
async function concurrentSaves(table: string, columns: string, values: string, attempts: number) {
  return Promise.allSettled(Array.from({ length: attempts }, () => promisify(execFile)("docker", ["exec", container!, "psql", "-U", "postgres", "-At", "-v", "ON_ERROR_STOP=1", "-c", `set role service_role; insert into ${table}(user_id,${columns}) values('${savedUser}',${values});`])));
}
test("concurrent saves cannot exceed Free resume or application limits", { skip: !container }, async () => {
  sql(`insert into auth.users values('${savedUser}');`);
  const resumes = await concurrentSaves("resume_versions", "name,content", "'Test','Synthetic test resume'", 12);
  assert.equal(resumes.filter(r => r.status === "fulfilled").length, 3);
  assert.equal(sql(`select count(*) from resume_versions where user_id='${savedUser}';`), "3");
  const applications = await concurrentSaves("job_applications", "company,role", "'Test','Test role'", 18);
  assert.equal(applications.filter(r => r.status === "fulfilled").length, 10);
  assert.equal(sql(`select count(*) from job_applications where user_id='${savedUser}';`), "10");
});

test("direct client writes cannot bypass caps or mutate another user's records", { skip: !container }, () => {
  for (const role of ["anon", "authenticated"]) {
    for (const query of [
      `insert into resume_versions(user_id,name,content) values('${savedUser}','Test','Test');`,
      `insert into job_applications(user_id,company,role) values('${savedUser}','Test','Test');`,
      `update resume_versions set user_id='${uid}';`,
      `delete from job_applications;`,
      `truncate resume_versions;`,
    ]) assert.throws(() => sql(`set role ${role}; set request.jwt.claim.sub='${savedUser}'; ${query}`));
  }
  assert.throws(() => sql(`set role service_role; update resume_versions set user_id='${uid}' where user_id='${savedUser}';`));
});

test("Pro caps at twenty resumes, permits more applications, and preserves work after downgrade", { skip: !container }, async () => {
  sql(`update user_plans set plan='pro' where user_id='${savedUser}';`);
  const resumes = await concurrentSaves("resume_versions", "name,content", "'Pro resume','Synthetic test resume'", 25);
  assert.equal(resumes.filter(r => r.status === "fulfilled").length, 17);
  const applications = await concurrentSaves("job_applications", "company,role", "'Pro company','Test role'", 12);
  assert.equal(applications.filter(r => r.status === "fulfilled").length, 12);
  sql(`update user_plans set plan='free' where user_id='${savedUser}';`);
  assert.equal(sql(`set role authenticated; set request.jwt.claim.sub='${savedUser}'; select count(*) from resume_versions;`).split("\n").at(-1), "20");
  sql(`set role service_role; update resume_versions set name='Still editable' where user_id='${savedUser}'; delete from resume_versions where user_id='${savedUser}' and id not in (select id from resume_versions where user_id='${savedUser}' limit 2);`);
  assert.equal((await concurrentSaves("resume_versions", "name,content", "'New','Synthetic resume'", 4)).filter(r => r.status === "fulfilled").length, 1);
  assert.throws(() => sql(`set role service_role; insert into job_applications(user_id,company,role) values('${savedUser}','New','Role');`));
});
