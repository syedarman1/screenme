import { test } from "node:test";
import assert from "node:assert/strict";
import { allowedJobUrl, publicAddress } from "../src/app/lib/jobUrl";

test("only HTTPS job boards without credentials or unusual ports are accepted", () => {
  assert.equal(allowedJobUrl("https://boards.greenhouse.io/example/jobs/1").hostname, "boards.greenhouse.io");
  for (const value of ["http://linkedin.com/jobs", "https://linkedin.com.evil.test", "https://localhost", "https://user:pass@linkedin.com", "https://linkedin.com:8443/jobs", "https://127.0.0.1"]) assert.throws(() => allowedJobUrl(value));
});
test("DNS lookup rejects loopback, mapped IPv4, local and metadata addresses", () => {
  for (const ip of ["127.0.0.1", "10.0.0.1", "172.16.0.1", "192.168.1.1", "169.254.169.254", "::1", "::ffff:127.0.0.1", "fc00::1", "fe80::1"]) assert.equal(publicAddress(ip), false, ip);
  assert.equal(publicAddress("8.8.8.8"), true);
});
