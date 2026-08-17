import { createContext, useContext, useEffect, useState } from "react";
import { getSettings } from "../api/api";

// Site-wide settings (company contact info, socials, hero/about copy, stats)
// fetched once and shared across Header, Footer, Contact, Hero, etc. Consumers
// should ALWAYS fall back to their existing copy, e.g.
//   const { settings } = useSettings();
//   const phone = settings?.company_phone || "+91 9822845408";
// so the site renders identically until an admin fills these in.
const SettingsContext = createContext({ settings: null, loading: true });

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getSettings()
      .then((data) => {
        if (active) setSettings(data);
      })
      .catch(() => {
        if (active) setSettings(null); // network/API down → consumers use fallbacks
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
