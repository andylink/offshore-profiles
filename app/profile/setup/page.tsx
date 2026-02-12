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
    fullName: "",
    dob: "",
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
    if (username.length < 3) {
      setIsUsernameAvailable(null)
      return
    }

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
        full_name: formData.fullName,
        date_of_birth: formData.dob,
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
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
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
            value={formData.fullName}
            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
          />
        </div>

        {/* DOB */}
        <div>
          <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Date of Birth</label>
          <input
            required
            type="date"
            value={formData.dob}
            onChange={(e) => setFormData({...formData, dob: e.target.value})}
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