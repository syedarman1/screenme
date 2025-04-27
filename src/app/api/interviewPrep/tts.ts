import { NextApiRequest, NextApiResponse } from "next";
import { textToSpeech } from "../../utils/openaiClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { text } = req.body;
  try {
    const audioBuffer = await textToSpeech(text);
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(audioBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "TTS failed" });
  }
}
