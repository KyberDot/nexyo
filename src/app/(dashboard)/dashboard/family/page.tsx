"use client";
import { useSettings } from "@/lib/SettingsContext";
import { useSubscriptions } from "@/lib/useSubscriptions";
import { toMonthly, fmt } from "@/types";

const MEMBERS = ["Me", "Partner", "Family", "Child 1", "Child 2"];

export default function FamilyPage() {
  const { subs, loading } = useSubscriptions();
  const { currencySymbol } = useSettings();
  const activeSubs = subs.filter(s => s.active);
  if (loading) return <div style={{ color: "var(--muted)" }}>Loading...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-in">
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Family</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 12 }}>
        {MEMBERS.map(member => {
          const mSubs = activeSubs.filter(s => s.member === member);
          if (mSubs.length === 0) return null;
          const total = mSubs.reduce((a, s) => a + toMonthly(s.amount, s.cycle), 0);
          return (
            <div key={member} className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 99, background: "#6366F1", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "white", fontSize: 15, flexShrink: 0 }}>
                  {member[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{member}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{mSubs.length} subscription{mSubs.length > 1 ? "s" : ""}</div>
                </div>
                <div style={{ fontWeight: 700, color: "#6366F1" }}>${fmt(total)}/mo</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {mSubs.map(s => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    {s.icon && <img src={s.icon} width={22} height={22} style={{ borderRadius: 4, background: "#fff", padding: 1 }} alt={s.name} onError={e => (e.currentTarget.style.display = "none")} />}
                    <span style={{ flex: 1 }}>{s.name}</span>
                    <span style={{ color: "var(--muted)" }}>${fmt(toMonthly(s.amount, s.cycle))}/mo</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {MEMBERS.every(m => activeSubs.filter(s => s.member === m).length === 0) && (
          <div style={{ color: "var(--muted)", fontSize: 14 }}>No subscriptions assigned to family members yet.</div>
        )}
      </div>
    </div>
  );
}
