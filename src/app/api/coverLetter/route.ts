// app/api/coverLetter/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { checkUsageLimit, incrementUsage } from "../../lib/usageTracker";
import { ErrorTypes, handleAPIError, validateRequest, validateContentLength } from "../../lib/errorHandler";

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
    const validationError = validateRequest(body, ['resume', 'jobTitle', 'company', 'tone']);
    if (validationError) {
      return handleAPIError(validationError);
    }

    // Validate resume content length with specific guidance
    const contentError = validateContentLength(
      resume,
      'Resume',
      100,
      'Include key experiences, skills, and achievements to create a compelling cover letter.'
    );
    if (contentError) {
      return handleAPIError(contentError);
    }

    // Validate job title length
    if (jobTitle.trim().length < 3) {
      const titleError = ErrorTypes.CONTENT_TOO_SHORT(
        'Job title',
        3,
        'Enter the full job title (e.g., "Senior Software Engineer").'
      );
      return handleAPIError(titleError);
    }

    // Validate company name
    if (company.trim().length < 2) {
      const companyError = ErrorTypes.CONTENT_TOO_SHORT(
        'Company name',
        2,
        'Enter the full company name.'
      );
      return handleAPIError(companyError);
    }

    // Check usage limits if user is authenticated
    if (userId) {
      const usageCheck = await checkUsageLimit(userId, 'cover_letter');
      if (!usageCheck.allowed) {
        const usageError = ErrorTypes.USAGE_LIMIT_REACHED('cover letters', usageCheck.plan);
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
        throw ErrorTypes.OPENAI_SERVICE_ERROR();
      }
    } catch (err: any) {
      console.error("OpenAI error:", err);
      
      // Check for specific OpenAI error types
      if (err.message?.includes('rate limit') || err.message?.includes('quota')) {
        const rateLimitError = ErrorTypes.OPENAI_SERVICE_ERROR();
        return NextResponse.json(
          {
            error: 'Cover letter generation temporarily unavailable due to high demand. Please try again in a few minutes.',
            details: {
              message: 'Service temporarily overloaded',
              code: 'OPENAI_RATE_LIMITED',
              action: 'Wait 2-3 minutes and try generating your cover letter again.'
            },
            timestamp: new Date().toISOString()
          },
          { status: 503 }
        );
      }
      
      const serviceError = ErrorTypes.OPENAI_SERVICE_ERROR();
      return handleAPIError(serviceError);
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
    return handleAPIError(error);
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