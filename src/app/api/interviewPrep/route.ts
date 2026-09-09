import {withUsage} from "../../lib/aiRequest";
import {writingResponse} from "../../lib/writingResponse";
import {interviewAudio} from "../../lib/interviewAudio";
export const maxDuration=60;
export async function POST(req:Request){return withUsage(req,"interview_prep",req=>req.headers.get("content-type")?.includes("multipart/form-data")?interviewAudio(req):writingResponse(req,"interview"));}
