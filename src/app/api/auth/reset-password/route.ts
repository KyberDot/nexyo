import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();
  if (!token || !password) return NextResponse.json({ error: "Token and password required" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  const db = getDb();
  const rt = db.prepare("SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > datetime('now')").get(token) as any;
  if (!rt) return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
  const hash = await bcrypt.hash(password, 12);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, rt.user_id);
  db.prepare("UPDATE password_reset_tokens SET used = 1 WHERE id = ?").run(rt.id);
  return NextResponse.json({ ok: true });
}
