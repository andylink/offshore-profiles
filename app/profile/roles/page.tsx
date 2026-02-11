"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Navbar from "@/components/Navbar"
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react"

export default function ProfileStepTwo() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Data State
  const [roles, setRoles] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])

  useEffect(() => {
    const initFetch = async () => {
      // 1. Check Auth
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push("/login")

      // 2. Fetch Roles
      const { data } = await supabase
        .from('lookup_roles')
        .select('*')
        .order('display_order', { ascending: true })

      if (data) {
        setRoles(data)
        const uniqueCats = Array.from(new Set(data.map(r => r.category)))
        setCategories(uniqueCats)
      }
      setLoading(false)
    }
    initFetch()
  }, [router])

  const toggleRole = (id: string) => {
    setSelectedRoleIds(prev => 
      prev.includes(id) ? prev.filter(roleId => roleId !== id) : [...prev, id]
    )
  }

  const hasSelection = (cat: string) => {
    return roles.some(r => r.category === cat && selectedRoleIds.includes(r.id))
  }

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Clean up existing roles and insert new ones (Junction Table Approach)
    await supabase.from('profile_roles').delete().eq('profile_id', user.id)
    
    const inserts = selectedRoleIds.map(roleId => ({
      profile_id: user.id,
      role_id: roleId
    }))

    const { error } = await supabase.from('profile_roles').insert(inserts)

    if (!error) {
      router.push("/profile/certs")
    }
    setSaving(false)
  }

  if (loading) return <div className="p-8 text-center">Loading Roles...</div>

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <Navbar onLogout={() => supabase.auth.signOut().then(() => router.push("/login"))} />
      
      <div className="max-w-md mx-auto p-4 pt-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Your Roles</h1>
          <p className="text-slate-500">Pick all the roles you are qualified for.</p>
        </header>

        {/* View 1: Category List */}
        {!activeCategory ? (
          <div className="space-y-3">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm"
              >
                <div className="flex items-center gap-3">
                  {hasSelection(cat) && <CheckCircle2 className="text-green-500 w-5 h-5" />}
                  <span className="font-medium">{cat}</span>
                </div>
                <ChevronRight className="text-slate-400 w-5 h-5" />
              </button>
            ))}
          </div>
        ) : (
          /* View 2: Specific Roles List */
          <div className="space-y-4">
            <button 
              onClick={() => setActiveCategory(null)}
              className="flex items-center text-blue-600 text-sm font-semibold"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Back to Categories
            </button>
            
            <h2 className="text-lg font-bold px-1">{activeCategory}</h2>
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
              {roles.filter(r => r.category === activeCategory).map(role => (
                <label key={role.id} className="flex items-center justify-between p-4 cursor-pointer">
                  <span className="text-slate-700 dark:text-slate-300">{role.role_name}</span>
                  <input 
                    type="checkbox"
                    checked={selectedRoleIds.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fixed Navigation Footer */}
      {selectedRoleIds.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 p-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-md mx-auto">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold transition-all shadow-lg active:scale-95"
            >
              {saving ? "Saving Selection..." : `Next: Experience & Certs (${selectedRoleIds.length})`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}