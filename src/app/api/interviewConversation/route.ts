import { withUsage } from "../../lib/aiRequest";
import { interviewAudio } from "../../lib/interviewAudio";
export const maxDuration = 60;
export async function POST(req: Request) {
  return withUsage(req, "interview_prep", interviewAudio);
}
