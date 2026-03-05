// Categories page
"use client";
import { useSettings } from "@/lib/SettingsContext";
import { useSubscriptions } from "@/lib/useSubscriptions";
import { toMonthly, fmt, CAT_COLORS, CATEGORIES } from "@/types";

export default function CategoriesPage() {
  const { subs, loading } = useSubscriptions();
  const { currencySymbol } = useSettings();
  const activeSubs = subs.filter(s => s.active);
  if (loading) return <div style={{ color: "var(--muted)" }}>Loading...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-in">
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Categories</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 12 }}>
        {CATEGORIES.map(cat => {
          const catSubs = activeSubs.filter(s => s.category === cat);
          const total = catSubs.reduce((a, s) => a + toMonthly(s.amount, s.cycle), 0);
          return (
            <div key={cat} className="card" style={{ borderLeft: `3px solid ${CAT_COLORS[cat] || "#94A3B8"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: CAT_COLORS[cat] || "#94A3B8" }} />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{cat}</span>
                </div>
                <span style={{ fontWeight: 700, color: CAT_COLORS[cat] || "#94A3B8", fontSize: 14 }}>{total > 0 ? `$${fmt(total)}/mo` : "—"}</span>
              </div>
              {catSubs.length === 0
                ? <div style={{ fontSize: 12, color: "var(--muted)" }}>No subscriptions</div>
                : catSubs.map(s => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontSize: 13 }}>
                    {s.icon && <img src={s.icon} width={18} height={18} style={{ borderRadius: 4, background: "#fff", padding: 1 }} alt={s.name} onError={e => (e.currentTarget.style.display = "none")} />}
                    <span style={{ flex: 1, color: "var(--muted)" }}>{s.name}</span>
                    <span style={{ fontWeight: 500 }}>${s.amount}</span>
                  </div>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
