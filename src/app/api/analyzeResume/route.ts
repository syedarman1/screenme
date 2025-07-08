
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { rateLimit } from "../../lib/rate-limit";
import { checkUsageLimit, incrementUsage } from "../../lib/usageTracker";

const Section = z.enum(["Education", "Skills", "Experience", "Projects", "Summary", "Certifications", "Other"]);

const IssueSchema = z.object({
  section: Section,
  line: z.string().min(5),
  text: z.string().min(10),
  severity: z.enum(["low", "medium", "high"]),
  reason: z.string().min(10).optional(),
});

const ActionSchema = z.object({
  section: Section,
  original: z.string().min(5),
  rewrite: z.string().min(20),
  improvement: z.string().min(10).optional(),
});

const StrengthSchema = z.object({
  section: Section,
  text: z.string().min(10),
  reason: z.string().min(10),
});

const KeywordSchema = z.object({
  category: z.string().min(3),
  terms: z.array(z.string().min(2)),
  missing: z.array(z.string().min(2)).optional(),
});

const AuditSchema = z.object({
  score: z.number().int().min(0).max(100),
  issues: z.array(IssueSchema).max(10),
  actions: z.array(ActionSchema).max(10),
  strengths: z.array(StrengthSchema).max(5).optional(),
  keywords: z.array(KeywordSchema).max(5).optional(),
  summary: z.string().min(50).max(500).optional(),
});

type Audit = z.infer<typeof AuditSchema>;

const PROMPT = `
You are a world-class resume coach with expertise in ATS optimization and industry best practices. The user's resume follows (including section headers).  
Produce **ONLY** valid JSON with this structure:

{
  "score": <0–100 integer reflecting overall resume quality>,
  "issues": [
    {
      "section": <"Education"|"Skills"|"Experience"|"Projects"|"Summary"|"Certifications"|"Other">,
      "line": <exact text snippet from resume>,
      "text": <single concise sentence explaining the precise problem>,
      "severity": <"low"|"medium"|"high">,
      "reason": <optional explanation of why this is problematic>
    },
    ...
  ],
  "actions": [
    {
      "section": <same as above>,
      "original": <the exact text from the resume that needs fixing>,
      "rewrite": <a new, optimized version that:
        • starts with a strong past-tense verb, 
        • includes a numeric metric, 
        • ends with result/impact>,
      "improvement": <optional brief explanation of what was improved>
    },
    ...
  ],
  "strengths": [
    {
      "section": <same as above>,
      "text": <what the candidate is doing well>,
      "reason": <why this is effective>
    },
    ...
  ],
  "keywords": [
    {
      "category": <skill category like "Technical", "Soft Skills", etc.>,
      "terms": <array of important keywords present in resume>,
      "missing": <optional array of suggested keywords to add>
    },
    ...
  ],
  "summary": <optional 2-3 sentence executive summary of the resume's overall impression>
}

Rules:
• Only JSON—no markdown, no explanation text, no extra keys.
• issues.length must equal actions.length.  
• Limit to top 5-7 issues, in order of impact.
• For each issue, reference the exact "line" from the resume so it's clear what you're talking about.
• Focus on actionable improvements that would make the most difference.
• Consider both content and formatting issues.
• Pay attention to ATS optimization, quantifiable achievements, action verbs, and result-oriented statements.
• Evaluate keyword density and relevance for the apparent job target.

Example of excellent rewrite:
Original: "Responsible for managing team projects and client relationships"
Rewrite: "Directed 5 cross-functional projects valued at $1.2M, achieving 98% client satisfaction and 15% faster delivery than industry average"
`.trim();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000,
});

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const { success, limit, remaining } = await rateLimit(ip);

    if (!success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
          }
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { resume, options, userId } = body;

    if (typeof resume !== "string" || resume.trim().length < 200) {
      return NextResponse.json(
        { error: "Please provide at least 200 characters of resume text." },
        { status: 400 }
      );
    }

    if (userId) {
      try {
        const usageCheck = await checkUsageLimit(userId, 'resume_scan');

        if (!usageCheck.allowed) {
          return NextResponse.json(
            {
              error: "Usage limit reached. You've used all resume scans for this month.",
              limit: usageCheck.limit,
              remaining: usageCheck.remaining,
              plan: usageCheck.plan
            },
            { status: 429 }
          );
        }
      } catch (error) {
        console.error('Exception in usage checking:', error);
        return NextResponse.json(
          { error: "Failed to check usage limits. Please try again." },
          { status: 500 }
        );
      }
    }

    const sanitizedResume = resume.trim();
    const model = options?.model || "gpt-4o-mini";
    const temperature = options?.temperature || 0.2;

    let prompt = PROMPT;
    if (options?.focusArea) {
      prompt += `\nPay special attention to the "${options.focusArea}" section and prioritize improvements there.`;
    }

    let raw = "";
    let retries = 0;
    const maxRetries = 2;

    while (retries <= maxRetries) {
      try {
        const gpt = await openai.chat.completions.create({
          model,
          temperature,
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: sanitizedResume },
          ],
          response_format: { type: "json_object" },
        });

        raw = gpt.choices[0]?.message?.content ?? "";
        break;
      } catch (error: any) {
        if (retries === maxRetries || !error?.isRetryable) {
          throw error;
        }
        retries++;
        await new Promise(r => setTimeout(r, 1000 * retries));
      }
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      console.error("GPT sent non-JSON:", raw.substring(0, 500));
      return NextResponse.json({
        error: "Failed to parse GPT response as JSON",
        raw: raw.substring(0, 500)
      }, { status: 500 });
    }

    const result = AuditSchema.safeParse(parsed);
    if (!result.success) {
      console.error("Schema validation errors:", result.error.format());
      return NextResponse.json(
        {
          error: "Response format error",
          details: result.error.format(),
          raw: raw.substring(0, 500)
        },
        { status: 500 }
      );
    }

    const clean = (s: string) => s.replace(/\s*[-–—]\s*$/u, "").trim();

    const audit: Audit = {
      score: result.data.score,
      issues: result.data.issues.map((i) => ({
        section: i.section,
        line: clean(i.line),
        text: clean(i.text),
        severity: i.severity,
        reason: i.reason ? clean(i.reason) : undefined,
      })),
      actions: result.data.actions.map((a) => ({
        section: a.section,
        original: clean(a.original),
        rewrite: clean(a.rewrite),
        improvement: a.improvement ? clean(a.improvement) : undefined,
      })),
      strengths: result.data.strengths?.map(s => ({
        section: s.section,
        text: clean(s.text),
        reason: clean(s.reason),
      })),
      keywords: result.data.keywords,
      summary: result.data.summary ? clean(result.data.summary) : undefined,
    };

    if (userId) {
      try {
        const incrementSuccess = await incrementUsage(userId, 'resume_scan');
        if (!incrementSuccess) {
          console.error('Failed to increment usage for user:', userId);
        }
      } catch (error) {
        console.error('Exception incrementing usage:', error);
      }
    }

    return NextResponse.json(audit, {
      headers: {
        'Cache-Control': 'private, max-age=3600',
      }
    });
  } catch (error: any) {
    console.error("Error processing resume:", error);

    return NextResponse.json(
      {
        error: "Failed to analyze resume",
        message: error.message || "Unknown error",
        code: error.code || "UNKNOWN_ERROR"
      },
      { status: error.status || 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}