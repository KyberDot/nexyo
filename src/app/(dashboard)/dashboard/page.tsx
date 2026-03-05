"use client";
import { useState, useMemo } from "react";
import { useSubscriptions } from "@/lib/useSubscriptions";
import { toMonthly, daysUntil, fmt, CAT_COLORS } from "@/types";
import SubModal from "@/components/SubModal";
import { useSettings } from "@/lib/SettingsContext";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function DashboardPage() {
  const { subs, loading, add, update, remove } = useSubscriptions();
  const { currencySymbol } = useSettings();
  const [showModal, setShowModal] = useState(false);

  const activeSubs = subs.filter(s => s.active);
  const monthlyTotal = activeSubs.reduce((a, s) => a + toMonthly(s.amount, s.cycle), 0);
  const yearlyTotal = monthlyTotal * 12;

  const upcomingRenewals = [...activeSubs]
    .filter(s => s.next_date && daysUntil(s.next_date) <= 30)
    .sort((a, b) => new Date(a.next_date!).getTime() - new Date(b.next_date!).getTime());

  const catBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    activeSubs.forEach(s => { map[s.category] = (map[s.category] || 0) + toMonthly(s.amount, s.cycle); });
    return Object.entries(map).map(([name, value]) => ({ name, value: +value.toFixed(2), color: CAT_COLORS[name] || "#94A3B8" }));
  }, [subs]);

  const monthlyData = useMemo(() => {
    const months = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];
    return months.map((m, i) => ({ month: m, amount: +(monthlyTotal * (0.8 + i * 0.04)).toFixed(2) }));
  }, [monthlyTotal]);

  if (loading) return <div style={{ color: "var(--muted)", fontSize: 14 }}>Loading...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Dashboard</h1>
          <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 2 }}>Overview of your subscriptions</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>+ Add Subscription</button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {[
          { label: "Monthly Spend", value: `${currencySymbol}${fmt(monthlyTotal)}`, sub: `${activeSubs.length} active`, color: "#6366F1" },
          { label: "Yearly Spend", value: `${currencySymbol}${fmt(yearlyTotal)}`, sub: "Projected total", color: "#10B981" },
          { label: "Upcoming (30d)", value: String(upcomingRenewals.length), sub: "Renewals this month", color: "#F59E0B" },
          { label: "Free Trials", value: String(activeSubs.filter(s => s.trial).length), sub: "Watch before charge", color: "#EF4444" },
        ].map(s => (
          <div key={s.label} className="card">
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 15 }}>Monthly Trend</div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={v => [`$${v}`, "Spend"]} contentStyle={{ background: "var(--surface)", border: "1px solid var(--border-color)", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="amount" stroke="#6366F1" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 15 }}>By Category</div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <PieChart width={110} height={110}>
              <Pie data={catBreakdown} cx={50} cy={50} innerRadius={30} outerRadius={50} dataKey="value" strokeWidth={0}>
                {catBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
            </PieChart>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              {catBreakdown.slice(0, 5).map(c => (
                <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: c.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, color: "var(--muted)" }}>{c.name}</span>
                  <span style={{ fontWeight: 600 }}>${fmt(c.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming */}
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 15 }}>Upcoming Renewals</div>
        {upcomingRenewals.length === 0
          ? <div style={{ color: "var(--muted)", fontSize: 14 }}>No renewals in the next 30 days 🎉</div>
          : upcomingRenewals.map(s => {
            const days = daysUntil(s.next_date!);
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border-color)" }}>
                {s.icon && <img src={s.icon} width={32} height={32} style={{ borderRadius: 8, background: "#fff", padding: 2, objectFit: "contain" }} alt={s.name} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{s.cycle} · {s.member}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 600 }}>{currencySymbol}{fmt(s.amount)}</div>
                  <div style={{ fontSize: 12, color: days <= 3 ? "#EF4444" : days <= 7 ? "#F59E0B" : "var(--muted)" }}>
                    {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days}d`}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {showModal && <SubModal onSave={async (data) => { await add(data); setShowModal(false); }} onClose={() => setShowModal(false)} />}
    </div>
  );
}
