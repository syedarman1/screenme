// src/app/api/parseJobUrl/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 30000 })
  : null;

const ALLOWED_HOSTS = [
  "linkedin.com", "www.linkedin.com",
  "indeed.com", "www.indeed.com",
  "glassdoor.com", "www.glassdoor.com",
  "lever.co",
  "greenhouse.io", "boards.greenhouse.io",
  "jobs.lever.co",
  "workday.com",
  "myworkdayjobs.com",
  "angel.co", "wellfound.com",
  "ziprecruiter.com", "www.ziprecruiter.com",
  "monster.com", "www.monster.com",
  "dice.com", "www.dice.com",
  "simplyhired.com", "www.simplyhired.com",
  "careers.google.com",
  "jobs.apple.com",
  "amazon.jobs", "www.amazon.jobs",
];

function isAllowedUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname.toLowerCase();
    // Allow any host that ends with one of our allowed domains
    return ALLOWED_HOSTS.some(h => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

function stripHtml(html: string): string {
  // Remove script/style blocks
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, " ");
  text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, " ");
  // Decode common entities
  text = text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
  // Collapse whitespace
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

export async function POST(req: NextRequest) {
  if (!openai) return NextResponse.json({ error: "AI service not configured." }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const { url } = body as { url?: string };

  if (!url || typeof url !== "string" || url.trim().length < 10) {
    return NextResponse.json({ error: "Please provide a valid job posting URL." }, { status: 400 });
  }

  const trimmedUrl = url.trim();

  if (!isAllowedUrl(trimmedUrl)) {
    return NextResponse.json({
      error: "URL not supported. We support LinkedIn, Indeed, Glassdoor, Greenhouse, Lever, and other major job boards. You can still paste the job description manually.",
    }, { status: 400 });
  }

  /* ── Fetch the page ─────────────────────────────────────── */
  let rawHtml: string;
  try {
    const res = await fetch(trimmedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      return NextResponse.json({
        error: `Could not fetch job posting (HTTP ${res.status}). The site may require login. Try pasting the job description manually.`,
      }, { status: 400 });
    }
    rawHtml = await res.text();
  } catch (e: any) {
    console.error("Fetch job URL error:", e);
    return NextResponse.json({
      error: "Could not reach the job posting. Check the URL or paste the description manually.",
    }, { status: 400 });
  }

  /* ── Strip HTML → plain text ────────────────────────────── */
  let pageText = stripHtml(rawHtml);

  // Cap text to prevent token overflow (keep first ~12k chars which is ~3k tokens)
  if (pageText.length > 12000) {
    pageText = pageText.slice(0, 12000);
  }

  if (pageText.length < 100) {
    return NextResponse.json({
      error: "Could not extract enough content from this page. It may require JavaScript or login. Try pasting the job description manually.",
    }, { status: 400 });
  }

  /* ── GPT extraction ────────────────────────────────────── */
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You extract structured job posting data from raw webpage text.

Return ONLY valid JSON with these fields:
{
  "jobTitle": "exact job title from the posting",
  "company": "company name",
  "description": "the full job description including responsibilities, requirements, and qualifications — preserve the original wording as much as possible"
}

Rules:
- Extract the ACTUAL job title and company name, not guesses
- The description should include ALL details: responsibilities, requirements, qualifications, nice-to-haves
- Preserve bullet points as newlines with "- " prefix
- If you cannot find a clear job posting in the text, return: {"error": "No job posting found on this page"}
- No markdown outside the JSON`,
        },
        {
          role: "user",
          content: `Extract the job posting from this webpage text:\n\n${pageText}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 2500,
      response_format: { type: "json_object" },
    });

    const result = completion.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(result);

    if (parsed.error) {
      return NextResponse.json({
        error: parsed.error + " Try pasting the job description manually.",
      }, { status: 400 });
    }

    if (!parsed.description || parsed.description.length < 50) {
      return NextResponse.json({
        error: "Could not extract a complete job description. Try pasting it manually.",
      }, { status: 400 });
    }

    return NextResponse.json({
      jobTitle:    String(parsed.jobTitle || "").slice(0, 200),
      company:     String(parsed.company || "").slice(0, 200),
      description: String(parsed.description || "").slice(0, 10000),
      success:     true,
    });
  } catch (e: any) {
    console.error("GPT extraction error:", e);
    return NextResponse.json({
      error: "Failed to parse job posting. Try pasting the description manually.",
    }, { status: 500 });
  }
}
