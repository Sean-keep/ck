import { Router } from "express";
import { db, ckAlerts } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

const toFront = (a: typeof ckAlerts.$inferSelect) => ({
  id: a.id,
  rule_id: a.rule_id,
  severity: a.severity,
  alert_type: a.alert_type,
  status: a.status,
  content: a.content,
  triggered_at: a.triggered_at,
  resolved_at: a.resolved_at,
  created_at: a.created_at,
  resolution_method_id: a.resolution_method_id,
  resolution_suggestion: a.resolution_suggestion,
});

router.get("/alerts", async (req, res) => {
  try {
    const rows = await db.select().from(ckAlerts).orderBy(ckAlerts.triggered_at);
    return res.json(rows.map(toFront));
  } catch (err) {
    req.log.error(err, "list alerts error");
    return res.status(500).json({ error: "服务器错误" });
  }
});

router.post("/alerts", async (req, res) => {
  const b = req.body;
  try {
    const id = b.id || `alert-${randomUUID()}`;
    const now = new Date().toISOString();
    await db.insert(ckAlerts).values({
      id,
      rule_id: b.rule_id || null,
      severity: b.severity || 'medium',
      alert_type: b.alert_type,
      status: b.status || 'active',
      content: b.content || '',
      triggered_at: b.triggered_at || now,
      resolved_at: b.resolved_at || null,
      created_at: b.created_at || now,
      resolution_method_id: b.resolution_method_id || null,
      resolution_suggestion: b.resolution_suggestion || '',
    });
    return res.status(201).json({ id });
  } catch (err) {
    req.log.error(err, "create alert error");
    return res.status(500).json({ error: "服务器错误" });
  }
});

router.put("/alerts/:id", async (req, res) => {
  const { id } = req.params;
  const b = req.body;
  try {
    await db.update(ckAlerts).set(b).where(eq(ckAlerts.id, id));
    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "update alert error");
    return res.status(500).json({ error: "服务器错误" });
  }
});

router.post("/alerts/bulk", async (req, res) => {
  const { alerts } = req.body as { alerts: Array<typeof ckAlerts.$inferSelect> };
  if (!Array.isArray(alerts) || alerts.length === 0) {
    return res.status(400).json({ error: "alerts array required" });
  }
  try {
    const now = new Date().toISOString();
    await db.insert(ckAlerts).values(alerts.map(a => ({
      id: a.id || `alert-${randomUUID()}`,
      rule_id: a.rule_id || null,
      severity: a.severity || 'medium',
      alert_type: a.alert_type,
      status: a.status || 'active',
      content: a.content || '',
      triggered_at: a.triggered_at || now,
      resolved_at: a.resolved_at || null,
      created_at: a.created_at || now,
      resolution_method_id: a.resolution_method_id || null,
      resolution_suggestion: a.resolution_suggestion || '',
    })));
    return res.status(201).json({ count: alerts.length });
  } catch (err) {
    req.log.error(err, "bulk create alerts error");
    return res.status(500).json({ error: "服务器错误" });
  }
});

export default router;
