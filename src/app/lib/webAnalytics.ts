import type { BeforeSendEvent } from "@vercel/analytics/next";

const trackedPaths = new Set([
  "/", "/dashboard", "/resume", "/jobmatch", "/tailor", "/coverLetter",
  "/interview", "/applications", "/resumes", "/account", "/login",
  "/checkout", "/success", "/contact", "/privacy", "/terms",
]);

export function filterPageView(event: BeforeSendEvent): BeforeSendEvent | null {
  // Only page views are enabled. Never forward arbitrary custom-event data.
  if (event.type !== "pageview") return null;
  try {
    const url = new URL(event.url);
    if (!["https:", "http:"].includes(url.protocol)) return null;
    const path = url.pathname.replace(/\/$/, "") || "/";
    const detail = path.match(/^\/(applications|resumes)\/[^/]+$/);
    if (!trackedPaths.has(path) && !detail) return null;

    // Keep page counts without workspace IDs, auth tokens or checkout sessions.
    url.pathname = detail ? `/${detail[1]}/[id]` : path;
    url.search = "";
    url.hash = "";
    url.username = "";
    url.password = "";
    return { type: "pageview", url: url.toString() };
  } catch {
    return null;
  }
}
