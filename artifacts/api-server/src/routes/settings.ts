import { Router } from "express";
import { db, ckSettings, ckConnection } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// ── System Settings ──────────────────────────────────────────────────────────

router.get("/settings", async (req, res) => {
  try {
    const [row] = await db.select().from(ckSettings).where(eq(ckSettings.id, 1)).limit(1);
    if (!row) {
      const now = new Date().toISOString();
      await db.insert(ckSettings).values({
        id: 1,
        check_interval_minutes: 1,
        notifications: true,
        sound_alerts: false,
        auto_detect: false,
        updated_at: now,
      });
      return res.json({ checkIntervalMinutes: 1, notifications: true, soundAlerts: false, autoDetect: false });
    }
    return res.json({
      checkIntervalMinutes: row.check_interval_minutes,
      notifications: row.notifications,
      soundAlerts: row.sound_alerts,
      autoDetect: row.auto_detect,
    });
  } catch (err) {
    req.log.error(err, "get settings error");
    return res.status(500).json({ error: "服务器错误" });
  }
});

router.put("/settings", async (req, res) => {
  const { checkIntervalMinutes, notifications, soundAlerts, autoDetect } = req.body;
  try {
    const now = new Date().toISOString();
    await db.insert(ckSettings).values({
      id: 1,
      check_interval_minutes: checkIntervalMinutes ?? 1,
      notifications: notifications ?? true,
      sound_alerts: soundAlerts ?? false,
      auto_detect: autoDetect ?? false,
      updated_at: now,
    }).onConflictDoUpdate({
      target: ckSettings.id,
      set: {
        check_interval_minutes: checkIntervalMinutes ?? 1,
        notifications: notifications ?? true,
        sound_alerts: soundAlerts ?? false,
        auto_detect: autoDetect ?? false,
        updated_at: now,
      },
    });
    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "update settings error");
    return res.status(500).json({ error: "服务器错误" });
  }
});

// ── ClickHouse Connection ─────────────────────────────────────────────────────

router.get("/connection", async (req, res) => {
  try {
    const [row] = await db.select().from(ckConnection).where(eq(ckConnection.id, 1)).limit(1);
    if (!row) {
      return res.json({ host: 'localhost', port: 8123, database: 'default', username: 'default', password: '' });
    }
    return res.json({ host: row.host, port: row.port, database: row.database, username: row.username, password: row.password });
  } catch (err) {
    req.log.error(err, "get connection error");
    return res.status(500).json({ error: "服务器错误" });
  }
});

router.put("/connection", async (req, res) => {
  const { host, port, database, username, password } = req.body;
  try {
    const now = new Date().toISOString();
    await db.insert(ckConnection).values({
      id: 1,
      host: host || 'localhost',
      port: port || 8123,
      database: database || 'default',
      username: username || 'default',
      password: password || '',
      updated_at: now,
    }).onConflictDoUpdate({
      target: ckConnection.id,
      set: { host, port, database, username, password, updated_at: now },
    });
    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "update connection error");
    return res.status(500).json({ error: "服务器错误" });
  }
});

export default router;
