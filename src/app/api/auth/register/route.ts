import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("invite");
  if (!token) return NextResponse.json({ error: "No token" }, { status: 400 });
  const db = getDb();
  const invite = db.prepare("SELECT * FROM invites WHERE token = ? AND used = 0").get(token) as any;
  if (!invite) return NextResponse.json({ error: "Invalid or used invite" }, { status: 404 });
  return NextResponse.json({ email: invite.email, valid: true });
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, invite_token } = await req.json();
    
    if (!email || !password) return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    
    const db = getDb();
    
    // Check if registration is open
    const platform = db.prepare("SELECT allow_registration FROM platform_settings WHERE id = 1").get() as any;
    if (!platform?.allow_registration && !invite_token) {
      return NextResponse.json({ error: "Registration is currently closed" }, { status: 403 });
    }

    // Check for existing user first
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) return NextResponse.json({ error: "An account with this email already exists" }, { status: 400 });

    const hash = await bcrypt.hash(password, 12);
    const userName = name || email.split("@")[0];

    // ATOMIC REGISTRATION
    const registerUser = db.transaction(() => {
      // 1. Handle Invite if present
      if (invite_token) {
        const invite = db.prepare("SELECT * FROM invites WHERE token = ? AND used = 0").get(invite_token) as any;
        if (!invite) throw new Error("INVITE_INVALID");
        if (invite.email.toLowerCase() !== email.toLowerCase()) throw new Error("EMAIL_MISMATCH");
        
        db.prepare("UPDATE invites SET used = 1 WHERE token = ?").run(invite_token);
      }

      // 2. Create User
      const r = db.prepare("INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)").run(email, userName, hash);
      const userId = r.lastInsertRowid;

      // 3. Initialize ALL Settings (The Auto-Heal part)
      db.prepare("INSERT OR IGNORE INTO user_settings (user_id) VALUES (?)").run(userId);
      db.prepare("INSERT OR IGNORE INTO notification_settings (user_id) VALUES (?)").run(userId);
      
      return userId;
    });

    try {
      registerUser();
      return NextResponse.json({ ok: true });
    } catch (e: any) {
      if (e.message === "INVITE_INVALID") return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 400 });
      if (e.message === "EMAIL_MISMATCH") return NextResponse.json({ error: "This invite is for a different email address" }, { status: 400 });
      throw e; // Pass up to the main catch block
    }

  } catch (error) {
    console.error("Registration Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}