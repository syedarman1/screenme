import { NextApiRequest, NextApiResponse } from "next";
import { v4 as uuid } from "uuid";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // (optional) you could track sessions in a DB
  res.status(200).json({ sessionId: uuid() });
}
