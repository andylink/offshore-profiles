"use client"

import { DarkModeToggle } from "@/app/dark-mode-toggle"

type NavbarProps = {
  onLogout?: () => void
  showLogout?: boolean
}

export default function Navbar({ onLogout, showLogout = true }: NavbarProps) {
  return (
    <nav className="flex justify-between items-center px-8 py-6 border-b bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
      <h1 className="font-semibold text-lg text-slate-900 dark:text-white">
        OffshoreProfiles
      </h1>
      <div className="flex items-center gap-4">
        <DarkModeToggle />
        {showLogout && onLogout && (
          <button
            onClick={onLogout}
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  )
}

