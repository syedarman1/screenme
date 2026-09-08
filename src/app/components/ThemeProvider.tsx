"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
}>({ theme: "light", toggle: () => {} });

export const useTheme = () => useContext(ThemeContext);

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    let initial: Theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    try {
      const stored = localStorage.getItem("screenme-theme");
      if (stored === "light" || stored === "dark") initial = stored;
    } catch { /* Storage can be unavailable in privacy-restricted browsers. */ }
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    // Enable the global fade only for the duration of the switch.
    const el = document.documentElement;
    el.classList.add("theme-transition");
    window.setTimeout(() => el.classList.remove("theme-transition"), 400);
    setTheme(next);
    el.setAttribute("data-theme", next);
    try { localStorage.setItem("screenme-theme", next); } catch { /* Keep the theme usable without persistence. */ }
  };

  // The layout script sets the initial CSS theme; render content on the server.

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
