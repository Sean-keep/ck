import { Router } from "express";
import { db, ckUsers } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

router.get("/users", async (req, res) => {
  try {
    const users = await db.select().from(ckUsers).orderBy(ckUsers.created_at);
    return res.json(users.map(u => ({
      id: u.id,
      username: u.username,
      displayName: u.display_name,
      role: u.role,
      email: u.email,
      enabled: u.enabled,
      createdAt: u.created_at,
      lastLogin: u.last_login,
    })));
  } catch (err) {
    req.log.error(err, "list users error");
    return res.status(500).json({ error: "服务器错误" });
  }
});

router.post("/users", async (req, res) => {
  const { username, displayName, role, email, password, enabled } = req.body;
  if (!username || !displayName || !role || !password) {
    return res.status(400).json({ error: "缺少必填字段" });
  }
  try {
    const id = `user-${randomUUID()}`;
    const now = new Date().toISOString();
    await db.insert(ckUsers).values({
      id, username, display_name: displayName, role, email: email || '',
      password, enabled: enabled !== false,
      created_at: now, last_login: null,
    });
    return res.status(201).json({ id });
  } catch (err: any) {
    if (err.message?.includes('unique')) {
      return res.status(409).json({ error: "用户名已存在" });
    }
    req.log.error(err, "create user error");
    return res.status(500).json({ error: "服务器错误" });
  }
});

router.put("/users/:id", async (req, res) => {
  const { id } = req.params;
  const { displayName, role, email, password, enabled } = req.body;
  try {
    const updates: Record<string, unknown> = {};
    if (displayName !== undefined) updates.display_name = displayName;
    if (role !== undefined) updates.role = role;
    if (email !== undefined) updates.email = email;
    if (password !== undefined && password !== '') updates.password = password;
    if (enabled !== undefined) updates.enabled = enabled;
    await db.update(ckUsers).set(updates).where(eq(ckUsers.id, id));
    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "update user error");
    return res.status(500).json({ error: "服务器错误" });
  }
});

router.delete("/users/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.delete(ckUsers).where(eq(ckUsers.id, id));
    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "delete user error");
    return res.status(500).json({ error: "服务器错误" });
  }
});

export default router;
