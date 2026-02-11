"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Navbar from "@/components/Navbar"
import { Ship, Calendar, User, ArrowRight, Anchor, Edit2 } from "lucide-react"

export default function ProfileSummary() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [rolesData, setRolesData] = useState<any[]>([])

  useEffect(() => {
    const fetchSummaryData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push("/login")

      // 1. Fetch Profile info
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setProfile(profileData)

      /** * 2. Updated Fetching Logic 
       * We now fetch history linked via profile_role_id
       */
      const { data: roles, error } = await supabase
        .from('profile_roles')
        .select(`
          id,
          lookup_roles (role_name),
          experience_history (
            id,
            vessel_name,
            vessel_length_meters,
            start_date,
            end_date,
            description,
            lookup_vessel_types (type_name)
          )
        `)
        .eq('profile_id', user.id)

      if (error) {
        console.error("Fetch error:", error.message)
      } else {
        setRolesData(roles || [])
      }
      setLoading(false)
    }
    fetchSummaryData()
  }, [router])

  const handleConfirm = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return

  // 1. Silent update to the database
  const { error } = await supabase
    .from('profiles')
    .update({ setup_completed: true })
    .eq('id', user.id)

  if (error) {
    console.error("Error finalizing profile:", error.message)
    // Optional: show a toast or alert if the update fails
    return
  }

  // 2. Redirect to dashboard
  router.push('/dashboard')
}
  
  const calculateSeaTime = (history: any[]) => {
    if (!history || history.length === 0) return "0mo"
    let totalDays = 0
    history.forEach(entry => {
      if (entry.start_date && entry.end_date) {
        const start = new Date(entry.start_date)
        const end = new Date(entry.end_date)
        totalDays += Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      }
    })
    
    const years = Math.floor(totalDays / 365)
    const months = Math.floor((totalDays % 365) / 30)
    
    let timeString = ""
    if (years > 0) timeString += `${years}yr `
    timeString += `${months}mo`
    return timeString
  }

  if (loading) return <div className="p-8 text-center text-slate-500">Preparing your sea-chest... 🧳</div>

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32">
      <Navbar onLogout={() => router.push("/login")} />
      
      <div className="max-w-2xl mx-auto p-4 pt-8">
        <header className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
            <Anchor className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Profile Review</h1>
          <p className="text-slate-500 text-sm">Review your sea-time before heading to your dashboard.</p>
        </header>

        {/* Personal Details Card */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border dark:border-slate-800 mb-6 relative">
          <button onClick={() => router.push('/profile/setup')} className="absolute top-6 right-6 text-slate-400 hover:text-blue-600 transition-colors">
            <Edit2 className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 mb-4 text-blue-600">
            <User className="w-4 h-4" />
            <h2 className="text-xs font-black uppercase tracking-widest">Personal</h2>
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{profile?.full_name}</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-2 italic">
            {profile?.bio || "No profile summary added."}
          </p>
        </section>

        {/* Roles & History Section */}
        <div className="space-y-6">
          {rolesData.map((role) => (
            <div key={role.id} className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex justify-between items-center border-b dark:border-slate-800">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {role.lookup_roles?.role_name}
                  </h3>
                  <div className="flex items-center gap-1 text-blue-600 text-xs font-bold">
                    <Calendar className="w-3 h-3" />
                    Actual Sea Time: {calculateSeaTime(role.experience_history)}
                  </div>
                </div>
                <button onClick={() => router.push('/profile/experience')} className="text-slate-400 hover:text-blue-600 transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {role.experience_history?.length > 0 ? (
                  role.experience_history.map((vessel: any) => (
                    <div key={vessel.id} className="flex gap-4 group">
                      <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl h-fit">
                        <Ship className="w-5 h-5 text-slate-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-slate-900 dark:text-white">{vessel.vessel_name || "Unspecified Vessel"}</h4>
                          <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                            {vessel.lookup_vessel_types?.type_name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {vessel.vessel_length_meters}m • {vessel.start_date} to {vessel.end_date}
                        </p>
                        {vessel.description && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-3 border-l-2 border-slate-100 dark:border-slate-800 pl-3 leading-relaxed">
                            {vessel.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 text-center py-4">No vessel history added for this role.</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Dashboard Button */}
        <div className="mt-12 space-y-4">
          <button 
  onClick={handleConfirm}
  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 group"
>
  Confirm & Go to Dashboard
  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
</button>
        </div>
      </div>
    </div>
  )
}