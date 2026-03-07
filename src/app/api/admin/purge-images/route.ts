import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  // 1. Verify session and Admin role
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { password } = await req.json();
  if (!password) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  const db = getDb();
  const userId = (session.user as any).id;

  // 2. Fetch admin user to verify password
  const admin = db.prepare("SELECT password FROM users WHERE id = ?").get(userId) as any;
  if (!admin || !admin.password) {
    return NextResponse.json({ error: "Admin account error" }, { status: 500 });
  }

  // 3. Compare provided password with hashed password in DB
  const isValid = await bcrypt.compare(password, admin.password);
  if (!isValid) {
    return NextResponse.json({ error: "Incorrect admin password" }, { status: 403 });
  }

  try {
    // 4. Purge Local Files
    // Adjust this path if your uploads are stored somewhere else
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      for (const file of files) {
        // Keep .gitkeep to preserve the directory structure
        if (file !== ".gitkeep") {
          fs.unlinkSync(path.join(uploadDir, file));
        }
      }
    }

    // 5. Clear Database References
    // This removes references to local uploads and base64 images, but leaves standard emojis alone
    db.prepare(`
      UPDATE subscriptions 
      SET icon = NULL 
      WHERE icon LIKE '/uploads/%' OR icon LIKE 'data:%'
    `).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Purge Error:", error);
    return NextResponse.json({ error: "Failed to purge files" }, { status: 500 });
  }
}