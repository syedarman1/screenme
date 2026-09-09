import { withUsage } from "../../lib/aiRequest";
import { writingResponse } from "../../lib/writingResponse";
export const maxDuration = 60;
export async function POST(req: Request) {
  return withUsage(req, "cover_letter", (req) =>
    writingResponse(req, "letter"),
  );
}
