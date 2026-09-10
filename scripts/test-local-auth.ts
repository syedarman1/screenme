import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
assert.equal(new URL(url).hostname, "127.0.0.1", "Local test only");
const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
const email = `auth-qa-${Date.now()}@example.invalid`,
  password = `Qa-${crypto.randomUUID()}!`,
  newPassword = `New-${crypto.randomUUID()}!`;
let userId: string | undefined;
async function getLink(subject: string) {
  for (let attempt = 0; attempt < 15; attempt++) {
    const list = await (
      await fetch("http://127.0.0.1:56324/api/v1/messages")
    ).json();
    const m = list.messages?.find(
      (m: { To: { Address: string }[]; Subject: string }) =>
        m.To?.some((t) => t.Address === email) &&
        m.Subject.toLowerCase().includes(subject),
    );
    if (m) {
      const data = await (
        await fetch(`http://127.0.0.1:56324/api/v1/message/${m.ID}`)
      ).json();
      const link = String(data.HTML)
        .match(/href="([^"]*\/auth\/v1\/verify[^\"]*)"/)?.[1]
        ?.replaceAll("&amp;", "&");
      assert.ok(link);
      assert.equal(new URL(link).hostname, "127.0.0.1");
      return link;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error("Expected local email did not arrive");
}
async function main() {
  try {
    const signup = await client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: "http://localhost:3000/dashboard" },
    });
    assert.equal(signup.error, null);
    userId = signup.data.user?.id;
    assert.ok(userId);
    assert.equal(signup.data.session, null);
    assert.ok(
      (await client.auth.signInWithPassword({ email, password })).error,
    );
    const confirmation = await getLink("confirm");
    const verified = await fetch(confirmation, { redirect: "manual" });
    assert.equal(verified.status, 303);
    assert.ok(
      verified.headers
        .get("location")
        ?.startsWith("http://localhost:3000/dashboard"),
    );
    assert.equal(
      (await client.auth.signInWithPassword({ email, password })).error,
      null,
    );
    await client.auth.signOut();
    assert.equal(
      (
        await client.auth.resetPasswordForEmail(email, {
          redirectTo: "http://localhost:3000/reset-password",
        })
      ).error,
      null,
    );
    const reset = await getLink("reset");
    const recovery = await fetch(reset, { redirect: "manual" });
    assert.equal(recovery.status, 303);
    const location = new URL(recovery.headers.get("location")!);
    assert.equal(location.pathname, "/reset-password");
    const tokens = new URLSearchParams(location.hash.slice(1));
    assert.ok(tokens.get("access_token"));
    assert.equal(tokens.get("type"), "recovery");
    assert.equal(
      (
        await client.auth.setSession({
          access_token: tokens.get("access_token")!,
          refresh_token: tokens.get("refresh_token")!,
        })
      ).error,
      null,
    );
    assert.equal(
      (await client.auth.updateUser({ password: newPassword })).error,
      null,
    );
    await client.auth.signOut({ scope: "global" });
    assert.ok(
      (await client.auth.signInWithPassword({ email, password })).error,
    );
    assert.equal(
      (await client.auth.signInWithPassword({ email, password: newPassword }))
        .error,
      null,
    );
    await client.auth.signOut();
    const reused = await fetch(reset, { redirect: "manual" });
    assert.ok(reused.headers.get("location")?.includes("error="));
    console.log(
      "PASS: signup email, unconfirmed login blocked, confirmation, recovery email, password replacement, old password rejected, used link rejected. Local inbox only.",
    );
  } finally {
    if (userId)
      assert.equal((await admin.auth.admin.deleteUser(userId)).error, null);
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
