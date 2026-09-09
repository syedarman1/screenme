import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "../../lib/auth";
import { boundedRequest } from "../../lib/aiRequest";
import { supabaseAdmin as db } from "../../lib/supabaseAdmin";
import { workspaceKind, workspacePayload } from "../../lib/workspace";
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
const idSchema=z.string().uuid();
async function handle(req:Request) {
 const user=await getAuthenticatedUser(req); if(!user)return reply({error:"Sign in to save your work."},401);
 if(!db)return reply({error:"Saved work is unavailable."},503);
 const url=new URL(req.url);
 if(req.method==="GET") {
  const id=url.searchParams.get("id");
  if(id && !idSchema.safeParse(id).success)return reply({error:"Invalid workspace."},400);
  if(id && url.searchParams.get("versions")==="1") {
   const {data,error}=await db.from("workspace_versions").select("id,revision,payload,created_at").eq("workspace_id",id).eq("user_id",user.id).order("revision",{ascending:false}).limit(10);
   return error?reply({error:"History could not be loaded."},503):reply({versions:data});
  }
  if(id) {
   const {data,error}=await db.from("career_workspaces").select("*").eq("user_id",user.id).eq("id",id).maybeSingle();
   return error?reply({error:"Saved work could not be loaded."},503):data?reply({workspace:data}):reply({error:"Workspace not found."},404);
  }
  const kind=url.searchParams.get("kind"); if(kind&&!workspaceKind.safeParse(kind).success)return reply({error:"Invalid tool."},400);
  let query=db.from("career_workspaces").select("id,kind,title,revision,updated_at").eq("user_id",user.id).order("updated_at",{ascending:false}).limit(100);
  if(kind)query=query.eq("kind",kind);
  const {data,error}=await query; return error?reply({error:"Saved work could not be loaded."},503):reply({workspaces:data});
 }
 const bounded=await boundedRequest(req,500000);
 const raw=await bounded.json().catch(()=>null);
 if(req.method==="DELETE") {
  const parsed=z.object({id:idSchema,revision:z.number().int().positive()}).safeParse(raw);if(!parsed.success)return reply({error:"Invalid workspace."},400);
  const {data,error}=await db.from("career_workspaces").delete().eq("user_id",user.id).eq("id",parsed.data.id).eq("revision",parsed.data.revision).select("id");
  return error?reply({error:"Could not delete saved work."},503):!data?.length?reply({error:"This work changed elsewhere. Reload before deleting."},409):reply({success:true});
 }
 const parsed=z.object({id:idSchema,kind:workspaceKind,title:z.string().trim().min(1).max(160),payload:workspacePayload,revision:z.number().int().nonnegative()}).safeParse(raw);
 if(!parsed.success)return reply({error:"The saved work is invalid or too large."},400);
 const {id,kind,title,payload,revision}=parsed.data;
 const result=payload.result;
 if(result && ((kind==="scan"&&!('assessments' in result))||(kind==="match"&&!('requirements' in result))||(!["scan","match"].includes(kind)&&!('content' in result))))return reply({error:"This report belongs to a different tool."},400);
 const write=revision===0?db.from("career_workspaces").insert({id,user_id:user.id,kind,title,payload}):db.from("career_workspaces").update({title,payload}).eq("user_id",user.id).eq("id",id).eq("kind",kind).eq("revision",revision);
 const {data,error}=await write.select("id,kind,title,revision,updated_at").maybeSingle();
 if(error?.message.includes("WORKSPACE_LIMIT"))return reply({error:"Your saved workspace limit is reached (Free: 3, Pro: 20). Delete older work or upgrade; you can still download your current text."},403);
 if(error?.code==="23505" || (!error&&!data))return reply({error:"This work changed in another tab. Reload that version or save your changes as a new workspace."},409);
 if(error)return reply({error:"Your work could not be saved. Keep this page open and retry."},503);
 return reply({workspace:data},revision===0?201:200);
}
export async function GET(req:Request){return handle(req).catch(()=>reply({error:"Saved work is temporarily unavailable."},503));}
export async function POST(req:Request){return handle(req).catch(e=>reply({error:e instanceof RangeError?e.message:"Saved work is temporarily unavailable."},e instanceof RangeError?413:503));}
export const DELETE=POST;
