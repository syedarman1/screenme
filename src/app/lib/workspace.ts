import { z } from "zod";
import { scanSchema, matchSchema } from "./analysisV2";
export const workspaceKind = z.enum(["scan", "match", "tailor", "letter", "interview"]);
export type WorkspaceKind = z.infer<typeof workspaceKind>;
export const artifactSchema = z.object({
 version: z.literal("2.0"), analyzedAt:z.string().max(50), content: z.string().max(50000),
 questions: z.array(z.object({question:z.string().max(1500),type:z.string().max(100),difficulty:z.string().max(30),modelAnswer:z.string().max(3000),tip:z.string().max(1500)})).max(12).optional(),
});
export const savedResultSchema = z.union([
 scanSchema.extend({version:z.literal("2.0"),analyzedAt:z.string().max(50)}),
 matchSchema.extend({version:z.literal("2.0"),analyzedAt:z.string().max(50),coverage:z.object({percent:z.number().min(0).max(100),supported:z.number().int().nonnegative(),partial:z.number().int().nonnegative(),notEvidenced:z.number().int().nonnegative(),total:z.number().int().min(1).max(20)})}),
 artifactSchema,
]);
export const workspacePayload = z.object({
 resume:z.string().max(50000), job:z.string().max(25000), targetRole:z.string().max(120),
 company:z.string().max(200).default(""), jobTitle:z.string().max(200).default(""), tone:z.string().max(30).default("Professional"),
 result:savedResultSchema.nullable(), reportResume:z.string().max(50000).default(""), reportJob:z.string().max(25000).default(""),
 notes:z.string().max(10000).default(""),
});
export type WorkspacePayload=z.infer<typeof workspacePayload>;
export const blankWorkspace=():WorkspacePayload=>({resume:"",job:"",targetRole:"",company:"",jobTitle:"",tone:"Professional",result:null,reportResume:"",reportJob:"",notes:""});
export type WorkspaceRow={id:string;kind:WorkspaceKind;title:string;payload:WorkspacePayload;revision:number;updated_at:string};
export type WorkspaceSummary=Pick<WorkspaceRow,"id"|"kind"|"title"|"revision"|"updated_at">;
export const WORKSPACE_LABELS:Record<WorkspaceKind,string>={scan:"Resume review",match:"Job comparison",tailor:"Tailored resume",letter:"Cover letter",interview:"Interview practice"};
export const WORKSPACE_PATHS:Record<WorkspaceKind,string>={scan:"/resume",match:"/jobmatch",tailor:"/tailor",letter:"/coverLetter",interview:"/interview"};
