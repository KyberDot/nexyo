import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";

async function uid() {
  const s = await getServerSession(authOptions);
  return s?.user ? Number((s.user as any).id) : null;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const db = getDb();
  const fields = ["name","amount","currency","paid","icon","color","member_id","company","due_date","notes","active"];
  const updates: string[] = []; const values: any[] = [];
  for (const f of fields) {
    if (f in body) { updates.push(`${f} = ?`); values.push(typeof body[f] === "boolean" ? (body[f] ? 1 : 0) : body[f]); }
  }
  if (!updates.length) return NextResponse.json({ error: "No fields" }, { status: 400 });
  updates.push("updated_at = datetime('now')"); values.push(params.id, userId);
  db.prepare(`UPDATE debts SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`).run(...values);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  getDb().prepare("DELETE FROM debts WHERE id = ? AND user_id = ?").run(params.id, userId);
  return NextResponse.json({ ok: true });
}
