import { test, before } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const container = process.env.SCREENME_TEST_DB;
function sql(query: string) {
  return execFileSync("docker", ["exec", "-i", container!, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-At"], { input: query, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}
before(() => {
  if (!container) return;
  assert.match(container, /^codex-screenme-/);
  sql("drop schema if exists public cascade; drop schema if exists auth cascade; create schema public;");
  sql(readFileSync("tests/db-fixture.sql", "utf8"));
  sql(readFileSync("supabase/migrations/20260908220713_reliability_and_billing.sql", "utf8"));
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
