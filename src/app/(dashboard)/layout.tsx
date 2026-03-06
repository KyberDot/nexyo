"use client";
import { useState, useEffect, useRef, createContext, useContext } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useSettings } from "@/lib/SettingsContext";

export const SearchContext = createContext<{ search: string }>({ search: "" });
export const useSearch = () => useContext(SearchContext);

const NAV = [
  { section: "Main", items: [
    { label: "Dashboard", href: "/dashboard", icon: "🏠" },
    { label: "AI Agent", href: "/dashboard/ai", icon: "🤖" },
  ]},
  { section: "Subscriptions", items: [
    { label: "My Subscriptions", href: "/dashboard/subscriptions", icon: "📋" },
    { label: "My Bills", href: "/dashboard/bills", icon: "🧾" },
    { label: "Debts", href: "/dashboard/debts", icon: "💸" },
    { label: "Analytics", href: "/dashboard/analytics", icon: "📊" },
    { label: "Categories", href: "/dashboard/categories", icon: "🏷️" },
    { label: "Family", href: "/dashboard/family", icon: "👨‍👩‍👧" },
    { label: "Payment Methods", href: "/dashboard/payments", icon: "💳" },
    { label: "Notifications", href: "/dashboard/notifications", icon: "🔔" },
    { label: "Shared Links", href: "/dashboard/shares", icon: "🔗" },
  ]},
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { platform, userAvatar, userName, userRole, reloadProfile } = useSettings();
  const [notifCount, setNotifCount] = useState(0);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status]);
  useEffect(() => { reloadProfile(); setSearch(""); }, [pathname]);

  useEffect(() => {
    fetch("/api/notifications").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setNotifCount(data.filter((n: any) => !n.read).length);
    }).catch(() => {});
  }, [pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (status === "loading") return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div style={{ color: "var(--muted)", fontSize: 14 }}>Loading...</div>
    </div>
  );
  if (!session) return null;

  const accentColor = platform?.primary_color || "#6366F1";
  const appName = platform?.app_name || "Vexyo";
  const displayName = userName || session.user?.name || "User";
  const initials = displayName[0]?.toUpperCase() || "U";

  const Avatar = ({ size = 32 }: { size?: number }) => (
    <div style={{ width: size, height: size, borderRadius: 99, background: accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "white", fontSize: size * 0.38, flexShrink: 0, overflow: "hidden", cursor: "pointer" }}>
      {userAvatar
        ? <img src={userAvatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" onError={e => { (e.currentTarget as HTMLElement).style.display = "none"; }} />
        : initials}
    </div>
  );

  return (
    <SearchContext.Provider value={{ search }}>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>
        
        {/* Sidebar */}
        <div style={{ width: collapsed ? 52 : 218, background: "var(--surface)", borderRight: "1px solid var(--border-color)", height: "100%", display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto", overflowX: "hidden", transition: "width 0.2s ease" }}>
          
          {/* Logo + collapse */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: collapsed ? "14px 12px" : "14px 12px 14px 14px", marginBottom: 6, justifyContent: collapsed ? "center" : "space-between" }}>
            {!collapsed && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, overflow: "hidden", flexShrink: 0 }}>
                  {platform?.logo ? <img src={platform.logo} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt="logo" /> : "💰"}
                </div>
                <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{appName}</span>
              </div>
            )}
            <button onClick={() => setCollapsed(c => !c)} style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--muted)", fontSize: 12, flexShrink: 0 }} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
              {collapsed ? "›" : "‹"}
            </button>
          </div>

          {/* Nav */}
          <div style={{ flex: 1, padding: "0 6px" }}>
            {NAV.map(section => (
              <div key={section.section}>
                {!collapsed && <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "8px 8px 3px" }}>{section.section}</div>}
                {collapsed && <div style={{ height: 10 }} />}
                {section.items.map(item => {
                  const active = pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: collapsed ? 0 : 8, padding: collapsed ? "9px 0" : "8px 10px", borderRadius: 7, marginBottom: 1, background: active ? `rgba(var(--accent-rgb), 0.12)` : "transparent", color: active ? "var(--accent)" : "var(--muted)", fontWeight: active ? 600 : 400, fontSize: 13, transition: "background 0.12s", justifyContent: collapsed ? "center" : "flex-start" }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--surface2)"; (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
                      onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = active ? "var(--accent)" : "var(--muted)"; } }}>
                      <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
                      {!collapsed && <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>}
                      {!collapsed && item.label === "Notifications" && notifCount > 0 && (
                        <span style={{ background: "#EF4444", color: "white", borderRadius: 99, fontSize: 10, fontWeight: 700, padding: "1px 6px", flexShrink: 0 }}>{notifCount}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
            {userRole === "admin" && (
              <>
                {!collapsed && <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "8px 8px 3px" }}>Admin</div>}
                <Link href="/admin" title={collapsed ? "Admin Portal" : undefined} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: collapsed ? 0 : 8, padding: collapsed ? "9px 0" : "8px 10px", borderRadius: 7, background: pathname === "/admin" ? `rgba(var(--accent-rgb), 0.12)` : "transparent", color: pathname === "/admin" ? "var(--accent)" : "var(--muted)", fontSize: 13, justifyContent: collapsed ? "center" : "flex-start" }}>
                  <span style={{ fontSize: 15 }}>🛡️</span>
                  {!collapsed && <span>Admin Portal</span>}
                </Link>
              </>
            )}
          </div>

          {/* User footer */}
          {!collapsed && (
            <div style={{ padding: "10px 8px", borderTop: "1px solid var(--border-color)" }}>
              <div ref={userMenuRef} style={{ position: "relative" }}>
                <div onClick={() => setShowUserMenu(p => !p)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px", borderRadius: 8, cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--surface2)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                  <Avatar size={30} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.user?.email}</div>
                  </div>
                  <span style={{ color: "var(--muted)", fontSize: 11 }}>{showUserMenu ? "▴" : "▾"}</span>
                </div>
                {showUserMenu && (
                  <div style={{ position: "absolute", bottom: "100%", left: 0, right: 0, background: "var(--surface)", border: "1px solid var(--border-color)", borderRadius: 10, overflow: "hidden", marginBottom: 4, zIndex: 100 }}>
                    {[{ href: "/dashboard/profile", icon: "👤", label: "Profile" }, { href: "/dashboard/settings", icon: "⚙️", label: "Settings" }].map(item => (
                      <Link key={item.href} href={item.href} onClick={() => setShowUserMenu(false)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", textDecoration: "none", color: "var(--text)", fontSize: 13 }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--surface2)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                        <span>{item.icon}</span>{item.label}
                      </Link>
                    ))}
                    <div style={{ borderTop: "1px solid var(--border-color)" }} />
                    <button onClick={() => signOut({ callbackUrl: "/login" })} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", width: "100%", background: "none", border: "none", color: "#EF4444", fontSize: 13, cursor: "pointer" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                      ↩ Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          {collapsed && (
            <div style={{ padding: "10px 0", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "center" }}>
              <Link href="/dashboard/profile"><Avatar size={28} /></Link>
            </div>
          )}
        </div>

        {/* Main */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
          {/* Top bar */}
          <div style={{ height: 54, borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", paddingLeft: 16, paddingRight: 16, background: "var(--surface)", flexShrink: 0, gap: 10 }}>
            {/* Search */}
            <div style={{ flex: 1, maxWidth: 480, position: "relative" }}>
              <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 13, pointerEvents: "none" }}>🔍</span>
              <input
                className="input"
                placeholder="Search subscriptions, bills, debts..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 34, height: 36, fontSize: 13 }}
              />
              {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 14, padding: 0 }}>✕</button>}
            </div>

            {/* Right side controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
              <Link href="/dashboard/notifications" title="Notifications" style={{ position: "relative", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, color: "var(--muted)", textDecoration: "none", fontSize: 16 }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--surface2)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                🔔
                {notifCount > 0 && <span style={{ position: "absolute", top: 7, right: 7, width: 7, height: 7, borderRadius: 99, background: "#EF4444" }} />}
              </Link>
              <Link href="/dashboard/settings" title="Settings" style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, color: "var(--muted)", textDecoration: "none", fontSize: 16 }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--surface2)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>⚙️</Link>
              <button onClick={() => signOut({ callbackUrl: "/login" })} title="Sign out" style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: "none", border: "1px solid var(--border-color)", color: "var(--muted)", cursor: "pointer", fontSize: 14 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)"; (e.currentTarget as HTMLElement).style.color = "#EF4444"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(239,68,68,0.3)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = "var(--muted)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)"; }}>
                ↩
              </button>
              <div ref={userMenuRef} style={{ position: "relative" }}>
                <div onClick={() => setShowUserMenu(p => !p)}>
                  <Avatar size={32} />
                </div>
                {showUserMenu && (
                  <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "var(--surface)", border: "1px solid var(--border-color)", borderRadius: 10, overflow: "hidden", zIndex: 100, minWidth: 180 }}>
                    <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border-color)" }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{displayName}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{session.user?.email}</div>
                    </div>
                    {[{ href: "/dashboard/profile", icon: "👤", label: "Profile" }, { href: "/dashboard/settings", icon: "⚙️", label: "Settings" }].map(item => (
                      <Link key={item.href} href={item.href} onClick={() => setShowUserMenu(false)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", textDecoration: "none", color: "var(--text)", fontSize: 13 }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--surface2)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                        <span>{item.icon}</span>{item.label}
                      </Link>
                    ))}
                    <div style={{ borderTop: "1px solid var(--border-color)" }} />
                    <button onClick={() => signOut({ callbackUrl: "/login" })} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", width: "100%", background: "none", border: "none", color: "#EF4444", fontSize: 13, cursor: "pointer" }}>
                      ↩ Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Page content */}
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: 24 }}>
            {children}
          </div>
        </div>
      </div>
    </SearchContext.Provider>
  );
}
