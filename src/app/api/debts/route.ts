import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";

async function uid() {
  const s = await getServerSession(authOptions);
  return s?.user ? Number((s.user as any).id) : null;
}

export async function GET() {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  return NextResponse.json(db.prepare("SELECT d.*, fm.name as member_name FROM debts d LEFT JOIN family_members fm ON fm.id = d.member_id WHERE d.user_id = ? ORDER BY d.created_at DESC").all(userId));
}

export async function POST(req: NextRequest) {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json();
  const db = getDb();
  const r = db.prepare("INSERT INTO debts (user_id, name, amount, currency, paid, icon, color, member_id, company, due_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(userId, b.name, b.amount, b.currency || "USD", b.paid || 0, b.icon || null, b.color || "#EF4444", b.member_id || null, b.company || null, b.due_date || null, b.notes || null);
  return NextResponse.json(db.prepare("SELECT * FROM debts WHERE id = ?").get(r.lastInsertRowid), { status: 201 });
}
