"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface Settings {
  currency: string;
  theme: string;
  remind_3d: boolean;
  remind_7d: boolean;
  remind_14d: boolean;
}

interface SettingsCtx {
  settings: Settings;
  setSettings: (s: Settings) => void;
  saveSettings: (s: Settings) => Promise<void>;
  currencySymbol: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", CAD: "CA$", AUD: "A$", EGP: "E£"
};

const defaultSettings: Settings = { currency: "USD", theme: "dark", remind_3d: false, remind_7d: true, remind_14d: false };

const Ctx = createContext<SettingsCtx>({
  settings: defaultSettings,
  setSettings: () => {},
  saveSettings: async () => {},
  currencySymbol: "$",
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<Settings>(defaultSettings);

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(data => {
      if (data && !data.error) {
        const s = { ...data, remind_3d: !!data.remind_3d, remind_7d: !!data.remind_7d, remind_14d: !!data.remind_14d };
        setSettingsState(s);
        document.documentElement.className = s.theme === "light" ? "light" : "dark";
      }
    }).catch(() => {});
  }, []);

  const saveSettings = async (s: Settings) => {
    setSettingsState(s);
    document.documentElement.className = s.theme === "light" ? "light" : "dark";
    await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
  };

  return (
    <Ctx.Provider value={{ settings, setSettings: setSettingsState, saveSettings, currencySymbol: CURRENCY_SYMBOLS[settings.currency] || "$" }}>
      {children}
    </Ctx.Provider>
  );
}

export const useSettings = () => useContext(Ctx);
