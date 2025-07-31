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
  impact: z.enum(["high", "medium", "low"]), 
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
  density: z.number().optional(), 
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
    section: z.string(), 
    line: z.string(),
    text: z.string(),
    severity: z.enum(["low", "medium", "high"]),
    category: z.string(), 
  })),
  actions: z.array(z.object({
    section: z.string(), 
    original: z.string(),
    rewrite: z.string(),
  })),
  strengths: z.array(z.object({
    section: z.string(), 
    text: z.string(),
    reason: z.string(),
  })).optional(),
  keywords: z.array(z.object({
    category: z.string(),
    terms: z.array(z.string()),
    missing: z.array(z.string()).optional(),
    density: z.number().optional(),
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
  issues: z.array(IssueSchema).max(15), 
  formatIssues: z.array(FormatIssueSchema).optional(),
  actions: z.array(ActionSchema).max(15),
  strengths: z.array(StrengthSchema).max(5).optional(),
  keywords: z.array(KeywordSchema).max(5).optional(),
  parsedStructure: ParsedStructureSchema.optional(),
  summary: z.string().min(50).max(500).optional(),
  targetRole: z.string().optional(), 
  experienceLevel: z.enum(["entry", "mid", "senior", "executive"]).optional(),
  metadata: z.object({
    analyzedAt: z.string(),
    detectedFormat: z.string(),
    bulletStyle: z.string(),
    sectionsFound: z.number(),
  }).optional(),
});

type Audit = z.infer<typeof AuditSchema>;

// Optimized prompt for better accuracy and performance
const OPTIMIZED_PROMPT = `
Analyze this resume and return ONLY valid JSON. Focus on actionable improvements for ANY industry or role.

SCORING METHOD:
- Start at 100 points
- HIGH severity: -12 points
- MEDIUM severity: -4 points  
- LOW severity: -2 points

UNIVERSAL ANALYSIS CRITERIA:

1. **METRICS ENHANCEMENT**: Look for measurable impact opportunities
   - Identify statements that could benefit from numbers, percentages, timeframes, or scale
   - Suggest adding context like "increased efficiency by X%", "managed team of X people", "served X customers"
   - NEVER fabricate specific numbers - only suggest where metrics could reasonably be added

2. **ACTION VERB OPTIMIZATION**: Flag weak verbs and suggest stronger alternatives
   - Weak verbs to flag: "Responsible for", "Helped", "Assisted", "Duties included", "Worked on", "Involved in"
   - Strong verbs (don't flag): Led, Developed, Implemented, Enhanced, Built, Designed, Achieved, Boosted, Increased, Improved, Managed, Created, Established, Streamlined, Delivered, Transformed, Executed, Spearheaded, Pioneered, Drove, Facilitated, Resolved, Optimized, Launched, Constructed, Trained, Performed, Deployed, Integrated, Leveraged, Engineered, Architected, Crafted

3. **SPECIFICITY IMPROVEMENT**: Turn vague statements into concrete accomplishments
   - Look for generic terms like "various", "many", "several", "helped with"
   - Suggest adding scope, tools used, outcomes, or business context
   - Focus on making statements more concrete without inventing details

4. **FORMATTING CONSISTENCY**: Detect and unify formatting issues
   - Inconsistent bullet styles, date formats, spacing
   - Table formats with pipes (|) that may not be ATS-friendly
   - Inconsistent section headers or indentation

5. **KEYWORD OPTIMIZATION**: Extract ALL keywords found in the resume
   - Extract EVERY technical skill, tool, technology, methodology, and competency mentioned
   - Categorize them properly (Technical Skills, Tools, Methodologies, Soft Skills, etc.)
   - Identify missing industry-agnostic keywords: "project management", "cross-functional collaboration", "process improvement", "stakeholder management", "strategic planning", "team leadership", "problem solving", "communication", "analytics", "quality assurance"

6. **STRUCTURE ENHANCEMENT**: Ensure logical flow and clear organization
   - Check section order (Contact → Summary → Experience → Education → Skills → Other)
   - Ensure every issue has a matching action item
   - Verify clear headings and consistent formatting

COMMON SECTIONS TO ANALYZE:
- Experience, Education, Skills, Certifications, Awards, Summary, Volunteer, Languages, Interests, References, Other

STRENGTHS ANALYSIS:
- List SPECIFIC strengths found in the resume with exact examples
- Include strong action verbs, quantified achievements, relevant skills, good formatting, etc.
- Provide concrete examples from the resume content

CRITICAL RULES:
- NEVER fabricate specific numbers, metrics, or information not implied by the original text
- Only suggest improvements that are reasonable and accurate
- **CRITICAL: The "original" text MUST be the COMPLETE original text from the resume, not a summary or truncated version**
- **CRITICAL: Copy the EXACT original text as it appears in the resume, including all details, context, and full sentences**
- Focus on constructive feedback without making up data
- Each issue MUST have a matching action with the same original text
- Limit to 5 most important issues
- Extract ALL keywords mentioned in the resume, not just some

RETURN THIS EXACT STRUCTURE:
{
  "score": 75,
  "issues": [
    {
      "section": "Experience",
      "line": "Resolved 50+ front-end issues in JavaScript by collaborating with teams, implementing advanced code refactoring strategies and DOM optimization techniques, resulting in enhanced performance and responsiveness across platforms for 10,000+ users",
      "text": "Missing context on the impact of resolving issues on overall project success",
      "severity": "high",
      "category": "content"
    }
  ],
  "actions": [
    {
      "section": "Experience",
      "original": "Resolved 50+ front-end issues in JavaScript by collaborating with teams, implementing advanced code refactoring strategies and DOM optimization techniques, resulting in enhanced performance and responsiveness across platforms for 10,000+ users",
      "rewrite": "Resolved 50+ front-end issues in JavaScript by collaborating with teams, implementing advanced code refactoring strategies and DOM optimization techniques, resulting in enhanced performance and responsiveness across platforms for 10,000+ users, contributing to overall project success"
    }
  ],
  "strengths": [
    {
      "section": "Skills",
      "text": "Strong technical skills section with React, Node.js, and AWS",
      "reason": "Lists relevant technologies with clear categorization and includes cloud platform experience"
    }
  ],
  "keywords": [
    {
      "category": "Technical Skills",
      "terms": ["Python", "React", "AWS", "Node.js", "JavaScript", "TypeScript", "Docker", "Git"],
      "missing": ["CI/CD", "Agile", "Project Management"]
    }
  ],
  "summary": "Resume needs quantified achievements and stronger action verbs. Good technical foundation but lacks measurable impact."
}
`.trim();

// Helper function to pre-process resume text
function preprocessResume(text: string): {
  processedText: string;
  detectedFormat: string;
  bulletStyle: string;
} {
  
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
  const hasPipes = /\|/.test(text); 

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
    if (cleaned.length < 50 &&
      (line.trim() === line.trim().toUpperCase() ||
        commonHeaders.some(h => cleaned.includes(h)))) {
      detectedSections.push(line.trim());
    }
  }

  return detectedSections;
}

// Helper to extract keywords from resume text
function extractKeywordsFromText(text: string): { category: string; terms: string[] }[] {
  const keywords: { category: string; terms: string[] }[] = [];
  
  // Common technical skills and tools
  const technicalSkills = [
    // Programming Languages
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin', 'Scala',
    // Web Technologies
    'HTML', 'CSS', 'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Django', 'Flask', 'Spring', 'ASP.NET',
    // Databases
    'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Oracle', 'SQLite', 'Cassandra',
    // Cloud & DevOps
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Jenkins', 'GitLab', 'GitHub', 'CI/CD', 'Terraform', 'Ansible',
    // Data & AI
    'Machine Learning', 'Data Science', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Scikit-learn', 'Tableau', 'Power BI',
    // Other Tools
    'Git', 'Jira', 'Confluence', 'Slack', 'Figma', 'Adobe Creative Suite', 'Microsoft Office', 'Excel', 'PowerPoint'
  ];
  
  // Soft skills and methodologies
  const softSkills = [
    'Leadership', 'Communication', 'Team Management', 'Project Management', 'Problem Solving', 'Critical Thinking',
    'Agile', 'Scrum', 'Kanban', 'Waterfall', 'Lean', 'Six Sigma', 'Customer Service', 'Sales', 'Marketing',
    'Strategic Planning', 'Business Development', 'Financial Analysis', 'Risk Management', 'Quality Assurance'
  ];
  
  // Extract technical skills
  const foundTechnical = technicalSkills.filter(skill => 
    text.toLowerCase().includes(skill.toLowerCase())
  );
  
  // Extract soft skills
  const foundSoft = softSkills.filter(skill => 
    text.toLowerCase().includes(skill.toLowerCase())
  );
  
  if (foundTechnical.length > 0) {
    keywords.push({
      category: 'Technical Skills',
      terms: foundTechnical
    });
  }
  
  if (foundSoft.length > 0) {
    keywords.push({
      category: 'Soft Skills & Methodologies',
      terms: foundSoft
    });
  }
  
  return keywords;
}

// Helper to extract bullet points from resume text
function extractBulletPoints(text: string): string[] {
  const bulletPoints: string[] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Look for lines that start with bullet points or are likely bullet points
    if (trimmed.match(/^[•\-\*→]\s+/) || 
        (trimmed.length > 20 && trimmed.length < 200 && !trimmed.match(/^[A-Z][a-z]+:/))) {
      bulletPoints.push(trimmed);
    }
  }
  
  return bulletPoints;
}

// Helper to validate that original text matches resume content
function validateOriginalText(originalText: string, resumeText: string): string {
  // Check if the original text is a truncated version of something in the resume
  const normalizedOriginal = originalText.toLowerCase().trim();
  const normalizedResume = resumeText.toLowerCase();
  
  // If the original text is found exactly in the resume, return it as is
  if (normalizedResume.includes(normalizedOriginal)) {
    return originalText;
  }
  
  // Look for a longer version that contains the original text
  const lines = resumeText.split('\n');
  for (const line of lines) {
    const normalizedLine = line.toLowerCase().trim();
    if (normalizedLine.includes(normalizedOriginal) && normalizedLine.length > normalizedOriginal.length) {
      // Found a longer version, return the actual line from resume
      return line.trim();
    }
  }
  
  // Also check against extracted bullet points
  const bulletPoints = extractBulletPoints(resumeText);
  for (const bullet of bulletPoints) {
    const normalizedBullet = bullet.toLowerCase().trim();
    if (normalizedBullet.includes(normalizedOriginal) && normalizedBullet.length > normalizedOriginal.length) {
      // Found a longer version in bullet points, return the actual bullet
      return bullet;
    }
  }
  
  // If no match found, return the original (this might be a legitimate short statement)
  return originalText;
}

// Helper to validate and fix issue-action pairs
function validateIssueActionPairs(issues: any[], actions: any[], resumeText: string): { issues: any[], actions: any[] } {
  // Ensure same length
  const minLength = Math.min(issues.length, actions.length);
  issues = issues.slice(0, minLength);
  actions = actions.slice(0, minLength);

  actions = actions.map((action, index) => {
    const issue = issues[index];
    
    
    if (action.original !== issue.line) {
      action.original = issue.line;
    }
    
    
    const validatedOriginal = validateOriginalText(action.original, resumeText);
    action.original = validatedOriginal;
    issue.line = validatedOriginal;
    
 
    if (action.rewrite === action.original || action.rewrite.length < action.original.length) {
      
      action.rewrite = action.original;
    }
    
    return action;
  });

  return { issues, actions };
}

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 60000, 
    maxRetries: 1, 
  })
  : null;

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const { success, limit, remaining } = await rateLimit(ip);

    if (!success) {
      const retryMinutes = Math.ceil((limit - remaining) / 10); 
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

    // Quick validation for very short resumes
    if (processedText.length < 100) {
      return NextResponse.json({
        score: 0,
        issues: [{
          section: "Other",
          line: "Resume content",
          text: "Resume is too brief for meaningful analysis",
          severity: "high",
          category: "content"
        }],
        actions: [{
          section: "Other",
          original: "Resume content",
          rewrite: "Add detailed work experience, education, skills, and achievements sections"
        }],
        strengths: [],
        summary: "Resume needs substantial content for proper analysis",
        metadata: {
          analyzedAt: new Date().toISOString(),
          detectedFormat,
          bulletStyle,
          sectionsFound: detectedSections.length,
        }
      });
    }

    // Build the prompt
    let enhancedPrompt = OPTIMIZED_PROMPT;
    
    if (options?.targetRole) {
      enhancedPrompt += `\n\nTarget Role: ${options.targetRole}`;
      enhancedPrompt += `\nPrioritize skills and experience relevant to this role.`;
    }

    const model = options?.model || "gpt-4o-mini"; // Better for analysis tasks
    const temperature = options?.temperature || 0.2; // Keep low for consistency

    let raw = "";

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

    try {
      
      // Add timeout to prevent hanging - 45 seconds should be sufficient
      const gptPromise = openai.chat.completions.create({
        model,
        temperature,
        messages: [
          { role: "system", content: enhancedPrompt },
          { role: "user", content: processedText },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000, // Increased to handle longer responses with complete original text
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI timeout')), 45000) 
      );

      const gpt = await Promise.race([gptPromise, timeoutPromise]) as any;
      
      raw = gpt.choices[0]?.message?.content ?? "";
      
    } catch (error: any) {
      console.error('OpenAI API error:', error);
      
      if (error.message === 'OpenAI timeout') {
        const timeoutError = ErrorTypes.PROCESSING_ERROR('analyze resume due to timeout. Please try again.');
        return handleAPIError(timeoutError);
      }
      
      // Check for rate limiting
      if (error.status === 429 || error.message?.includes('rate limit')) {
        const rateLimitError = ErrorTypes.OPENAI_SERVICE_ERROR();
        return NextResponse.json(
          {
            error: 'Service is experiencing high demand. Please try again in a moment.',
            details: {
              message: rateLimitError.message,
              code: 'SERVICE_BUSY',
              action: 'Wait 30 seconds and try again.'
            },
            timestamp: new Date().toISOString()
          },
          { status: 503 }
        );
      }
      
      throw ErrorTypes.OPENAI_SERVICE_ERROR();
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

    // Clean and validate the data
    const processedData = result.data;

    // Validate and fix issue-action pairs
    const { issues: validatedIssues, actions: validatedActions } = validateIssueActionPairs(
      processedData.issues,
      processedData.actions,
      processedText
    );
    
    processedData.issues = validatedIssues;
    processedData.actions = validatedActions;

         // Smart filtering - keep constructive feedback while removing obvious false positives
     processedData.issues = processedData.issues.filter((issue, index) => {
       // Remove false "table format" issues
       if (issue.text.toLowerCase().includes('table format') && !issue.line.includes('|')) {
         processedData.actions.splice(index, 1);
         return false;
       }

       // Remove false "weak verb" issues for clearly strong verbs
       const strongVerbs = ['resolved', 'developed', 'implemented', 'enhanced', 'optimized',
         'designed', 'built', 'launched', 'led', 'managed', 'achieved',
         'delivered', 'transformed', 'established', 'streamlined', 'created',
         'executed', 'spearheaded', 'pioneered', 'drove', 'facilitated', 'boosted',
         'increased', 'improved', 'constructed', 'trained', 'performed', 'deployed',
         'integrated', 'leveraged', 'engineered', 'architected', 'crafted'];

       const firstWord = issue.line.toLowerCase().replace(/^[•\-\*]\s*/, '').split(/\s+/)[0];
       if ((issue.text.toLowerCase().includes('weak') || issue.text.toLowerCase().includes('action verb')) 
           && strongVerbs.includes(firstWord)) {
         processedData.actions.splice(index, 1);
         return false;
       }

       // Keep constructive feedback but ensure accuracy
       if (issue.text.toLowerCase().includes('metric') || issue.text.toLowerCase().includes('quantif')) {
         // Check if the original text already has good metrics
         const hasGoodMetrics = /\d+%|\d+\+|\d+,\d+|\d{2,}%|\$\d+|\d+ users|\d+ students|\d+ scans/i.test(issue.line);
         if (hasGoodMetrics) {
           // If it already has metrics, change the feedback to be about enhancement rather than missing
           issue.text = issue.text.replace(/Missing|missing/, 'Could enhance');
           issue.severity = 'low'; // Downgrade severity since there are already some metrics
         }
       }

       // Ensure the original text is actually what's in the resume
       // Don't flag issues for text that's already complete or well-written
       const isCompleteStatement = issue.line.length > 50 && /\d+%|\d+\+|\d+,\d+|\d{2,}%|\$\d+|\d+ users|\d+ students|\d+ scans/i.test(issue.line);
       if (isCompleteStatement && issue.text.toLowerCase().includes('incomplete')) {
         processedData.actions.splice(index, 1);
         return false;
       }

       return true;
     });

         // Recalculate score based on filtered issues
     const highIssues = processedData.issues.filter(i => i.severity === 'high').length;
     const mediumIssues = processedData.issues.filter(i => i.severity === 'medium').length;
     const lowIssues = processedData.issues.filter(i => i.severity === 'low').length;

     // Check if resume already has good metrics and strong content
     const hasGoodMetrics = /\d+%|\d+\+|\d+,\d+|\d{2,}%|\$\d+|\d+ users|\d+ students|\d+ scans/i.test(processedText);
     const hasStrongVerbs = /(boosted|increased|improved|developed|implemented|led|managed|achieved|delivered|transformed|established|streamlined|created|executed|spearheaded|pioneered|drove|facilitated|resolved|enhanced|optimized|designed|built|launched|constructed|trained|performed|deployed|integrated|leveraged|engineered|architected|crafted)/i.test(processedText);
     
     let recalculatedScore = Math.max(0, 100 - (highIssues * 15) - (mediumIssues * 5) - (lowIssues * 2));
     
     // Modest bonus for strong resumes, but keep room for improvement
     if (hasGoodMetrics && hasStrongVerbs) {
       recalculatedScore = Math.min(95, recalculatedScore + 5); // Cap at 95 to encourage improvement
     } else if (hasGoodMetrics || hasStrongVerbs) {
       recalculatedScore = Math.min(90, recalculatedScore + 3); // Cap at 90
     }
     
     // Apply score caps for critical issues
     const hasHighAtsIssues = processedData.issues.some(
       i => i.severity === 'high' && i.category.toLowerCase().includes('ats')
     );
     
     if (hasHighAtsIssues && recalculatedScore > 75) {
       processedData.score = 75;
     } else if (highIssues >= 3 && recalculatedScore > 70) {
       processedData.score = 70;
     } else {
       processedData.score = recalculatedScore;
     }

     // Ensure we have exactly 5 issues and actions
     const targetIssues = 5;
     const currentIssues = Math.min(processedData.issues.length, processedData.actions.length);
     
     if (currentIssues < targetIssues) {
       // Generate additional constructive feedback
       const additionalIssues = generateAdditionalFeedback(processedText, processedData.issues, targetIssues - currentIssues);
       processedData.issues.push(...additionalIssues.issues);
       processedData.actions.push(...additionalIssues.actions);
     } else if (currentIssues > targetIssues) {
       // Keep only the most important issues
       processedData.issues = processedData.issues.slice(0, targetIssues);
       processedData.actions = processedData.actions.slice(0, targetIssues);
     }

    // Clean text helper
    const clean = (s: string) => s.replace(/\s*[-–—]\s*$/u, "").trim();

    // Extract keywords from resume text to ensure comprehensive coverage
    const extractedKeywords = extractKeywordsFromText(processedText);
    
    // Combine AI-generated keywords with extracted keywords
    const enhancedKeywords = processedData.keywords || [];
    
    // Add extracted keywords that weren't already identified by AI
    extractedKeywords.forEach(extracted => {
      const existingCategory = enhancedKeywords.find(k => k.category === extracted.category);
      if (existingCategory) {
        // Merge terms, avoiding duplicates
        const allTerms = [...new Set([...existingCategory.terms, ...extracted.terms])];
        existingCategory.terms = allTerms;
      } else {
        enhancedKeywords.push(extracted);
      }
    });

    // Enhance strengths with specific examples from the resume
    const enhancedStrengths = processedData.strengths || [];
    
    // Add strengths based on actual content found in resume
    const hasQuantifiedAchievements = /\d+%|\d+\+|\d+,\d+|\d{2,}%|\$\d+|\d+ users|\d+ students|\d+ scans/i.test(processedText);
    const hasStrongActionVerbs = /(boosted|increased|improved|developed|implemented|led|managed|achieved|delivered|transformed|established|streamlined|created|executed|spearheaded|pioneered|drove|facilitated|resolved|enhanced|optimized|designed|built|launched|constructed|trained|performed|deployed|integrated|leveraged|engineered|architected|crafted)/i.test(processedText);
    const hasTechnicalSkills = enhancedKeywords.some(k => k.category === 'Technical Skills' && k.terms.length > 0);
    
    if (hasQuantifiedAchievements && !enhancedStrengths.some(s => s.text.toLowerCase().includes('quantified'))) {
      enhancedStrengths.push({
        section: "Experience",
        text: "Includes quantified achievements with specific metrics",
        reason: "Resume contains measurable results and impact statements"
      });
    }
    
    if (hasStrongActionVerbs && !enhancedStrengths.some(s => s.text.toLowerCase().includes('action verb'))) {
      enhancedStrengths.push({
        section: "Experience",
        text: "Uses strong action verbs throughout",
        reason: "Resume employs powerful verbs like 'led', 'developed', 'implemented', 'achieved'"
      });
    }
    
    if (hasTechnicalSkills && !enhancedStrengths.some(s => s.text.toLowerCase().includes('technical'))) {
      const techSkills = enhancedKeywords.find(k => k.category === 'Technical Skills');
      if (techSkills) {
        enhancedStrengths.push({
          section: "Skills",
          text: `Strong technical skills including ${techSkills.terms.slice(0, 5).join(', ')}`,
          reason: `Demonstrates proficiency in ${techSkills.terms.length} technical areas`
        });
      }
    }

    // Convert to full audit format
    const audit: Audit = {
      score: processedData.score,
      issues: processedData.issues.map((i) => ({
        section: (i.section === "Format" ? "Other" : i.section) as any,
        line: clean(i.line),
        text: clean(i.text),
        severity: i.severity,
        category: i.category as any,
        reason: undefined,
      })),
      actions: processedData.actions.map((a) => ({
        section: (a.section === "Format" ? "Other" : a.section) as any,
        original: clean(a.original),
        rewrite: clean(a.rewrite),
        impact: "medium" as const,
        improvement: undefined,
      })),
      strengths: enhancedStrengths.map((s) => ({
        section: (s.section === "Format" ? "Other" : s.section) as any,
        text: clean(s.text),
        reason: clean(s.reason),
      })),
      keywords: enhancedKeywords.map((k) => ({
        category: k.category,
        terms: k.terms || [],
        missing: k.missing || [],
        density: k.density,
      })),
      summary: processedData.summary || generateDefaultSummary(processedData.score),
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

function generateAdditionalFeedback(resumeText: string, existingIssues: any[], count: number): { issues: any[], actions: any[] } {
  const additionalIssues: any[] = [];
  const additionalActions: any[] = [];
  
  // Analyze the resume to find actual sections and content
  const hasSummary = /summary|objective/i.test(resumeText);
  const hasSkills = /skills|technologies|languages/i.test(resumeText);
  const hasProjects = /projects|portfolio/i.test(resumeText);
  const hasCertifications = /certifications|certificates/i.test(resumeText);
  
  // Generate feedback based on what's actually missing or could be improved
  const feedbackOptions = [];
  
  if (!hasSummary) {
    feedbackOptions.push({
      section: "Summary",
      line: "Resume header",
      text: "Consider adding a professional summary section",
      severity: "low" as const,
      category: "structure",
      original: "Resume header",
      rewrite: "Add a compelling 2-3 sentence summary highlighting your key strengths and career objectives"
    });
  }
  
  if (hasSkills) {
    feedbackOptions.push({
      section: "Skills",
      line: "Skills section",
      text: "Could organize skills by proficiency level",
      severity: "low" as const,
      category: "format",
      original: "Skills section",
      rewrite: "Organize skills by proficiency level (Expert, Advanced, Intermediate) to show depth of knowledge"
    });
  }
  
  if (!hasCertifications) {
    feedbackOptions.push({
      section: "Education",
      line: "Education section",
      text: "Consider adding relevant certifications",
      severity: "low" as const,
      category: "content",
      original: "Education section",
      rewrite: "Add relevant certifications or additional training to demonstrate continuous learning"
    });
  }
  
  if (hasProjects) {
    feedbackOptions.push({
      section: "Projects",
      line: "Project descriptions",
      text: "Could add business impact context",
      severity: "low" as const,
      category: "content",
      original: "Project descriptions",
      rewrite: "Add business impact context to show how your technical work drives organizational value"
    });
  }
  
  // Generic improvement suggestions that don't fabricate information
  feedbackOptions.push({
    section: "Experience",
    line: "Job descriptions",
    text: "Consider adding industry-specific keywords",
    severity: "low" as const,
    category: "keyword",
    original: "Job descriptions",
    rewrite: "Incorporate more industry-specific keywords and technologies to improve ATS optimization"
  });

  // Filter out feedback that might conflict with existing issues
  const existingSections = existingIssues.map(issue => issue.section);
  const availableFeedback = feedbackOptions.filter(feedback => 
    !existingSections.includes(feedback.section)
  );

  // Add the requested number of additional feedback items
  for (let i = 0; i < Math.min(count, availableFeedback.length); i++) {
    const feedback = availableFeedback[i];
    additionalIssues.push({
      section: feedback.section,
      line: feedback.line,
      text: feedback.text,
      severity: feedback.severity,
      category: feedback.category
    });
    additionalActions.push({
      section: feedback.section,
      original: feedback.original,
      rewrite: feedback.rewrite
    });
  }

  return { issues: additionalIssues, actions: additionalActions };
}

function generateDefaultSummary(score: number): string {
  if (score >= 85) {
    return "Excellent resume! Your content is well-structured with strong achievements. Minor refinements could make it perfect.";
  } else if (score >= 70) {
    return "Good foundation! Focus on adding more quantified achievements and ensuring consistent formatting throughout.";
  } else if (score >= 50) {
    return "Your resume has potential. Priority improvements: add metrics to achievements, use stronger action verbs, and enhance keyword optimization.";
  } else {
    return "Significant improvements needed. Focus on quantifying achievements, improving structure, and adding relevant keywords for your target role.";
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