import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import bcrypt from "bcryptjs";

async function uid() {
  const s = await getServerSession(authOptions);
  return s?.user ? Number((s.user as any).id) : null;
}

export async function GET() {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const user = db.prepare("SELECT id, email, name, avatar, role FROM users WHERE id = ?").get(userId) as any;
  return NextResponse.json(user || { error: "Not found" });
}

export async function PATCH(req: NextRequest) {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const db = getDb();

  if (body.new_password) {
    const user = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(userId) as any;
    if (user.password_hash && body.current_password) {
      const valid = await bcrypt.compare(body.current_password, user.password_hash);
      if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }
    const hash = await bcrypt.hash(body.new_password, 12);
    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(hash, userId);
    return NextResponse.json({ ok: true });
  }

  const updates: string[] = []; const values: any[] = [];
  if ("name" in body) { updates.push("name = ?"); values.push(body.name); }
  if ("email" in body) {
    const existing = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(body.email, userId);
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    updates.push("email = ?"); values.push(body.email);
  }
  if ("avatar" in body) { updates.push("avatar = ?"); values.push(body.avatar); }
  if (!updates.length) return NextResponse.json({ error: "No fields" }, { status: 400 });
  updates.push("updated_at = datetime('now')"); values.push(userId);
  db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  const updated = db.prepare("SELECT id, email, name, avatar, role FROM users WHERE id = ?").get(userId) as any;
  return NextResponse.json(updated);
}
