"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Navbar from "@/components/Navbar"
import { Ship, Calendar, Anchor, Plus, Trash2, ArrowRight, ArrowLeft, MessageSquarePlus } from "lucide-react"

export default function ExperienceStep() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [userRoles, setUserRoles] = useState<any[]>([])
  const [vesselTypes, setVesselTypes] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  
  // Local state for the experience entries
  const [roleHistory, setRoleHistory] = useState<Record<string, any[]>>({})
  const [showRequestInput, setShowRequestInput] = useState<Record<number, boolean>>({})

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push("/login")

      // 1. Fetch lookup vessel types
      const { data: vTypes } = await supabase
        .from('lookup_vessel_types')
        .select('*')
        .order('display_order')
      
      if (vTypes) {
        setVesselTypes([...vTypes, { id: 'request', type_name: 'Request New Type...' }])
      }

      // 2. Get roles user selected in Step 2
      const { data: uRoles } = await supabase
        .from('profile_roles')
        .select(`role_id, lookup_roles(role_name)`)
        .eq('profile_id', user.id)

      if (uRoles) {
        setUserRoles(uRoles)
        const initialHistory: Record<string, any[]> = {}
        uRoles.forEach(r => {
          initialHistory[r.role_id] = [{ 
            id: Date.now(), 
            vessel_name: '', 
            vessel_type_id: '', 
            vessel_imo: '',
            vessel_length_meters: '',
            start_date: '', 
            end_date: '', 
            description: '',
            requested_type: '' 
          }]
        })
        setRoleHistory(initialHistory)
      }
      setLoading(false)
    }
    fetchData()
  }, [router])

  const currentRole = userRoles[currentIndex]

  const updateEntry = (roleId: string, entryId: number, field: string, value: any) => {
    setRoleHistory(prev => ({
      ...prev,
      [roleId]: prev[roleId].map(entry => 
        entry.id === entryId ? { ...entry, [field]: value } : entry
      )
    }))
  }

  const handleTypeChange = (roleId: string, entryId: number, value: string) => {
    const isRequest = value === 'request'
    setShowRequestInput(prev => ({ ...prev, [entryId]: isRequest }))
    updateEntry(roleId, entryId, 'vessel_type_id', isRequest ? null : value)
  }

  const addEntry = (roleId: string) => {
    setRoleHistory(prev => ({
      ...prev,
      [roleId]: [...prev[roleId], { 
        id: Date.now(), vessel_name: '', vessel_type_id: '', vessel_length_meters: '', 
        start_date: '', end_date: '', description: '' 
      }]
    }))
  }

  const removeEntry = (roleId: string, entryId: number) => {
    setRoleHistory(prev => ({
      ...prev,
      [roleId]: prev[roleId].filter(e => e.id !== entryId)
    }))
  }

  const isCurrentRoleValid = () => {
    const entries = roleHistory[currentRole?.role_id] || []
    return entries.every(e => 
      (e.vessel_type_id || e.requested_type) && 
      e.start_date && 
      e.end_date && 
      e.vessel_length_meters
    )
  }

  const saveAllExperience = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    // 1. Prepare history inserts
    const historyInserts: any[] = []
    const requestInserts: any[] = []

    Object.keys(roleHistory).forEach(roleId => {
      roleHistory[roleId].forEach(entry => {
        historyInserts.push({
          profile_id: user?.id,
          role_id: roleId,
          vessel_type_id: entry.vessel_type_id || null,
          vessel_name: entry.vessel_name,
          vessel_imo: entry.vessel_imo,
          vessel_length_meters: parseInt(entry.vessel_length_meters),
          start_date: entry.start_date,
          end_date: entry.end_date,
          description: entry.description
        })

        if (entry.requested_type) {
          requestInserts.push({
            profile_id: user?.id,
            requested_name: entry.requested_type
          })
        }
      })
    })

    // 2. Batch Save
    await supabase.from('experience_history').insert(historyInserts)
    if (requestInserts.length > 0) {
      await supabase.from('vessel_type_requests').insert(requestInserts)
    }
    
    router.push("/profile/summary")
    setSaving(false)
  }

  const handleNext = async () => {
    if (currentIndex < userRoles.length - 1) {
      setCurrentIndex(currentIndex + 1)
      window.scrollTo(0, 0)
    } else {
      await saveAllExperience()
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-500">Loading Experience...</div>

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32">
      <Navbar onLogout={() => router.push("/login")} />
      
      <div className="max-w-md mx-auto p-4 pt-8">
        <header className="mb-6">
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded">
            Role {currentIndex + 1} / {userRoles.length}
          </span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {currentRole.lookup_roles.role_name}
          </h1>
          <p className="text-slate-500 text-sm">List the vessels where you held this position.</p>
        </header>

        <div className="space-y-6">
          {roleHistory[currentRole.role_id]?.map((entry, index) => (
            <div key={entry.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-tight">Vessel Entry #{index + 1}</h3>
                {index > 0 && (
                  <button onClick={() => removeEntry(currentRole.role_id, entry.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Vessel Name</label>
                    <input 
                      className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="e.g. Atlantic Guardian"
                      value={entry.vessel_name}
                      onChange={(e) => updateEntry(currentRole.role_id, entry.id, 'vessel_name', e.target.value)}
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Vessel Type</label>
                    <select 
                      className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      onChange={(e) => handleTypeChange(currentRole.role_id, entry.id, e.target.value)}
                    >
                      <option value="">Select Type</option>
                      {vesselTypes.map(t => (
                        <option key={t.id} value={t.id}>{t.type_name}</option>
                      ))}
                    </select>
                    
                    {showRequestInput[entry.id] && (
                      <div className="mt-2 flex items-center gap-2 animate-in slide-in-from-top-1">
                        <MessageSquarePlus className="w-4 h-4 text-blue-500" />
                        <input 
                          className="flex-1 p-2 text-sm rounded-lg border-blue-200 bg-blue-50 focus:border-blue-400 outline-none"
                          placeholder="What type of vessel was it?"
                          onChange={(e) => updateEntry(currentRole.role_id, entry.id, 'requested_type', e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">IMO (Optional)</label>
                    <input 
                      className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-800 text-sm"
                      placeholder="7 digits"
                      onChange={(e) => updateEntry(currentRole.role_id, entry.id, 'vessel_imo', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Length (m)</label>
                    <input 
                      type="number"
                      className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-800 text-sm"
                      placeholder="meters"
                      onChange={(e) => updateEntry(currentRole.role_id, entry.id, 'vessel_length_meters', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Joined</label>
                    <input type="date" className="w-full p-3 rounded-xl border text-sm" onChange={(e) => updateEntry(currentRole.role_id, entry.id, 'start_date', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Left</label>
                    <input type="date" className="w-full p-3 rounded-xl border text-sm" onChange={(e) => updateEntry(currentRole.role_id, entry.id, 'end_date', e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Key Duties</label>
                  <textarea 
                    rows={2}
                    className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-800 text-sm"
                    placeholder="Specific equipment or responsibilities..."
                    onChange={(e) => updateEntry(currentRole.role_id, entry.id, 'description', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}

          <button 
            onClick={() => addEntry(currentRole.role_id)}
            className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl flex items-center justify-center gap-2 text-slate-400 font-bold hover:bg-white hover:text-blue-600 hover:border-blue-200 transition-all"
          >
            <Plus className="w-5 h-5" /> Add Another Vessel for {currentRole.lookup_roles.role_name}
          </button>
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 p-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t flex gap-3 z-50">
        <button 
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex(currentIndex - 1)}
          className="p-4 rounded-2xl border bg-white dark:bg-slate-900 disabled:opacity-20 transition-opacity shadow-sm"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <button
          onClick={handleNext}
          disabled={!isCurrentRoleValid() || saving}
          className={`flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${isCurrentRoleValid() ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}
        >
          {saving ? "Saving..." : currentIndex === userRoles.length - 1 ? "Complete Profile" : "Next Role"} 
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}