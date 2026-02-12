"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Navbar from "@/components/Navbar"
import AvatarUpload from "@/components/profile/avatar-upload"

export default function ProfileStepOne() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [authenticating, setAuthenticating] = useState(true)
  const [username, setUsername] = useState("")
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    full_name: "",
    date_of_birth: "",
    nationality: "",
    current_city: "",
    current_country: "",
    phone_number: "",
    contact_email: "",
    gender: "",
    marital_status: "",
  })

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error || !data.user) {
        router.push("/login")
      }
      setAuthenticating(false)
    }
    checkAuth()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getUser()
      setUserId(data.user?.id || null)
    }
    getSession()
  }, [])

  // Debounce Username Check
  useEffect(() => {
    if (username.length < 3) return

    const checkUsername = async () => {
      setCheckingUsername(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username.toLowerCase())
        .maybeSingle()

      if (error) {
        setIsUsernameAvailable(false)
      } else {
        setIsUsernameAvailable(!data)
      }
      setCheckingUsername(false)
    }

    const timeoutId = setTimeout(checkUsername, 500)
    return () => clearTimeout(timeoutId)
  }, [username])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isUsernameAvailable) return

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        username: username.toLowerCase(),
        full_name: formData.full_name,
        date_of_birth: formData.date_of_birth,
        nationality: formData.nationality,
        current_city: formData.current_city,
        current_country: formData.current_country,
        phone_number: formData.phone_number,
        contact_email: formData.contact_email,
        gender: formData.gender,
        marital_status: formData.marital_status,
        avatar_url: avatarUrl,
        setup_completed: true
      })

      if (!error) {
        router.push("/dashboard")
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar onLogout={handleLogout} />
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        {authenticating ? (
          <p className="text-slate-500 dark:text-slate-400">Loading...</p>
        ) : (
          <div className="max-w-md mx-auto bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
      <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Basic Info</h2>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Profile Image Upload */}
        <div className="flex flex-col items-center mb-6">
          {userId && (
            <AvatarUpload 
              uid={userId} 
              url={avatarUrl} 
              onUpload={(url) => setAvatarUrl(url)} 
            />
          )}
        </div>

        {/* Username Field */}
        <div>
          <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Choose Username</label>
          <div className="relative">
            <input
              required
              value={username}
              onChange={(e) => {
                const normalized = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                setUsername(normalized)
                if (normalized.length < 3) setIsUsernameAvailable(null)
              }}
              placeholder="e.g. jsmith_rov"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
            />
            <div className="absolute right-3 top-2.5">
              {checkingUsername && <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent animate-spin rounded-full" />}
              {!checkingUsername && isUsernameAvailable === true && <span className="text-green-500 text-sm">✓ Available</span>}
              {!checkingUsername && isUsernameAvailable === false && <span className="text-red-500 text-sm">× Taken</span>}
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">Your profile: site.com/{username || 'username'}</p>
        </div>

        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Full Name</label>
          <input
            required
            type="text"
            value={formData.full_name}
            onChange={(e) => setFormData({...formData, full_name: e.target.value})}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
          />
        </div>

        {/* DOB */}
        <div>
          <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Date of Birth</label>
          <input
            required
            type="date"
            value={formData.date_of_birth}
            onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Nationality</label>
          <input
            type="text"
            value={formData.nationality}
            onChange={(e) => setFormData({...formData, nationality: e.target.value})}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Current City</label>
          <input
            type="text"
            value={formData.current_city}
            onChange={(e) => setFormData({...formData, current_city: e.target.value})}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Current Country</label>
          <input
            type="text"
            value={formData.current_country}
            onChange={(e) => setFormData({...formData, current_country: e.target.value})}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Phone Number</label>
          <input
            type="tel"
            value={formData.phone_number}
            onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Contact Email</label>
          <input
            type="email"
            value={formData.contact_email}
            onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Gender</label>
          <input
            type="text"
            value={formData.gender}
            onChange={(e) => setFormData({...formData, gender: e.target.value})}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Marital Status</label>
          <input
            type="text"
            value={formData.marital_status}
            onChange={(e) => setFormData({...formData, marital_status: e.target.value})}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
          />
        </div>

        <button
          disabled={loading || !isUsernameAvailable}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition disabled:opacity-50 mt-4"
        >
          {loading ? "Submitting..." : "Submit"}
        </button>
      </form>
          </div>
        )}
      </div>
    </div>
  )
}