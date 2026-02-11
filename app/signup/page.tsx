"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage("Check your email to confirm your account.")
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <form
        onSubmit={handleSignup}
        className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl w-full max-w-md space-y-6 border border-slate-200 dark:border-slate-700"
      >
        <h1 className="text-2xl font-semibold text-center dark:text-white">
          Create your profile
        </h1>

        <input
          type="email"
          placeholder="Email"
          className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 dark:bg-blue-700 text-white py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition"
        >
          {loading ? "Creating..." : "Sign Up"}
        </button>

        {message && (
          <p className="text-sm text-center text-slate-600 dark:text-slate-300">{message}</p>
        )}
      </form>
    </div>
  )
}
