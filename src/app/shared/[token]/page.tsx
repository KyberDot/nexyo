import { getDb } from "@/lib/db";
import { toMonthly, fmt } from "@/types";
import { notFound } from "next/navigation";

export default function SharedPage({ params }: { params: { token: string } }) {
  const db = getDb();
  const link = db.prepare("SELECT * FROM shared_links WHERE token = ? AND active = 1").get(params.token) as any;
  if (!link) notFound();

  const subs = db.prepare("SELECT * FROM subscriptions WHERE user_id = ? AND active = 1 ORDER BY name").all(link.user_id) as any[];
  const monthlyTotal = subs.reduce((a: number, s: any) => a + toMonthly(s.amount, s.cycle), 0);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: 32, fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>💰</div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Shared Subscriptions</h1>
          <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 4 }}>Shared via Vexyo · Read-only view</p>
          <div style={{ marginTop: 12, fontSize: 20, fontWeight: 700, color: "#6366F1" }}>${fmt(monthlyTotal)}/mo</div>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--border-color)", borderRadius: 12, overflow: "hidden" }}>
          {subs.map((s: any, i: number) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < subs.length - 1 ? "1px solid var(--border-color)" : "none" }}>
              {s.icon && <img src={s.icon} width={32} height={32} style={{ borderRadius: 8, background: "#fff", padding: 2 }} alt={s.name} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{s.category} · {s.cycle}</div>
              </div>
              <div style={{ fontWeight: 700 }}>${s.amount}/{s.cycle === "monthly" ? "mo" : "yr"}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
