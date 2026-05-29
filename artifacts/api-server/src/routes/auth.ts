import { Router } from "express";
import { db, ckUsers } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    return res.status(400).json({ error: "用户名和密码不能为空" });
  }

  try {
    const [user] = await db.select().from(ckUsers).where(eq(ckUsers.username, username)).limit(1);
    if (!user || !user.enabled) {
      return res.status(401).json({ error: "用户名或密码错误" });
    }
    if (user.password !== password) {
      return res.status(401).json({ error: "用户名或密码错误" });
    }

    // Update last_login
    await db.update(ckUsers)
      .set({ last_login: new Date().toISOString() })
      .where(eq(ckUsers.id, user.id));

    return res.json({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
    });
  } catch (err) {
    req.log.error(err, "login error");
    return res.status(500).json({ error: "服务器错误" });
  }
});

export default router;
