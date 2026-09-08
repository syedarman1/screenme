import { z } from "zod";
// Extended sections to cover more resume types
export const Section = z.enum([
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
export const IssueSchema = z.object({
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
export const SimpleAuditSchema = z.object({
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
export const AuditSchema = z.object({
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

export type Audit = z.infer<typeof AuditSchema>;
export type SimpleAudit = z.infer<typeof SimpleAuditSchema>;
