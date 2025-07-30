import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { rateLimit } from "../../lib/rate-limit";
import { checkUsageLimit, incrementUsage } from "../../lib/usageTracker";
import { ErrorTypes, handleAPIError, validateRequest, validateContentLength } from "../../lib/errorHandler";

// Extended sections to cover more resume types
const Section = z.enum([
  "Education",
  "Skills",
  "Experience",
  "Projects",
  "Summary",
  "Certifications",
  "Publications",
  "Awards",
  "Volunteer",
  "Languages",
  "Interests",
  "References",
  "Other"
]);

// Additional schema for format issues
const FormatIssueSchema = z.object({
  type: z.enum(["spacing", "consistency", "readability", "ats_compatibility", "visual_hierarchy"]),
  description: z.string(),
  severity: z.enum(["low", "medium", "high"]),
  location: z.string().optional(),
});

// Enhanced issue schema with better categorization
const IssueSchema = z.object({
  section: Section,
  line: z.string().min(5),
  text: z.string().min(10),
  severity: z.enum(["low", "medium", "high"]),
  category: z.enum(["content", "format", "ats", "keyword", "structure"]),
  reason: z.string().min(10).optional(),
});

const ActionSchema = z.object({
  section: Section,
  original: z.string().min(5),
  rewrite: z.string().min(20),
  improvement: z.string().min(10).optional(),
  impact: z.enum(["high", "medium", "low"]), // Priority of this change
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
  density: z.number().optional(), // Keyword density percentage
});

// New schema for parsed structure
const ParsedStructureSchema = z.object({
  contactInfo: z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    linkedin: z.string().optional(),
    portfolio: z.string().optional(),
  }).optional(),
  sections: z.array(z.object({
    name: z.string(),
    content: z.string(),
    order: z.number(),
  })),
  metrics: z.object({
    totalWords: z.number(),
    bulletPoints: z.number(),
    quantifiedAchievements: z.number(),
    actionVerbs: z.number(),
  }),
});

// Simplified audit schema for faster processing
const SimpleAuditSchema = z.object({
  score: z.number().int().min(0).max(100),
  issues: z.array(z.object({
    section: z.string(), // More flexible - any string
    line: z.string(),
    text: z.string(),
    severity: z.enum(["low", "medium", "high"]),
    category: z.string(), // More flexible - any string
  })),
  actions: z.array(z.object({
    section: z.string(), // More flexible - any string
    original: z.string(),
    rewrite: z.string(),
  })),
  strengths: z.array(z.object({
    section: z.string(), // More flexible - any string
    text: z.string(),
    reason: z.string(),
  })).optional(),
  summary: z.string().optional(),
});

// Enhanced audit schema
const AuditSchema = z.object({
  score: z.number().int().min(0).max(100),
  subscores: z.object({
    content: z.number().min(0).max(100),
    formatting: z.number().min(0).max(100),
    ats: z.number().min(0).max(100),
    keywords: z.number().min(0).max(100),
  }).optional(),
  issues: z.array(IssueSchema).max(15), // Increased limit
  formatIssues: z.array(FormatIssueSchema).optional(),
  actions: z.array(ActionSchema).max(15),
  strengths: z.array(StrengthSchema).max(5).optional(),
  keywords: z.array(KeywordSchema).max(5).optional(),
  parsedStructure: ParsedStructureSchema.optional(),
  summary: z.string().min(50).max(500).optional(),
  targetRole: z.string().optional(), // Detected target role
  experienceLevel: z.enum(["entry", "mid", "senior", "executive"]).optional(),
  metadata: z.object({
    analyzedAt: z.string(),
    detectedFormat: z.string(),
    bulletStyle: z.string(),
    sectionsFound: z.number(),
  }).optional(),
});

type Audit = z.infer<typeof AuditSchema>;

// Simplified prompt for faster processing
const SIMPLE_PROMPT = `
You are a resume analysis expert. Analyze this resume and return ONLY valid JSON.

Score the resume 0-100 based on:
- Content quality (clear achievements, quantified results)
- ATS compatibility (no tables with pipes |, readable format)
- Professional presentation

Return this exact JSON structure:

{
  "score": 75,
  "issues": [
    {
      "section": "Experience",
      "line": "exact text from resume",
      "text": "description of issue", 
      "severity": "high",
      "category": "content"
    }
  ],
  "actions": [
    {
      "section": "Experience",
      "original": "exact text to replace",
      "rewrite": "improved version"
    }
  ],
  "strengths": [
    {
      "section": "Experience",
      "text": "what works well",
      "reason": "why it's good"
    }
  ],
  "summary": "Brief overall assessment"
}

Keep arrays small (max 5 items each). Focus on the most important issues only.
`.trim();

// Enhanced prompt with better parsing instructions and scoring methodology
const ENHANCED_PROMPT = `
You are a world-class resume coach with expertise in ATS optimization, visual design, and industry best practices.
Analyze the resume comprehensively, considering both content and implied formatting.

First, intelligently parse the resume to identify:
1. Contact information (name, email, phone, location, LinkedIn, portfolio)
2. All sections, including non-standard ones
3. Formatting patterns (bullet points, dashes, asterisks)
4. Date formats and consistency
5. Quantified achievements vs vague statements
6. Action verbs usage
7. Technical skills and tools mentioned
8. Industry-specific keywords

SCORING METHODOLOGY:
Calculate the overall score using this weighted system:

Base Score Calculation:
- Start with 100 points
- Deduct points based on issues:
  • HIGH severity: -15 to -20 points each
  • MEDIUM severity: -5 to -10 points each  
  • LOW severity: -2 to -3 points each

Score Components (weights):
1. ATS Compatibility (30%):
   - Table formats: -20 points
   - Graphics/images: -15 points
   - Special characters: -10 points
   - Non-standard fonts: -10 points
   - Headers/footers: -15 points

2. Content Quality (25%):
   - No quantified achievements: -15 points
   - Vague job descriptions: -10 points
   - Missing action verbs: -5 points
   - Poor grammar/spelling: -20 points

3. Keyword Optimization (20%):
   - <30% relevant keywords: -15 points
   - Missing critical skills: -10 points
   - Keyword stuffing: -10 points

4. Structure & Format (15%):
   - Poor section order: -10 points
   - Inconsistent formatting: -5 points
   - Too long (>2 pages early career): -10 points
   - Hard to scan quickly: -10 points

5. Completeness (10%):
   - Missing contact info: -20 points
   - No dates on positions: -15 points
   - Gaps unexplained: -10 points

Score Ranges:
- 90-100: Exceptional - Ready to submit
- 80-89: Strong - Minor tweaks needed
- 70-79: Good - Some improvements recommended
- 60-69: Fair - Significant improvements needed
- 50-59: Needs Work - Major revision required
- Below 50: Poor - Complete overhaul needed

CRITICAL: Any single HIGH severity ATS issue should cap the score at 75 maximum.

Then produce **ONLY** valid JSON with this EXACT structure:

{
  "score": <0–100 overall score>,
  "subscores": {
    "content": <0-100 for content quality>,
    "formatting": <0-100 for format/structure>,
    "ats": <0-100 for ATS compatibility>,
    "keywords": <0-100 for keyword optimization>
  },
  "issues": [
    {
      "section": <MUST be one of: "Education", "Skills", "Experience", "Projects", "Summary", "Certifications", "Publications", "Awards", "Volunteer", "Languages", "Interests", "References", "Other">,
      "line": <exact text snippet from resume>,
      "text": <clear explanation of the issue>,
      "severity": <MUST be: "low" OR "medium" OR "high">,
      "category": <MUST be: "content" OR "format" OR "ats" OR "keyword" OR "structure">,
      "reason": <why this matters>
    }
  ],
  "formatIssues": [
    {
      "type": <MUST be: "spacing" OR "consistency" OR "readability" OR "ats_compatibility" OR "visual_hierarchy">,
      "description": <what formatting issue was detected>,
      "severity": <MUST be: "low" OR "medium" OR "high">,
      "location": <where in the resume>
    }
  ],
  "actions": [
    {
      "section": <MUST be one of the valid sections listed above>,
      "original": <exact text to replace>,
      "rewrite": <improved version with metrics and impact>,
      "improvement": <what was improved>,
      "impact": <MUST be: "high" OR "medium" OR "low">
    }
  ],
  "strengths": [
    {
      "section": <MUST be one of the valid sections>,
      "text": <what the candidate is doing well>,
      "reason": <why this is effective>
    }
  ],
  "keywords": [
    {
      "category": <like "Technical", "Soft Skills", "Industry", "Tools">,
      "terms": <array of strings, e.g. ["Python", "Java", "SQL"]>,
      "missing": <array of strings, e.g. ["Docker", "Kubernetes"]>,
      "density": <number between 0 and 1, e.g. 0.15>
    }
  ],
  "parsedStructure": {
    "contactInfo": {
      "name": <string or null>,
      "email": <string or null>,
      "phone": <string or null>,
      "location": <string or null>,
      "linkedin": <string or null>,
      "portfolio": <string or null>
    },
    "sections": [
      {
        "name": <section name as string>,
        "content": <section content as string>,
        "order": <number starting from 1>
      }
    ],
    "metrics": {
      "totalWords": <integer>,
      "bulletPoints": <integer>,
      "quantifiedAchievements": <integer>,
      "actionVerbs": <integer>
    }
  },
  "summary": <executive summary string>,
  "targetRole": <detected or inferred target role string>,
  "experienceLevel": <MUST be: "entry" OR "mid" OR "senior" OR "executive">
}

CRITICAL RULES:
• For sections, if it doesn't fit the standard categories, use "Other"
• ALL arrays must be arrays, even if empty: use [] not null
• ALL optional fields can be omitted entirely, but if included must have the correct type
• For keywords.terms and keywords.missing, these MUST be arrays of strings, not objects
• Ensure all enum values match exactly (case-sensitive)
• Numbers should be actual numbers, not strings
• IMPORTANT: Table format means actual tables with | pipes or grid structures, NOT simple text on one line
• Always include at least 3-5 strengths if the resume has any positive aspects
• Always include at least 3-4 keyword categories with actual keywords found
• The "rewrite" MUST directly address the issue mentioned - if the issue is about dates, the rewrite must fix the dates
• "Resolved", "Developed", "Implemented", "Enhanced" are STRONG action verbs - do not flag them as weak
• Only flag truly weak verbs like "Responsible for", "Duties included", "Helped with", "Assisted"

Table Format Examples:
- ACTUAL TABLE: "Company | Role | Date" with pipes
- NOT A TABLE: "Company July 2024 - Sept 2024 Software Engineer New York"
- ACTUAL TABLE: Multiple columns separated by excessive spaces trying to align
- NOT A TABLE: Standard one-line format with company, dates, role, location

Action Verb Guidelines:
STRONG verbs (DO NOT flag as weak):
- Resolved, Developed, Implemented, Enhanced, Optimized, Designed, Built, Launched, Led, Managed, Achieved, Delivered, Transformed, Established, Streamlined

WEAK verbs (OK to flag):
- Responsible for, Helped, Assisted, Participated, Involved in, Duties included, Tasks involved

Rewrite Matching Rules:
- If issue is about DATE FORMAT → rewrite must show corrected date format
- If issue is about METRICS → rewrite must add specific numbers/percentages
- If issue is about CLARITY → rewrite must clarify the vague parts
- NEVER mix up rewrites - each rewrite must match its corresponding issue

Parsing Rules:
• Detect sections even with non-standard headers
• Identify formatting issues from text patterns
• Look for ATS-breaking elements (tables indicated by pipes |, special unicode characters)
• Check date format consistency (MM/YYYY vs Month YYYY)
• Identify missing crucial information (dates, locations, metrics)
• Detect poor bullet point structure (starting with "Responsible for" vs action verbs)
• Calculate keyword density for technical terms
• Identify industry and role from content

Content Analysis Rules:
• Every achievement should have metrics (numbers, percentages, timeframes)
• Prioritize recent and relevant experience
• Flag generic descriptions lacking specificity
• Ensure consistent verb tenses (past for previous, present for current)
• Check for result-oriented statements vs task lists

Minimum Requirements:
• Include at least 3-5 strengths unless the resume is truly terrible
• Include at least 3-4 keyword categories (Technical, Soft Skills, Industry, Tools)
• For each keyword category, list at least 3-5 actual terms found in the resume
• Don't flag standard one-line job headers as "table format"
• Only flag ACTUAL tables (with pipes |, tabs, or grid alignment)
`.trim();

// Helper function to pre-process resume text
function preprocessResume(text: string): {
  processedText: string;
  detectedFormat: string;
  bulletStyle: string;
} {
  // Detect bullet point style
  const bulletStyles = {
    dash: /-\s+/g,
    asterisk: /\*\s+/g,
    bullet: /•\s+/g,
    arrow: /→\s+/g,
    number: /^\d+\.\s+/gm,
  };

  let bulletStyle = 'none';
  let maxCount = 0;

  for (const [style, regex] of Object.entries(bulletStyles)) {
    const matches = text.match(regex);
    if (matches && matches.length > maxCount) {
      maxCount = matches.length;
      bulletStyle = style;
    }
  }

  // Detect format indicators
  const hasMarkdown = /[*_~`#]/.test(text);
  const hasHTML = /<[^>]+>/.test(text);
  const hasPipes = /\|/.test(text); // Possible table

  let detectedFormat = 'plain';
  if (hasMarkdown) detectedFormat = 'markdown';
  if (hasHTML) detectedFormat = 'html';
  if (hasPipes) detectedFormat = 'table';

  // Normalize line breaks and spacing
  let processedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { processedText, detectedFormat, bulletStyle };
}

// Helper to extract section headers
function detectSections(text: string): string[] {
  const commonHeaders = [
    'experience', 'education', 'skills', 'summary', 'objective',
    'projects', 'certifications', 'awards', 'publications',
    'volunteer', 'languages', 'interests', 'references',
    'professional experience', 'work history', 'employment',
    'technical skills', 'core competencies', 'achievements'
  ];

  const lines = text.split('\n');
  const detectedSections: string[] = [];

  for (const line of lines) {
    const cleaned = line.trim().toLowerCase();
    // Check if line might be a header (short, possibly all caps, matches common headers)
    if (cleaned.length < 50 &&
      (line.trim() === line.trim().toUpperCase() ||
        commonHeaders.some(h => cleaned.includes(h)))) {
      detectedSections.push(line.trim());
    }
  }

  return detectedSections;
}

// Only create OpenAI client if API key is available
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 120000, // Increased to 2 minutes
    maxRetries: 0, // We'll handle retries manually
  })
  : null;

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const { success, limit, remaining } = await rateLimit(ip);

    if (!success) {
      const retryMinutes = Math.ceil((limit - remaining) / 10); // Estimate retry time
      const rateLimitError = ErrorTypes.RATE_LIMIT_EXCEEDED(retryMinutes);
      return NextResponse.json(
        {
          error: rateLimitError.message,
          details: {
            message: rateLimitError.message,
            code: rateLimitError.code,
            action: rateLimitError.action,
            retryAfter: rateLimitError.retryAfter
          },
          timestamp: new Date().toISOString()
        },
        {
          status: rateLimitError.status,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "Retry-After": (rateLimitError.retryAfter || 300).toString()
          }
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { resume, options, userId, format } = body;

    // Validate required fields
    const validationError = validateRequest(body, ['resume']);
    if (validationError) {
      return handleAPIError(validationError);
    }

    // Validate resume content length with specific guidance
    const contentError = validateContentLength(
      resume,
      'Resume',
      200,
      'Add more details about your experience, skills, and achievements.'
    );
    if (contentError) {
      return handleAPIError(contentError);
    }

    if (userId) {
      try {
        const usageCheck = await checkUsageLimit(userId, 'resume_scan');

        if (!usageCheck.allowed) {
          const usageError = ErrorTypes.USAGE_LIMIT_REACHED('resume scans', usageCheck.plan);
          return NextResponse.json(
            {
              error: usageError.message,
              details: {
                message: usageError.message,
                code: usageError.code,
                action: usageError.action,
                limit: usageCheck.limit,
                remaining: usageCheck.remaining,
                plan: usageCheck.plan
              },
              timestamp: new Date().toISOString()
            },
            { status: usageError.status }
          );
        }
      } catch (error) {
        console.error('Exception in usage checking:', error);
        const trackingError = ErrorTypes.USAGE_TRACKING_ERROR();
        return handleAPIError(trackingError);
      }
    }

    // Pre-process the resume
    const { processedText, detectedFormat, bulletStyle } = preprocessResume(resume);
    const detectedSections = detectSections(processedText);

    // Enhance prompt with detected information
    let enhancedPrompt = SIMPLE_PROMPT;
    enhancedPrompt += `\n\nDetected Information:`;
    enhancedPrompt += `\n- Format: ${format || detectedFormat}`;
    enhancedPrompt += `\n- Bullet Style: ${bulletStyle}`;
    enhancedPrompt += `\n- Detected Sections: ${detectedSections.join(', ')}`;

    if (options?.focusArea) {
      enhancedPrompt += `\n\nPay special attention to the "${options.focusArea}" section.`;
    }

    if (options?.targetRole) {
      enhancedPrompt += `\n\nOptimize for this target role: ${options.targetRole}`;
    }

    const model = options?.model || "gpt-4o-mini";
    const temperature = options?.temperature || 0.3; // Slightly higher for better parsing

    let raw = "";
    let retries = 0;
    const maxRetries = 1; // Reduce retries to avoid long delays

    if (!openai) {
      const serviceError = ErrorTypes.OPENAI_SERVICE_ERROR();
      return NextResponse.json(
        {
          error: 'AI analysis service is not configured. Please contact support.',
          details: {
            message: serviceError.message,
            code: serviceError.code,
            action: serviceError.action
          },
          timestamp: new Date().toISOString()
        },
        { status: serviceError.status }
      );
    }

    while (retries <= maxRetries) {
      try {
        console.log("Making OpenAI API call with model:", model);
        const gpt = await openai.chat.completions.create({
          model,
          temperature,
          messages: [
            { role: "system", content: enhancedPrompt },
            { role: "user", content: processedText },
          ],
          response_format: { type: "json_object" },
          max_tokens: 1500, // Reduced for faster response
        });

        raw = gpt.choices[0]?.message?.content ?? "";
        console.log("OpenAI response received, length:", raw.length);
        console.log("OpenAI response first 200 chars:", raw.substring(0, 200));
        break;
      } catch (error: any) {
        console.error('OpenAI API error details:', error);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Error type:', error.type);
        if (retries === maxRetries || !error?.isRetryable) {
          throw ErrorTypes.OPENAI_SERVICE_ERROR();
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
      const formatError = ErrorTypes.INVALID_RESPONSE_FORMAT();
      return NextResponse.json({
        error: formatError.message,
        details: {
          message: formatError.message,
          code: formatError.code,
          action: formatError.action,
          raw: raw.substring(0, 200)
        },
        timestamp: new Date().toISOString()
      }, { status: formatError.status });
    }

    const result = SimpleAuditSchema.safeParse(parsed);
    if (!result.success) {
      console.error("Schema validation errors:", result.error.format());
      console.error("Raw parsed data:", JSON.stringify(parsed, null, 2).substring(0, 1000));

      const errors = result.error.issues;
      const errorMessages = errors.map(err =>
        `${err.path.join('.')}: ${err.message}`
      ).join('; ');

      const formatError = ErrorTypes.INVALID_RESPONSE_FORMAT();
      return NextResponse.json(
        {
          error: formatError.message,
          details: {
            message: formatError.message,
            code: formatError.code,
            action: formatError.action,
            validationErrors: errorMessages,
            raw: raw.substring(0, 200)
          },
          timestamp: new Date().toISOString()
        },
        { status: formatError.status }
      );
    }

    // Clean and enhance the audit data
    const clean = (s: string) => s.replace(/\s*[-–—]\s*$/u, "").trim();

    // Post-process to ensure scoring is consistent and fix mismatched rewrites
    const processedData = result.data;

    // Filter out false "table format" issues
    processedData.issues = processedData.issues.filter(issue => {
      // If it's a "table format" issue, check if the line actually contains table indicators
      if (issue.text.toLowerCase().includes('table format')) {
        const hasTableIndicators =
          issue.line.includes('|') ||
          issue.line.split(/\s{4,}/).length > 3 || // Multiple large spaces
          issue.line.includes('\t\t'); // Multiple tabs

        if (!hasTableIndicators) {
          console.log('Filtered out false table format issue:', issue.line);
          return false;
        }
      }

      // Filter out false "weak verb" issues for strong verbs
      const strongVerbs = ['resolved', 'developed', 'implemented', 'enhanced', 'optimized',
        'designed', 'built', 'launched', 'led', 'managed', 'achieved',
        'delivered', 'transformed', 'established', 'streamlined'];

      if (issue.text.toLowerCase().includes('weak') || issue.text.toLowerCase().includes('less impactful')) {
        const firstWord = issue.line.toLowerCase().replace(/[•\-\*]\s*/, '').split(' ')[0];
        if (strongVerbs.includes(firstWord)) {
          console.log('Filtered out false weak verb issue for:', firstWord);
          return false;
        }
      }

      return true;
    });

    // Ensure issues and actions arrays have same length (simplified schema doesn't have impact field)
    const minLength = Math.min(processedData.issues.length, processedData.actions.length);
    processedData.issues = processedData.issues.slice(0, minLength);
    processedData.actions = processedData.actions.slice(0, minLength);

    // Recalculate score if needed based on issues
    const highAtsIssues = processedData.issues.filter(
      i => i.severity === 'high' && i.category.toLowerCase().includes('ats')
    ).length;

    const highIssuesTotal = processedData.issues.filter(i => i.severity === 'high').length;
    const mediumIssuesTotal = processedData.issues.filter(i => i.severity === 'medium').length;

    // Apply score caps
    if (highAtsIssues > 0 && processedData.score > 75) {
      processedData.score = 75; // Cap at 75 for HIGH ATS issues
    }
    if (highIssuesTotal >= 3 && processedData.score > 70) {
      processedData.score = 70; // Cap at 70 for 3+ HIGH issues
    }

    // Convert simplified data to full audit format
    const audit: Audit = {
      score: processedData.score,
      issues: processedData.issues.map((i) => ({
        section: (i.section === "Format" ? "Other" : i.section) as any, // Type assertion for compatibility
        line: clean(i.line),
        text: clean(i.text),
        severity: i.severity,
        category: i.category as any, // Type assertion for compatibility
        reason: undefined, // Simplified schema doesn't include reason
      })),
      actions: processedData.actions.map((a) => ({
        section: (a.section === "Format" ? "Other" : a.section) as any, // Type assertion for compatibility
        original: clean(a.original),
        rewrite: clean(a.rewrite),
        impact: "medium" as const, // Default impact since simplified schema doesn't include it
        improvement: undefined, // Simplified schema doesn't include improvement
      })),
      strengths: processedData.strengths?.map((s) => ({
        section: (s.section === "Format" ? "Other" : s.section) as any, // Type assertion for compatibility
        text: clean(s.text),
        reason: clean(s.reason),
      })) || [],
      summary: processedData.summary || "",
      // Add metadata about the analysis
      metadata: {
        analyzedAt: new Date().toISOString(),
        detectedFormat,
        bulletStyle,
        sectionsFound: detectedSections.length,
      }
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
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  } catch (error: any) {
    console.error("Error processing resume:", error);
    return handleAPIError(error);
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