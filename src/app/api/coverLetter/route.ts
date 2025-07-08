// app/api/coverLetter/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { checkUsageLimit, incrementUsage } from "../../lib/usageTracker";

const SYSTEM_PROMPT = `
You are a professional cover-letter ghostwriter. Follow these steps:
0) Add this to the TOP

Your Name  
Your Address  
City, State ZIP  
Email • Phone  
Date  

Hiring Manager Name  
{{company}}  
Company Address  
City, State ZIP  

1) From the resume text I provide, automatically select the 3–5 most impressive accomplishments or metrics.
2) Craft a narrative-style cover letter with:
   • An engaging opening paragraph that mentions the company name and why you admire their mission.
   • Two body paragraphs weaving in those extracted accomplishments (no bullet points, just prose).
   • A confident closing paragraph with a call to action.
3) Use the "Tone" I specify (e.g., Professional, Enthusiastic, Concise).
4) Do NOT include placeholders or repeat the resume verbatim; transform the content into a cohesive story.

Output only the cover letter text—no JSON wrapper, no extra commentary.
`.trim();

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000
});

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { resume, jobTitle, company, jobDesc, tone, userId } = body;

    // Validate required fields
    if (
      typeof resume !== "string" ||
      typeof jobTitle !== "string" ||
      typeof company !== "string" ||
      typeof tone !== "string"
    ) {
      return NextResponse.json(
        { error: "Missing required fields: resume, jobTitle, company, tone" },
        { status: 400 }
      );
    }

    // Validate minimum resume length
    if (resume.trim().length < 100) {
      return NextResponse.json(
        { error: "Please provide at least 100 characters of resume text." },
        { status: 400 }
      );
    }

    // Check usage limits if user is authenticated
    if (userId) {
      const usageCheck = await checkUsageLimit(userId, 'cover_letter');
      if (!usageCheck.allowed) {
        return NextResponse.json(
          {
            error: "Usage limit reached. You've used all cover letters for this month.",
            limit: usageCheck.limit,
            remaining: usageCheck.remaining,
            plan: usageCheck.plan
          },
          { status: 429 }
        );
      }
    }

    // Prepare the user content for OpenAI
    const userContent = `
Resume Text:
${resume.trim()}

Role: ${jobTitle.trim()}
Company: ${company.trim()}
Job Description:
${jobDesc?.trim() || "(none provided)"}

Tone: ${tone.trim()}
`.trim();

    // Call OpenAI API
    let coverLetter: string;
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.7,
        max_tokens: 1000,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      });

      coverLetter = completion.choices[0].message?.content?.trim() || "";
      
      if (!coverLetter) {
        throw new Error("OpenAI returned empty response");
      }
    } catch (err: any) {
      console.error("OpenAI error:", err);
      return NextResponse.json(
        { 
          error: "Failed to generate cover letter",
          message: err.message || "Unknown OpenAI error"
        },
        { status: 500 }
      );
    }

    // Increment usage AFTER successful processing
    if (userId) {
      const incrementSuccess = await incrementUsage(userId, 'cover_letter');
      if (!incrementSuccess) {
        console.warn("Failed to increment usage for user:", userId);
        // Don't fail the request, just log the warning
      }
    }

    return NextResponse.json({ 
      coverLetter,
      success: true 
    }, {
      headers: {
        'Cache-Control': 'private, max-age=1800', // 30 minutes
      }
    });

  } catch (error: any) {
    console.error("Error processing cover letter request:", error);
    return NextResponse.json(
      {
        error: "Failed to generate cover letter",
        message: error.message || "Unknown error",
        code: error.code || "UNKNOWN_ERROR"
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
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