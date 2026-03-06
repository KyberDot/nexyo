import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";

async function isAdmin() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return false;
  const db = getDb();
  const u = db.prepare("SELECT role FROM users WHERE id = ?").get((s.user as any).id) as any;
  return u?.role === "admin";
}

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(getDb().prepare("SELECT * FROM subscription_plans ORDER BY id").all());
}

export async function POST(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = await req.json();
  const db = getDb();
  const r = db.prepare(`INSERT INTO subscription_plans (name, description, max_subscriptions, max_bills, max_family_members, can_use_analytics, can_use_ai, can_export, can_use_attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(b.name, b.description || null, b.max_subscriptions ?? -1, b.max_bills ?? -1, b.max_family_members ?? -1, b.can_use_analytics ? 1 : 0, b.can_use_ai ? 1 : 0, b.can_export ? 1 : 0, b.can_use_attachments ? 1 : 0);
  return NextResponse.json({ id: r.lastInsertRowid, ok: true });
}

export async function PATCH(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, ...b } = await req.json();
  const db = getDb();
  const fields = ['name','description','max_subscriptions','max_bills','max_family_members','can_use_analytics','can_use_ai','can_export','can_use_attachments'];
  const updates = fields.filter(f => f in b).map(f => `${f} = ?`);
  const vals = fields.filter(f => f in b).map(f => typeof b[f] === 'boolean' ? (b[f] ? 1 : 0) : b[f]);
  if (!updates.length) return NextResponse.json({ error: "No fields" }, { status: 400 });
  db.prepare(`UPDATE subscription_plans SET ${updates.join(", ")} WHERE id = ?`).run(...vals, id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await req.json();
  getDb().prepare("DELETE FROM subscription_plans WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
