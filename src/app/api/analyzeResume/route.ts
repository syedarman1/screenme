import { withUsage } from "../../lib/aiRequest";
import { analysisResponse } from "../../lib/analysisEngine";

export const maxDuration = 60;
export async function POST(req: Request) {
  return withUsage(req, "resume_scan", request => analysisResponse(request, "scan"));
}
