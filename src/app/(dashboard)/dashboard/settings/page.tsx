"use client";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useSettings } from "@/lib/SettingsContext";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { settings, saveSettings } = useSettings();
  const [local, setLocal] = useState(settings);
  const [saved, setSaved] = useState(false);

  // Sync local when settings load
  useState(() => { setLocal(settings); });

  const set = (k: string, v: any) => setLocal(p => ({ ...p, [k]: v }));

  const save = async () => {
    await saveSettings(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 540 }} className="fade-in">
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Settings</h1>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Account</div>
          <div style={{ fontSize: 14, color: "var(--muted)" }}>{session?.user?.name} · {session?.user?.email}</div>
        </div>

        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Appearance</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[["dark", "🌙 Dark"], ["light", "☀️ Light"]].map(([t, label]) => (
              <button key={t} onClick={() => set("theme", t)} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${local.theme === t ? "#6366F1" : "var(--border-color)"}`, background: local.theme === t ? "rgba(99,102,241,0.12)" : "transparent", color: local.theme === t ? "#6366F1" : "var(--muted)", fontWeight: 500, fontSize: 14, cursor: "pointer" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Default Currency</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>Applied across all pages unless individually specified per subscription</div>
          <select className="select" value={local.currency} onChange={e => set("currency", e.target.value)}>
            {["USD", "EUR", "GBP", "CAD", "AUD", "EGP"].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Renewal Reminders</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>Get notified before subscriptions renew</div>
          {[["remind_3d", "3 days before"], ["remind_7d", "7 days before"], ["remind_14d", "14 days before"]].map(([key, label]) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, cursor: "pointer", fontSize: 14 }}>
              <input type="checkbox" checked={!!(local as any)[key]} onChange={e => set(key, e.target.checked)} style={{ accentColor: "#6366F1", width: 16, height: 16 }} />
              {label}
            </label>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn-primary" onClick={save}>{saved ? "✓ Saved" : "Save Settings"}</button>
          <button className="btn-ghost" onClick={() => signOut({ callbackUrl: "/login" })}>Sign out</button>
        </div>
      </div>
    </div>
  );
}
