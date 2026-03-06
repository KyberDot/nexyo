import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  const db = getDb();
  const platform = db.prepare("SELECT magic_link_enabled, mail_host, mail_from, app_name FROM platform_settings WHERE id = 1").get() as any;
  if (!platform?.magic_link_enabled) return NextResponse.json({ error: "Magic link login is not enabled" }, { status: 403 });
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString().replace("T", " ").split(".")[0];
  db.prepare("INSERT INTO magic_tokens (email, token, expires_at) VALUES (?, ?, ?)").run(email, token, expires);
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const link = `${baseUrl}/login?magic=${token}`;
  
  // Send email if mail configured
  if (platform.mail_host) {
    try {
      const nodemailer = require("nodemailer");
      const transporter = nodemailer.createTransporter({
        host: platform.mail_host,
        port: db.prepare("SELECT mail_port FROM platform_settings WHERE id=1").get() as any,
        secure: !!(db.prepare("SELECT mail_secure FROM platform_settings WHERE id=1").get() as any)?.mail_secure,
        auth: { user: (db.prepare("SELECT mail_user FROM platform_settings WHERE id=1").get() as any)?.mail_user, pass: (db.prepare("SELECT mail_pass FROM platform_settings WHERE id=1").get() as any)?.mail_pass }
      });
      await transporter.sendMail({
        from: platform.mail_from || "Vexyo <noreply@vexyo.app>",
        to: email,
        subject: `Sign in to ${platform.app_name || "Vexyo"}`,
        html: `<p>Click the link below to sign in. It expires in 15 minutes.</p><p><a href="${link}" style="background:#6366F1;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Sign In</a></p><p>Or copy: ${link}</p>`
      });
      return NextResponse.json({ ok: true, sent: true });
    } catch (e) {
      return NextResponse.json({ ok: true, sent: false, link, error: "Mail failed, showing link" });
    }
  }
  return NextResponse.json({ ok: true, sent: false, link });
}
