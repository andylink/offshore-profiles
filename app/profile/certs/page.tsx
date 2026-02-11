"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Navbar from "@/components/Navbar"
import { ChevronDown, ChevronRight, CheckCircle2, AlertCircle, Upload, Trash2, FileText } from "lucide-react"

export default function ProfileStepThree() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [certs, setCerts] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [certData, setCertData] = useState<Record<string, any>>({})
  
  // UI State for Accordions
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [expandedCert, setExpandedCert] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push("/login")

      const { data } = await supabase.from('lookup_certs').select('*').order('display_order')
      if (data) {
        setCerts(data)
        setCategories(Array.from(new Set(data.map(c => c.category))))
      }
      setLoading(false)
    }
    fetchData()
  }, [router])

  const toggleCertSelection = (id: string) => {
    setSelectedIds(prev => {
      const isRemoving = prev.includes(id)
      if (isRemoving) {
        const newData = { ...certData }
        delete newData[id]
        setCertData(newData)
        return prev.filter(i => i !== id)
      }
      return [...prev, id]
    })
    // Auto-expand the form when a cert is selected
    setExpandedCert(id)
  }

  const updateData = (id: string, field: string, value: any) => {
    setCertData(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }))
  }

  const handleFileUpload = async (id: string, file: File) => {
    const { data: { user } } = await supabase.auth.getUser()
    const filePath = `${user?.id}/${id}_${Date.now()}`
    
    const { data, error } = await supabase.storage
      .from('certificates')
      .upload(filePath, file)

    if (data) updateData(id, 'certificate_url', data.path)
  }

  const isCertComplete = (id: string) => {
    const d = certData[id]
    if (!d) return false
    const hasExpiryInfo = d.has_no_expiry || d.expiry_date
    return d.issued_by && d.issue_date && hasExpiryInfo && d.certificate_url
  }

  const canSubmit = selectedIds.length > 0 && selectedIds.every(id => isCertComplete(id))

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('profile_certs').delete().eq('profile_id', user?.id)
    const inserts = selectedIds.map(id => ({
      profile_id: user?.id,
      cert_id: id,
      ...certData[id]
    }))
    const { error } = await supabase.from('profile_certs').insert(inserts)
    if (!error) router.push("/profile/experience")
    setSaving(false)
  }

  if (loading) return <div className="p-8 text-center">Loading Certificates...</div>

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32">
      <Navbar onLogout={() => router.push("/login")} />
      <div className="max-w-md mx-auto p-4 pt-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Certifications</h1>
          <p className="text-slate-500 text-sm">Organize and upload your mandatory tickets.</p>
        </header>

        <div className="space-y-3">
          {categories.map(cat => (
            <div key={cat} className="border rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
              {/* CATEGORY HEADER */}
              <button 
                onClick={() => setExpandedCat(expandedCat === cat ? null : cat)}
                className="w-full flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-800/30"
              >
                <span className="font-bold text-slate-700 dark:text-slate-200">{cat}</span>
                {expandedCat === cat ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>

              {/* CERTS UNDER CATEGORY */}
              {expandedCat === cat && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {certs.filter(c => c.category === cat).map(cert => (
                    <div key={cert.id} className="flex flex-col">
                      <div className="flex items-center p-4">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(cert.id)}
                          onChange={() => toggleCertSelection(cert.id)}
                          className="w-5 h-5 rounded border-slate-300 text-blue-600 mr-3"
                        />
                        <button 
                          onClick={() => setExpandedCert(expandedCert === cert.id ? null : cert.id)}
                          className="flex-1 flex items-center justify-between text-left"
                        >
                          <span className={`text-sm ${selectedIds.includes(cert.id) ? 'font-semibold' : 'text-slate-600'}`}>
                            {cert.cert_name}
                          </span>
                          {selectedIds.includes(cert.id) && (
                            isCertComplete(cert.id) ? <CheckCircle2 className="w-4 h-4 text-green-500 ml-2" /> : <AlertCircle className="w-4 h-4 text-amber-500 ml-2" />
                          )}
                        </button>
                      </div>

                      {/* CERT DETAIL FORM */}
                      {expandedCert === cert.id && selectedIds.includes(cert.id) && (
                        <div className="px-4 pb-4 space-y-3 animate-in slide-in-from-top-1">
                          <input 
                            placeholder="Issued By (e.g. OPITO)"
                            value={certData[cert.id]?.issued_by || ''}
                            className="w-full p-2 text-sm rounded border bg-slate-50 dark:bg-slate-950"
                            onChange={(e) => updateData(cert.id, 'issued_by', e.target.value)}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] uppercase font-bold text-slate-400">Issue Date</label>
                              <input 
                                type="date" 
                                className="w-full p-2 text-sm rounded border" 
                                onChange={(e) => updateData(cert.id, 'issue_date', e.target.value)} 
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase font-bold text-slate-400">Expiry Date</label>
                              <input 
                                type="date" 
                                disabled={certData[cert.id]?.has_no_expiry}
                                className="w-full p-2 text-sm rounded border disabled:opacity-30" 
                                onChange={(e) => updateData(cert.id, 'expiry_date', e.target.value)} 
                              />
                            </div>
                          </div>
                          <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={certData[cert.id]?.has_no_expiry || false}
                              onChange={(e) => updateData(cert.id, 'has_no_expiry', e.target.checked)} 
                            />
                            No expiry date
                          </label>
                          
                          <div className="pt-2">
                            <input 
                              type="file" 
                              id={`file-${cert.id}`} 
                              className="hidden" 
                              onChange={(e) => e.target.files?.[0] && handleFileUpload(cert.id, e.target.files[0])} 
                            />
                            <label htmlFor={`file-${cert.id}`} className="flex items-center justify-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold cursor-pointer hover:bg-blue-100 transition-colors">
                              {certData[cert.id]?.certificate_url ? <><FileText className="w-4 h-4" /> File Attached</> : <><Upload className="w-4 h-4" /> Upload Document</>}
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 p-4 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-t">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleSave}
            disabled={!canSubmit || saving}
            className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all ${canSubmit ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}
          >
            {saving ? "Processing..." : canSubmit ? "Next: Final Step" : `Complete ${selectedIds.length} Document${selectedIds.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}