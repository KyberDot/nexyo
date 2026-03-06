"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { CURRENCY_SYMBOLS, EXCHANGE_RATES, PlatformSettings, DEFAULT_CATEGORIES, UserCategory } from "@/types";

interface Settings {
  currency: string; theme: string;
  remind_3d: boolean; remind_7d: boolean; remind_14d: boolean;
  monthly_budget: number; date_format: string; week_start: string;
}

interface SettingsCtx {
  settings: Settings; saveSettings: (s: Settings) => Promise<void>;
  currencySymbol: string;
  convertToDisplay: (amount: number, fromCurrency: string) => number;
  platform: PlatformSettings; savePlatform: (p: PlatformSettings) => Promise<void>;
  categories: UserCategory[]; reloadCategories: () => Promise<void>;
  userAvatar: string | null; userName: string | null; userRole: string | null;
  reloadProfile: () => Promise<void>;
}

const defaultSettings: Settings = {
  currency: "USD", theme: "dark", remind_3d: false, remind_7d: true, remind_14d: false,
  monthly_budget: 0, date_format: "MMM D, YYYY", week_start: "monday"
};
const defaultPlatform: PlatformSettings = { app_name: "Vexyo", primary_color: "#6366F1", allow_registration: true };

const Ctx = createContext<SettingsCtx>({
  settings: defaultSettings, saveSettings: async () => {},
  currencySymbol: "$", convertToDisplay: (a) => a,
  platform: defaultPlatform, savePlatform: async () => {},
  categories: DEFAULT_CATEGORIES, reloadCategories: async () => {},
  userAvatar: null, userName: null, userRole: null, reloadProfile: async () => {},
});

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `${r}, ${g}, ${b}`;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [platform, setPlatform] = useState<PlatformSettings>(defaultPlatform);
  const [categories, setCategories] = useState<UserCategory[]>(DEFAULT_CATEGORIES);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const applyTheme = (t: string) => { document.documentElement.className = t === "light" ? "light" : "dark"; };
  const applyColor = (c: string) => {
    document.documentElement.style.setProperty("--accent", c);
    document.documentElement.style.setProperty("--accent-rgb", hexToRgb(c));
  };

  const reloadProfile = useCallback(async () => {
    try {
      const r = await fetch("/api/profile");
      const d = await r.json();
      if (!d.error) { setUserAvatar(d.avatar || null); setUserName(d.name || null); setUserRole(d.role || null); }
    } catch {}
  }, []);

  const reloadCategories = useCallback(async () => {
    try {
      const r = await fetch("/api/categories");
      const d = await r.json();
      if (Array.isArray(d) && d.length > 0) setCategories(d);
      else setCategories(DEFAULT_CATEGORIES);
    } catch { setCategories(DEFAULT_CATEGORIES); }
  }, []);

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => {
      if (d && !d.error) {
        const s = { ...defaultSettings, ...d, remind_3d: !!d.remind_3d, remind_7d: !!d.remind_7d, remind_14d: !!d.remind_14d, monthly_budget: Number(d.monthly_budget) || 0 };
        setSettings(s); applyTheme(s.theme);
      }
    }).catch(() => {});
    fetch("/api/platform").then(r => r.json()).then(d => {
      if (d && !d.error) {
        const p = { ...defaultPlatform, ...d, allow_registration: !!d.allow_registration };
        setPlatform(p); applyColor(p.primary_color || "#6366F1");
        if (d.favicon) updateFavicon(d.favicon);
      }
    }).catch(() => {});
    reloadCategories();
    reloadProfile();
  }, []);

  const updateFavicon = (url: string) => {
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    link.href = url;
  };

  const saveSettings = async (s: Settings) => {
    setSettings(s); applyTheme(s.theme);
    await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
  };

  const savePlatform = async (p: PlatformSettings) => {
    setPlatform(p); applyColor(p.primary_color || "#6366F1");
    if (p.favicon) updateFavicon(p.favicon);
    await fetch("/api/platform", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
  };

  const convertToDisplay = (amount: number, from: string): number => {
    if (from === settings.currency) return amount;
    return (amount / (EXCHANGE_RATES[from] || 1)) * (EXCHANGE_RATES[settings.currency] || 1);
  };

  return (
    <Ctx.Provider value={{ settings, saveSettings, currencySymbol: CURRENCY_SYMBOLS[settings.currency] || "$", convertToDisplay, platform, savePlatform, categories, reloadCategories, userAvatar, userName, userRole, reloadProfile }}>
      {children}
    </Ctx.Provider>
  );
}

export const useSettings = () => useContext(Ctx);
