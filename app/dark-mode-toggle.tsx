"use client";

import { useTheme } from "./providers";

export function DarkModeToggle() {
  const { isDark, toggleDarkMode } = useTheme();

  return (
    <button
      onClick={() => {
        toggleDarkMode();
      }}
      className="rounded-lg bg-gray-200 p-2 text-black dark:bg-gray-800 dark:text-white transition-colors"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      type="button"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
