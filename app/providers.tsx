"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface ThemeContextType {
  isDark: boolean;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function Providers({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = savedTheme ? savedTheme === "dark" : prefersDark;
    
    setIsDark(shouldBeDark);
    setMounted(true);
  }, []);

  // Update DOM whenever isDark changes
  useEffect(() => {
    if (isDark === null) return;
    
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDark]);

  const toggleDarkMode = () => {
    setIsDark((prev) => {
      if (prev === null) return true;
      const newValue = !prev;
      localStorage.setItem("theme", newValue ? "dark" : "light");
      return newValue;
    });
  };

  // Prevent hydration mismatch
  if (!mounted || isDark === null) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a Providers component");
  }
  return context;
}
