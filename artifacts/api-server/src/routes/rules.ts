import { Router } from "express";
import { db, ckAlertRules } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

const toFront = (r: typeof ckAlertRules.$inferSelect) => ({
  id: r.id,
  name: r.name,
  description: r.description,
  rule_type: r.rule_type,
  table_name: r.table_name,
  group_by_field: r.group_by_field,
  aggregation_type: r.aggregation_type,
  operator: r.operator,
  threshold_value: r.threshold_value,
  time_window_minutes: r.time_window_minutes,
  severity: r.severity,
  alert_template: r.alert_template,
  enabled: r.enabled,
  recommended_method_id: r.recommended_method_id,
  created_at: r.created_at,
  updated_at: r.updated_at,
});

router.get("/rules", async (req, res) => {
  try {
    const rows = await db.select().from(ckAlertRules).orderBy(ckAlertRules.created_at);
    return res.json(rows.map(toFront));
  } catch (err) {
    req.log.error(err, "list rules error");
    return res.status(500).json({ error: "服务器错误" });
  }
});

router.post("/rules", async (req, res) => {
  const b = req.body;
  try {
    const id = `rule-${randomUUID()}`;
    const now = new Date().toISOString();
    await db.insert(ckAlertRules).values({
      id,
      name: b.name,
      description: b.description || '',
      rule_type: b.rule_type,
      table_name: b.table_name,
      group_by_field: b.group_by_field,
      aggregation_type: b.aggregation_type || 'COUNT',
      operator: b.operator || '>',
      threshold_value: b.threshold_value ?? 0,
      time_window_minutes: b.time_window_minutes ?? 5,
      severity: b.severity || 'medium',
      alert_template: b.alert_template || '',
      enabled: b.enabled !== false,
      recommended_method_id: b.recommended_method_id || null,
      created_at: now,
      updated_at: now,
    });
    return res.status(201).json({ id });
  } catch (err) {
    req.log.error(err, "create rule error");
    return res.status(500).json({ error: "服务器错误" });
  }
});

router.put("/rules/:id", async (req, res) => {
  const { id } = req.params;
  const b = req.body;
  try {
    await db.update(ckAlertRules).set({
      ...b,
      updated_at: new Date().toISOString(),
    }).where(eq(ckAlertRules.id, id));
    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "update rule error");
    return res.status(500).json({ error: "服务器错误" });
  }
});

router.delete("/rules/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.delete(ckAlertRules).where(eq(ckAlertRules.id, id));
    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "delete rule error");
    return res.status(500).json({ error: "服务器错误" });
  }
});

export default router;
