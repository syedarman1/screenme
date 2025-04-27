import { NextApiRequest, NextApiResponse } from "next";
import { transcribeAudio } from "../../utils/openaiClient";

// disable built-in body parser so we can handle raw blobs
export const config = { api: { bodyParser: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const buffer = Buffer.concat(chunks);

  try {
    const text = await transcribeAudio(buffer);
    // broadcast user transcript to your SSE subscribers (not shown)
    res.status(200).json({ transcript: text });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Whisper transcription failed" });
  }
}
