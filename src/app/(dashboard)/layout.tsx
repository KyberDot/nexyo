"use client";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

const NAV = [
  { section: "Main", items: [
    { label: "Dashboard", href: "/dashboard", icon: "🏠" },
    { label: "AI Agent", href: "/dashboard/ai", icon: "🤖" },
  ]},
  { section: "Subscriptions", items: [
    { label: "My Subscriptions", href: "/dashboard/subscriptions", icon: "📋" },
    { label: "Analytics", href: "/dashboard/analytics", icon: "📊" },
    { label: "Categories", href: "/dashboard/categories", icon: "🏷️" },
    { label: "Family", href: "/dashboard/family", icon: "👨‍👩‍👧" },
    { label: "Payment Methods", href: "/dashboard/payments", icon: "💳" },
    { label: "Notifications", href: "/dashboard/notifications", icon: "🔔" },
    { label: "Shared Links", href: "/dashboard/shares", icon: "🔗" },
  ]},
  { section: "Account", items: [
    { label: "Settings", href: "/dashboard/settings", icon: "⚙️" },
  ]},
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [notifCount, setNotifCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status]);

  useEffect(() => {
    fetch("/api/notifications").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setNotifCount(data.filter((n: any) => !n.read).length);
    }).catch(() => {});
  }, [pathname]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (status === "loading") return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div style={{ color: "var(--muted)", fontSize: 14 }}>Loading...</div>
    </div>
  );

  if (!session) return null;

  const SidebarContent = () => (
    <div style={{ width: 220, background: "var(--surface)", borderRight: "1px solid var(--border-color)", height: "100%", display: "flex", flexDirection: "column", padding: "16px 12px", gap: 2, flexShrink: 0, overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 4px", marginBottom: 16 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "#6366F1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>💰</div>
        <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.3px" }}>Nexyo</span>
      </div>

      {NAV.map(section => (
        <div key={section.section}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "8px 12px 4px" }}>{section.section}</div>
          {section.items.map(item => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={`nav-item ${active ? "active" : ""}`} style={{ textDecoration: "none" }}>
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                <span>{item.label}</span>
                {item.label === "Notifications" && notifCount > 0 && (
                  <span style={{ marginLeft: "auto", background: "#EF4444", color: "white", borderRadius: 99, fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>{notifCount}</span>
                )}
              </Link>
            );
          })}
        </div>
      ))}

      <div style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid var(--border-color)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px" }}>
          <div style={{ width: 32, height: 32, borderRadius: 99, background: "#6366F1", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "white", fontSize: 13, flexShrink: 0 }}>
            {session.user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.user?.name}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.user?.email}</div>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/login" })} title="Sign out" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 14, padding: 2, flexShrink: 0 }}>↩</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>
      <div style={{ flexShrink: 0 }}><SidebarContent /></div>

      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex" }}>
          <div style={{ flexShrink: 0 }}><SidebarContent /></div>
          <div style={{ flex: 1, background: "rgba(0,0,0,0.5)" }} onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        <div style={{ height: 56, borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", padding: "0 20px", background: "var(--surface)", flexShrink: 0, gap: 12 }}>
          <div style={{ flex: 1 }} />
          <Link href="/dashboard/notifications" style={{ position: "relative", padding: 4, color: "var(--muted)", textDecoration: "none", fontSize: 18 }}>
            🔔
            {notifCount > 0 && <span style={{ position: "absolute", top: 0, right: 0, width: 8, height: 8, borderRadius: 99, background: "#EF4444", display: "block" }} />}
          </Link>
          <Link href="/dashboard/settings" style={{ color: "var(--muted)", textDecoration: "none", padding: 4, fontSize: 18 }}>⚙️</Link>
        </div>
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: 24 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
