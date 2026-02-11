"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Navbar from "@/components/Navbar"
import { Anchor, ArrowRight } from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const checkOnboarding = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        return router.push("/login")
      }

      setUserEmail(user.email ?? "")

      // Fetch the completion flag and name from the profiles table
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, setup_completed')
        .eq('id', user.id)
        .single()

      if (!profileError) {
        setProfile(data)
      }
      
      setLoading(false)
    }
    checkOnboarding()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <p className="text-slate-500 dark:text-slate-400">Loading your profile...</p>
      </div>
    )
  }

  // --- 1. THE WIZARD GATE ---
  // If setup isn't finished, force them into the wizard path
  if (!profile?.setup_completed) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border dark:border-slate-800 text-center">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Anchor className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome Aboard! 🚢</h1>
          <p className="mt-4 text-slate-600 dark:text-slate-400 leading-relaxed">
            To get started, let's build your professional offshore profile. It only takes a few minutes to add your first role and vessel.
          </p>
          <button 
            onClick={() => router.push("/profile/setup")}
            className="mt-8 w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all group"
          >
            Start Profile Setup
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button 
            onClick={handleLogout}
            className="mt-4 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  // --- 2. THE ACTUAL DASHBOARD ---
  // This only renders if setup_completed is true
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar onLogout={handleLogout} />

      <div className="max-w-5xl mx-auto px-8 py-12">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Fleet Command
        </h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Welcome back, {profile.full_name || userEmail}
        </p>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border dark:border-slate-800 shadow-sm">
             <h4 className="font-bold text-slate-900 dark:text-white">Your Experience</h4>
             <p className="text-sm text-slate-500 mt-1">Update your roles and vessel history.</p>
             <button 
               onClick={() => router.push('/profile/summary')}
               className="mt-4 text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline"
             >
               View Profile Summary <ArrowRight className="w-3 h-3" />
             </button>
           </div>
        </div>
      </div>
    </div>
  )
}