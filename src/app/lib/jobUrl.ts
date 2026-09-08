import { request } from "node:https";
import { lookup } from "node:dns";
import ipaddr from "ipaddr.js";

const hosts = ["linkedin.com", "indeed.com", "glassdoor.com", "lever.co", "greenhouse.io", "workday.com", "myworkdayjobs.com", "angel.co", "wellfound.com", "ziprecruiter.com", "monster.com", "dice.com", "simplyhired.com", "careers.google.com", "jobs.apple.com", "amazon.jobs"];
export function allowedJobUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") ||
    !hosts.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) throw new Error("Unsupported job URL.");
  return url;
}
export function publicAddress(address: string): boolean {
  try { return ipaddr.process(address).range() === "unicast"; } catch { return false; }
}

// Validate DNS inside the actual connection lookup so validation and fetching
// cannot resolve to different addresses. Never follow an unchecked redirect.
export async function fetchJobPage(value: string, redirects = 0): Promise<string> {
  const url = allowedJobUrl(value);
  if (redirects > 3) throw new Error("Too many job-page redirects.");
  return new Promise((resolve, reject) => {
    const req = request(url, {
      headers: { "User-Agent": "ScreenMe/1.0", Accept: "text/html" },
      signal: AbortSignal.timeout(15_000),
      lookup(host, options, callback) {
        lookup(host, { all: true }, (error, addresses) => {
          if (error) return callback(error, []);
          if (!addresses.length || addresses.some(item => !publicAddress(item.address))) return callback(new Error("Private network destination blocked."), []);
          if (options.all) callback(null, addresses);
          else callback(null, addresses[0].address, addresses[0].family);
        });
      },
    }, response => {
      const status = response.statusCode || 0;
      if ([301, 302, 303, 307, 308].includes(status)) {
        response.destroy();
        try {
          if (!response.headers.location) throw new Error("Missing redirect destination.");
          const next = allowedJobUrl(new URL(response.headers.location, url).href);
          resolve(fetchJobPage(next.href, redirects + 1));
        } catch (error) { reject(error); }
        return;
      }
      if (status !== 200 || !response.headers["content-type"]?.includes("text/html")) {
        response.destroy(); reject(new Error("Could not read the job page. Paste the description instead.")); return;
      }
      let length = 0;
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => {
        length += chunk.length;
        if (length > 1_000_000) { response.destroy(new Error("Job page exceeds size limit.")); return; }
        chunks.push(chunk);
      });
      response.on("error", reject);
      response.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
    req.on("error", reject);
    req.end();
  });
}
