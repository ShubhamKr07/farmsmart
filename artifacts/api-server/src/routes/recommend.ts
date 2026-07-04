import { Router, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";

const router = Router();

/**
 * POST /api/recommend { question }
 *
 * Thin authenticated proxy to farmsmart-recommender (Python/FastAPI). Keeps
 * auth centralized here — the recommender service trusts this API via a
 * shared internal key, it doesn't re-validate the Clerk session itself.
 */
router.post("/recommend", async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const question = (req.body as { question?: unknown })?.question;
  if (typeof question !== "string" || question.trim().length === 0) {
    return res.status(400).json({ error: "question is required" });
  }

  const recommenderUrl = process.env.RECOMMENDER_URL;
  const internalKey = process.env.RECOMMENDER_INTERNAL_KEY;
  if (!recommenderUrl || !internalKey) {
    return res.status(503).json({ error: "recommender service is not configured" });
  }

  try {
    const upstream = await fetch(`${recommenderUrl}/recommend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-key": internalKey,
      },
      body: JSON.stringify({ clerk_user_id: userId, question }),
    });
    const body = await upstream.json();
    return res.status(upstream.status).json(body);
  } catch (err) {
    req.log.error(err);
    return res.status(502).json({ error: "recommender service unreachable" });
  }
});

export default router;
