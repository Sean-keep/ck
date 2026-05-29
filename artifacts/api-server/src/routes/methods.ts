import { Router } from "express";
import { db, ckResolutionMethods } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

const toFront = (m: typeof ckResolutionMethods.$inferSelect) => ({
  id: m.id,
  name: m.name,
  description: m.description,
  alert_type: m.alert_type,
  severity_range: (m.severity_range as string[]) || [],
  steps: (m.steps as string[]) || [],
  tags: (m.tags as string[]) || [],
  created_at: m.created_at,
  updated_at: m.updated_at,
});

router.get("/methods", async (req, res) => {
  try {
    const rows = await db.select().from(ckResolutionMethods).orderBy(ckResolutionMethods.created_at);
    return res.json(rows.map(toFront));
  } catch (err) {
    req.log.error(err, "list methods error");
    return res.status(500).json({ error: "服务器错误" });
  }
});

router.post("/methods", async (req, res) => {
  const b = req.body;
  try {
    const id = b.id || `method-${randomUUID()}`;
    const now = new Date().toISOString();
    await db.insert(ckResolutionMethods).values({
      id,
      name: b.name,
      description: b.description || '',
      alert_type: b.alert_type || '',
      severity_range: b.severity_range || [],
      steps: b.steps || [],
      tags: b.tags || [],
      created_at: now,
      updated_at: now,
    });
    return res.status(201).json({ id });
  } catch (err) {
    req.log.error(err, "create method error");
    return res.status(500).json({ error: "服务器错误" });
  }
});

router.put("/methods/:id", async (req, res) => {
  const { id } = req.params;
  const b = req.body;
  try {
    await db.update(ckResolutionMethods).set({
      name: b.name,
      description: b.description,
      alert_type: b.alert_type,
      severity_range: b.severity_range,
      steps: b.steps,
      tags: b.tags,
      updated_at: new Date().toISOString(),
    }).where(eq(ckResolutionMethods.id, id));
    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "update method error");
    return res.status(500).json({ error: "服务器错误" });
  }
});

router.delete("/methods/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.delete(ckResolutionMethods).where(eq(ckResolutionMethods.id, id));
    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "delete method error");
    return res.status(500).json({ error: "服务器错误" });
  }
});

export default router;
