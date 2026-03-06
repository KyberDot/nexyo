import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";

async function uid() {
  const s = await getServerSession(authOptions);
  return s?.user ? Number((s.user as any).id) : null;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const att = db.prepare("SELECT * FROM attachments WHERE id = ? AND user_id = ?").get(params.id, userId) as any;
  if (!att) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(att);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  db.prepare("DELETE FROM attachments WHERE id = ? AND user_id = ?").run(params.id, userId);
  return NextResponse.json({ ok: true });
}
