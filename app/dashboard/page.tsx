"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { DarkModeToggle } from "@/app/dark-mode-toggle"

export default function DashboardPage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser()

      if (error || !data.user) {
        router.push("/login")
      } else {
        setUserEmail(data.user.email ?? "")
      }

      setLoading(false)
    }

    getUser()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <p className="text-slate-500 dark:text-slate-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      
      {/* Top Nav */}
      <nav className="flex justify-between items-center px-8 py-6 border-b bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <h1 className="font-semibold text-lg text-slate-900 dark:text-white">OffshoreProfiles</h1>
        <div className="flex items-center gap-4">
          <DarkModeToggle />
          <button
            onClick={handleLogout}
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-8 py-12">
        
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Dashboard
        </h2>

        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Welcome back {userEmail}
        </p>

        {/* Profile Status Card */}
        <div className="mt-10 bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
            Your Profile
          </h3>

          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Your offshore professional profile is not yet completed.
          </p>

          <button className="mt-6 bg-blue-600 dark:bg-blue-700 text-white px-5 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition">
            Complete Profile
          </button>
        </div>

      </div>
    </div>
  )
}
