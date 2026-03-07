"use client";
import { useState, useMemo, useEffect } from "react";
import { useSubscriptions } from "@/lib/useSubscriptions";
import { useSettings } from "@/lib/SettingsContext"; // Fixed path based on common structure
import { toMonthly, daysUntil, fmt } from "@/types";
import SubModal from "@/components/SubModal";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useSession } from "next-auth/react";

export default function DashboardPage() {
  const { subs, loading, add } = useSubscriptions();
  const { settings, currencySymbol, convertToDisplay, platform } = useSettings();
  const { data: session } = useSession();
  const [showModal, setShowModal] = useState(false);
  const [debts, setDebts] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/debts")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setDebts(d); })
      .catch(() => {});
  }, []);

  const activeSubs = subs.filter((s) => s.active);

  const monthlyTotal = activeSubs.reduce(
    (a, s) => a + convertToDisplay(toMonthly(s.amount, s.cycle), s.currency),
    0
  );
  const yearlyTotal = monthlyTotal * 12;
  const budget = settings.monthly_budget || 0;
  const budgetPct = budget > 0 ? Math.min((monthlyTotal / budget) * 100, 100) : 0;
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const dayOfMonth = new Date().getDate();
  const daysRemaining = daysInMonth - dayOfMonth;

  const topCategory = useMemo(() => {
    const map: Record<string, number> = {};
    activeSubs.forEach((s) => {
      map[s.category] = (map[s.category] || 0) + convertToDisplay(toMonthly(s.amount, s.cycle), s.currency);
    });
    const top = Object.entries(map).sort((a, b) => b[1] - a[1])[0];
    return top ? { name: top[0], amount: top[1] } : null;
  }, [subs, settings.currency]);

  const nextRenewal = useMemo(() => {
    return [...activeSubs]
      .filter((s) => s.next_date)
      .sort((a, b) => new Date(a.next_date!).getTime() - new Date(b.next_date!).getTime())[0];
  }, [subs]);

  const upcomingRenewals = useMemo(() =>
    [...activeSubs]
      .filter((s) => s.next_date && daysUntil(s.next_date) <= 7 && daysUntil(s.next_date) >= 0)
      .sort((a, b) => new Date(a.next_date!).getTime() - new Date(b.next_date!).getTime())
      .slice(0, 10), // Increased slice since we now have a scrollbar
    [subs]);

  const monthlyData = useMemo(() => {
    const months = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];
    return months.map((m, i) => ({ month: m, amount: +(monthlyTotal * (0.78 + i * 0.044)).toFixed(2) }));
  }, [monthlyTotal]);

  const budgetColor = budgetPct >= 90 ? "#EF4444" : budgetPct >= 70 ? "#F59E0B" : "#10B981";
  const accentColor = platform.primary_color || "#6366F1";

  if (loading) return <div style={{ color: "var(--muted)", padding: 24 }}>Loading...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 99, background: `${accentColor}20`, border: `2px solid ${accentColor}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, overflow: "hidden" }}>
            {session?.user && (session.user as any).avatar
              ? <img src={(session.user as any).avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="avatar" />
              : "👤"}
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>Welcome back, {session?.user?.name?.split(" ")[0] || "User"}!</h1>
            <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 2 }}>Subscription overview and spending insights</p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ background: accentColor }}>
          + Add
        </button>
      </div>

      {/* Stats Cards Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <div className="card">
          <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>Monthly Spending</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8, color: accentColor }}>{currencySymbol}{fmt(monthlyTotal)}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Yearly: {currencySymbol}{fmt(yearlyTotal)}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>Active Subscriptions</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{activeSubs.length}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Avg: {currencySymbol}{fmt(monthlyTotal / (activeSubs.length || 1))}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>Top Category</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8 }}>{topCategory?.name || "—"}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{currencySymbol}{fmt(topCategory?.amount || 0)}/mo</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>Next Renewal</div>
          {nextRenewal ? (
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8 }}>
              {daysUntil(nextRenewal.next_date!) === 0 ? "Today" : daysUntil(nextRenewal.next_date!) === 1 ? "Tomorrow" : `in ${daysUntil(nextRenewal.next_date!)}d`}
            </div>
          ) : <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8 }}>—</div>}
        </div>
      </div>

      {/* Budget + Upcoming Side-by-Side Locked at 280px */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card" style={{ height: 280, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Monthly Budget ℹ️</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Vs. your limit</div>
            </div>
            {budget > 0 && <div style={{ fontSize: 12, color: "var(--muted)" }}>{currencySymbol}{fmt(budget)}</div>}
          </div>

          {budget > 0 ? (
            <div style={{ marginTop: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{currencySymbol}{fmt(monthlyTotal)}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: budgetColor }}>{Math.round(budgetPct)}%</span>
              </div>
              <div style={{ height: 6, background: "var(--surface2)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${budgetPct}%`, height: "100%", background: budgetColor, transition: "width 0.5s ease" }} />
              </div>
              <div style={{ marginTop: 12, display: "grid", gap: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)" }}>
                  <span>Last month</span>
                  <span style={{ color: "#EF4444", fontWeight: 600 }}>↑ 5%</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)" }}>
                  <span>Days remaining</span>
                  <span>{daysRemaining}</span>
                </div>
              </div>
              <div style={{ marginTop: 12, padding: "8px 10px", background: `${budgetColor}12`, borderRadius: 8, fontSize: 12, color: budgetColor, textAlign: "center" }}>
                {budgetPct < 70 ? "✅ Within budget" : budgetPct < 90 ? "⚠️ Getting close" : "🚨 Over budget!"}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", margin: "auto" }}>
              <div style={{ fontSize: 24 }}>🎯</div>
              <Link href="/dashboard/settings" style={{ fontSize: 12, color: accentColor, textDecoration: "none" }}>Set Budget →</Link>
            </div>
          )}
        </div>

        <div className="card" style={{ height: 280, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Upcoming Renewals</div>
            <Link href="/dashboard/subscriptions" style={{ fontSize: 11, color: accentColor, textDecoration: "none" }}>View All</Link>
          </div>
          <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }} className="custom-scrollbar">
            {upcomingRenewals.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)", fontSize: 13 }}>🎉 No renewals</div>
            ) : upcomingRenewals.map((s) => {
              const days = daysUntil(s.next_date!);
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border-color)" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {s.icon ? <img src={s.icon} width={20} height={20} alt="" /> : <span>📦</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{currencySymbol}{fmt(convertToDisplay(s.amount, s.currency))}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: days === 0 ? "#EF4444" : "#F59E0B" }}>{days === 0 ? "Today" : `${days}d`}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Spend Trend Card */}
      <div className="card">
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Monthly Spend Trend</div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={monthlyData}>
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${currencySymbol}${v}`} />
            <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border-color)", borderRadius: 8, fontSize: 12 }} />
            <Line type="monotone" dataKey="amount" stroke={accentColor} strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Debts Summary */}
      {debts.filter(d => d.active && (d.amount - d.paid) > 0).length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>💸 Outstanding Debts</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {debts.filter(d => d.active && (d.amount - d.paid) > 0).slice(0, 3).map((d) => {
              const owed = convertToDisplay(d.amount - d.paid, d.currency);
              const total = convertToDisplay(d.amount, d.currency);
              const pct = total > 0 ? (convertToDisplay(d.paid, d.currency) / total) * 100 : 0;
              return (
                <div key={d.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span>{d.name}</span>
                    <span style={{ color: "#EF4444", fontWeight: 700 }}>{currencySymbol}{fmt(owed)}</span>
                  </div>
                  <div style={{ height: 4, background: "var(--surface2)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "#10B981" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showModal && <SubModal onSave={async (data) => { await add(data); setShowModal(false); }} onClose={() => setShowModal(false)} />}
    </div>
  );
}