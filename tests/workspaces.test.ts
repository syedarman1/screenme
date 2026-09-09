import {test,before,after,beforeEach} from "node:test";
import assert from "node:assert/strict";
import {blankWorkspace,workspacePayload} from "../src/app/lib/workspace";
import {rejectNewNumbers} from "../src/app/lib/writingEngine";
const native=globalThis.fetch;
let authenticated=true;let conflict=false;let calls:{url:string;body:Record<string,unknown>}[]=[];
let route:typeof import("../src/app/api/workspaces/route");
const id="00000000-0000-4000-8000-000000000111",uid="00000000-0000-4000-8000-000000000001";
before(async()=>{
 process.env.NEXT_PUBLIC_SUPABASE_URL="https://workspace.supabase.invalid";process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY="synthetic-anon";process.env.SUPABASE_SERVICE_ROLE_KEY="synthetic-service";
 globalThis.fetch=async(input,init)=>{
  const url=String(input instanceof Request?input.url:input);const body=JSON.parse(String(init?.body||"{}"));calls.push({url,body});
  if(url.includes("/auth/v1/user"))return Response.json(authenticated?{id:uid}:{message:"Unauthorized"},{status:authenticated?200:401});
  assert.ok(url.startsWith("https://workspace.supabase.invalid/rest/v1/"));
  if(init?.method==="POST")return Response.json({id,kind:"scan",title:"Saved review",revision:1,updated_at:new Date().toISOString()});
  if(init?.method==="PATCH")return Response.json(conflict?null:{id,kind:"scan",title:"Saved review",revision:3,updated_at:new Date().toISOString()});
  if(init?.method==="DELETE")return Response.json([{id}]);
  return Response.json([]);
 };route=await import("../src/app/api/workspaces/route");
});
beforeEach(()=>{authenticated=true;conflict=false;calls=[];});after(()=>{globalThis.fetch=native;});
const req=(method:string,body?:unknown,query="")=>new Request(`http://localhost/api/workspaces${query}`,{method,headers:{Authorization:"Bearer test","Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});
test("workspace inputs are bounded and reject malformed report structures",()=>{
 assert.equal(workspacePayload.safeParse({...blankWorkspace(),resume:"x".repeat(50001)}).success,false);
 assert.equal(workspacePayload.safeParse({...blankWorkspace(),result:{version:"2.0",assessments:{}}}).success,false);
});
test("workspace endpoints require authenticated ownership and never use caller user IDs",async()=>{
 authenticated=false;assert.equal((await route.GET(req("GET"))).status,401);assert.equal(calls.length,1);
 authenticated=true;const r=await route.POST(req("POST",{id,kind:"scan",title:"Saved review",revision:0,user_id:"attacker",payload:blankWorkspace()}));assert.equal(r.status,201);assert.equal(calls.at(-1)?.body.user_id,uid);assert.equal(r.headers.get("cache-control"),"no-store");
});
test("updates and deletes scope to owner and revision; stale writes get 409",async()=>{
 conflict=true;assert.equal((await route.POST(req("POST",{id,kind:"scan",title:"Saved review",revision:2,payload:blankWorkspace()}))).status,409);
 const url=new URL(calls.at(-1)!.url);assert.equal(url.searchParams.get("user_id"),`eq.${uid}`);assert.equal(url.searchParams.get("revision"),"eq.2");
 assert.equal((await route.DELETE(req("DELETE",{id,revision:2}))).status,200);assert.match(calls.at(-1)!.url,/user_id=eq/);
});
test("history reads are scoped to the verified owner",async()=>{
 assert.equal((await route.GET(req("GET",undefined,`?id=${id}&versions=1`))).status,200);const url=new URL(calls.at(-1)!.url);assert.equal(url.searchParams.get("user_id"),`eq.${uid}`);assert.equal(url.searchParams.get("workspace_id"),`eq.${id}`);
});
test("rewrites cannot invent numerical results even when a job requests them",()=>{
 assert.doesNotThrow(()=>rejectNewNumbers("Improved latency from 800ms to 240ms.","Cut latency from 800ms to 240ms."));
 assert.throws(()=>rejectNewNumbers("Supported customer accounts.","Grew accounts by 40%."));
});
