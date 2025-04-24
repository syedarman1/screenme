// app/api/coverLetter/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

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
3) Use the “Tone” I specify (e.g., Professional, Enthusiastic, Concise).
4) Do NOT include placeholders or repeat the resume verbatim; transform the content into a cohesive story.

Output only the cover letter text—no JSON wrapper, no extra commentary.
`.trim();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  const { resume, jobTitle, company, jobDesc, tone } = await request.json();

  if (
    typeof resume !== "string" ||
    typeof jobTitle !== "string" ||
    typeof company !== "string" ||
    typeof tone !== "string"
  ) {
    return NextResponse.json(
      { error: "Missing one of: resume, jobTitle, company, tone" },
      { status: 400 }
    );
  }

  const userContent = `
Resume Text:
${resume}

Role: ${jobTitle}
Company: ${company}
Job Description:
${jobDesc || "(none provided)"}

Tone: ${tone}
`.trim();

  let coverLetter: string;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.7,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    });
    coverLetter = completion.choices[0].message?.content?.trim() || "";
  } catch (err: any) {
    console.error("OpenAI error:", err);
    return NextResponse.json(
      { error: "Failed to generate cover letter" },
      { status: 500 }
    );
  }

  return NextResponse.json({ coverLetter });
}
