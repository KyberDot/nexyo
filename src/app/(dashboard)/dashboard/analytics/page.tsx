"use client";
import { useMemo } from "react";
import { useSettings } from "@/lib/SettingsContext";
import { useSubscriptions } from "@/lib/useSubscriptions";
import { toMonthly, fmt, CAT_COLORS } from "@/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Cell, PieChart, Pie } from "recharts";

export default function AnalyticsPage() {
  const { subs, loading } = useSubscriptions();
  const { currencySymbol } = useSettings();
  const activeSubs = subs.filter(s => s.active);
  const monthlyTotal = activeSubs.reduce((a, s) => a + toMonthly(s.amount, s.cycle), 0);

  const catBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    activeSubs.forEach(s => { map[s.category] = (map[s.category] || 0) + toMonthly(s.amount, s.cycle); });
    return Object.entries(map).map(([name, value]) => ({ name, value: +value.toFixed(2), color: CAT_COLORS[name] || "#94A3B8" })).sort((a, b) => b.value - a.value);
  }, [subs]);

  const monthlyData = useMemo(() => {
    const months = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];
    return months.map((m, i) => ({ month: m, amount: +(monthlyTotal * (0.78 + i * 0.044)).toFixed(2) }));
  }, [monthlyTotal]);

  const duplicates = useMemo(() => {
    const byCategory: Record<string, typeof subs> = {};
    activeSubs.forEach(s => { (byCategory[s.category] = byCategory[s.category] || []).push(s); });
    return Object.entries(byCategory).filter(([, arr]) => arr.length >= 3);
  }, [subs]);

  if (loading) return <div style={{ color: "var(--muted)" }}>Loading...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="fade-in">
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Analytics</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          { label: "Monthly", value: `$${fmt(monthlyTotal)}`, color: "#6366F1" },
          { label: "Yearly", value: `$${fmt(monthlyTotal * 12)}`, color: "#10B981" },
          { label: "Avg/Sub", value: `$${fmt(monthlyTotal / (activeSubs.length || 1))}`, color: "#F59E0B" },
        ].map(s => (
          <div key={s.label} className="card">
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Spend by Category</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={catBreakdown} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={85} />
              <Tooltip formatter={(v: any) => [`$${fmt(v)}`, "Monthly"]} contentStyle={{ background: "var(--surface)", border: "1px solid var(--border-color)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" radius={4}>{catBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Monthly Trend</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={(v: any) => [`$${v}`, "Spend"]} contentStyle={{ background: "var(--surface)", border: "1px solid var(--border-color)", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="amount" stroke="#6366F1" strokeWidth={2.5} dot={{ fill: "#6366F1", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Top Subscriptions by Cost</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[...activeSubs].sort((a, b) => toMonthly(b.amount, b.cycle) - toMonthly(a.amount, a.cycle)).slice(0, 8).map(s => {
            const monthly = toMonthly(s.amount, s.cycle);
            const pct = (monthly / monthlyTotal) * 100;
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {s.icon && <img src={s.icon} width={24} height={24} style={{ borderRadius: 4, background: "#fff", padding: 1 }} alt={s.name} onError={e => (e.currentTarget.style.display = "none")} />}
                <span style={{ flex: 1, fontSize: 14 }}>{s.name}</span>
                <div style={{ width: 120, height: 6, background: "var(--border-color)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: CAT_COLORS[s.category] || "#6366F1", borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, width: 60, textAlign: "right" }}>${fmt(monthly)}/mo</span>
              </div>
            );
          })}
        </div>
      </div>

      {duplicates.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 12 }}>⚠️ Potential Duplicates</div>
          {duplicates.map(([cat, arr]) => (
            <div key={cat} style={{ padding: 12, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#EF4444", marginBottom: 4 }}>{cat} — {arr.length} subscriptions</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {arr.map(s => <span key={s.id} style={{ fontSize: 12, color: "var(--muted)" }}>{s.name} (${s.amount}/{s.cycle})</span>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
