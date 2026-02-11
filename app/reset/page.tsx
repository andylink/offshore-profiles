"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

export default function ResetPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:3000/update-password",
    })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage("Check your email for reset link.")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <form
        onSubmit={handleReset}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md space-y-6"
      >
        <h1 className="text-2xl font-semibold text-center">
          Reset password
        </h1>

        <input
          type="email"
          placeholder="Email"
          className="w-full border border-slate-200 rounded-lg px-4 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Send reset link
        </button>

        {message && (
          <p className="text-sm text-center text-slate-600">{message}</p>
        )}
      </form>
    </div>
  )
}
