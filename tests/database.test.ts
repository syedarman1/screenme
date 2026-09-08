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
  for (const file of readdirSync("supabase/migrations").filter(name => name.startsWith("20260908")).sort()) sql(readFileSync(`supabase/migrations/${file}`, "utf8"));
});
const uid = "00000000-0000-4000-8000-000000000001";
const billing = (key: string, status = "active", observed = "2026-09-08T12:00:00Z") =>
  `select public.screenme_apply_billing('${key}','${uid}','sub_test','cus_test','${status}','${observed}');`;

test("billing transaction rolls back completely on receipt failure, and can retry", { skip: !container }, () => {
  sql(`insert into auth.users values('${uid}'); insert into public.user_plans(user_id) values('${uid}');
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
