"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSettings } from "@/lib/SettingsContext";

export default function ProfilePage() {
  const { data: session } = useSession();
  const { userAvatar, reloadProfile, platform } = useSettings();
  const [form, setForm] = useState({ name: "", email: "" });
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const acc = platform.primary_color || "#6366F1";

  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(d => {
      if (!d.error) { setForm({ name: d.name || "", email: d.email || "" }); setAvatar(d.avatar || null); }
    });
  }, []);

  const showMsg = (text: string, ok: boolean, pw = false) => {
    if (pw) { setPwMsg({ text, ok }); setTimeout(() => setPwMsg(null), 3000); }
    else { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3000); }
  };

  const saveProfile = async () => {
    setSaving(true);
    const r = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, email: form.email, avatar }) });
    const d = await r.json();
    setSaving(false);
    if (d.error) showMsg(d.error, false);
    else { showMsg("Profile updated!", true); await reloadProfile(); }
  };

  const savePw = async () => {
    if (pwForm.next !== pwForm.confirm) { showMsg("Passwords don't match", false, true); return; }
    if (pwForm.next.length < 8) { showMsg("Password must be at least 8 characters", false, true); return; }
    setSaving(true);
    const r = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current_password: pwForm.current, new_password: pwForm.next }) });
    const d = await r.json();
    setSaving(false);
    if (d.error) showMsg(d.error, false, true);
    else { showMsg("Password changed!", true, true); setPwForm({ current: "", next: "", confirm: "" }); }
  };

  const handleAvatarFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = async e => {
      const data = e.target?.result as string;
      setAvatar(data);
      // Save immediately
      await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avatar: data }) });
      await reloadProfile();
    };
    r.readAsDataURL(file);
  };

  const displayName = form.name || session?.user?.name || "User";
  const initials = displayName[0]?.toUpperCase() || "U";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 560 }} className="fade-in">
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Profile</h1>

      <div className="card">
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18 }}>Avatar</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 72, height: 72, borderRadius: 99, background: acc, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "white", fontSize: 28, overflow: "hidden", flexShrink: 0, cursor: "pointer" }} onClick={() => fileRef.current?.click()}>
            {avatar ? <img src={avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="avatar" onError={() => setAvatar(null)} /> : initials}
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleAvatarFile(e.target.files[0])} />
            <button className="btn-primary" style={{ fontSize: 13, marginRight: 8 }} onClick={() => fileRef.current?.click()}>Upload Photo</button>
            {avatar && <button className="btn-ghost" style={{ fontSize: 13 }} onClick={async () => { setAvatar(null); await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avatar: null }) }); await reloadProfile(); }}>Remove</button>}
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>PNG, JPG up to 5MB. Updates everywhere instantly.</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Account Info</div>
        {msg && <div style={{ marginBottom: 14, padding: "9px 12px", background: msg.ok ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${msg.ok ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`, borderRadius: 8, fontSize: 13, color: msg.ok ? "#10B981" : "#EF4444" }}>{msg.text}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>Name</label><input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
          <div><label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>Email</label><input className="input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
          <button className="btn-primary" onClick={saveProfile} disabled={saving} style={{ alignSelf: "flex-start" }}>{saving ? "Saving..." : "Save Changes"}</button>
        </div>
      </div>

      <div className="card">
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Change Password</div>
        {pwMsg && <div style={{ marginBottom: 14, padding: "9px 12px", background: pwMsg.ok ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${pwMsg.ok ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`, borderRadius: 8, fontSize: 13, color: pwMsg.ok ? "#10B981" : "#EF4444" }}>{pwMsg.text}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>Current Password</label><input className="input" type="password" value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} /></div>
          <div><label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>New Password</label><input className="input" type="password" value={pwForm.next} onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))} /></div>
          <div><label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>Confirm New Password</label><input className="input" type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} /></div>
          <button className="btn-primary" onClick={savePw} disabled={saving} style={{ alignSelf: "flex-start" }}>Change Password</button>
        </div>
      </div>
    </div>
  );
}
