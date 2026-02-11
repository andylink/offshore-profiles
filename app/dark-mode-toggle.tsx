"use client"

import { useTheme } from "@/context/ThemeContext"

export const DarkModeToggle = () => {
  const { darkMode, toggleDarkMode } = useTheme()

  return (
    <button
      onClick={toggleDarkMode}
      className="px-3 py-1 border rounded-lg text-slate-700 dark:text-slate-200 dark:border-slate-600"
    >
      {darkMode ? "☀️ Light" : "🌙 Dark"}
    </button>
  )
}

