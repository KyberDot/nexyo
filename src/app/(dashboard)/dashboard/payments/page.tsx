"use client";
import { useSettings } from "@/lib/SettingsContext";
import { useSubscriptions } from "@/lib/useSubscriptions";
import { toMonthly, fmt } from "@/types";

const PAYMENTS = ["Visa •••• 4242", "Mastercard •••• 8821", "PayPal", "Apple Pay"];

export default function PaymentsPage() {
  const { subs, loading } = useSubscriptions();
  const { currencySymbol } = useSettings();
  const activeSubs = subs.filter(s => s.active);
  if (loading) return <div style={{ color: "var(--muted)" }}>Loading...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-in">
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Payment Methods</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {PAYMENTS.map(pm => {
          const pmSubs = activeSubs.filter(s => s.payment_method === pm);
          const total = pmSubs.reduce((a, s) => a + toMonthly(s.amount, s.cycle), 0);
          return (
            <div key={pm} className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 44, height: 28, borderRadius: 4, background: "#6366F1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>💳</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{pm}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{pmSubs.length} subscription{pmSubs.length !== 1 ? "s" : ""}</div>
                </div>
                <div style={{ fontWeight: 700, color: "#6366F1" }}>${fmt(total)}/mo</div>
              </div>
              {pmSubs.map(s => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginTop: 6 }}>
                  {s.icon && <img src={s.icon} width={18} height={18} style={{ borderRadius: 4, background: "#fff", padding: 1 }} alt={s.name} onError={e => (e.currentTarget.style.display = "none")} />}
                  <span style={{ flex: 1, color: "var(--muted)" }}>{s.name}</span>
                  <span>${s.amount}/{s.cycle === "monthly" ? "mo" : "yr"}</span>
                </div>
              ))}
              {pmSubs.length === 0 && <div style={{ fontSize: 12, color: "var(--muted)" }}>No subscriptions</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
