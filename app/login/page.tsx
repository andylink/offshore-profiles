"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage("")

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setErrorMessage(error.message)
    } else {
      router.push("/dashboard")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <form
        onSubmit={handleLogin}
        className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl w-full max-w-md space-y-6 border border-slate-200 dark:border-slate-700"
      >
        <h1 className="text-2xl font-semibold text-center text-slate-900 dark:text-white">
          Welcome back
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
          className="w-full bg-slate-900 dark:bg-slate-700 text-white py-2 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-600 transition"
        >
          Login
        </button>

        <a
          href="/reset"
          className="block text-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Forgot password?
        </a>

        {errorMessage && (
          <p className="text-sm text-center text-red-500">{errorMessage}</p>
        )}
      </form>
    </div>
  )
}
