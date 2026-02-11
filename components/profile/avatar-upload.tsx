"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

export default function AvatarUpload({ uid, url, onUpload }: { 
  uid: string, 
  url: string | null, 
  onUpload: (url: string) => void 
}) {
  const [uploading, setUploading] = useState(false)

  const uploadAvatar = async (event: any) => {
    try {
      setUploading(true)
      if (!event.target.files || event.target.files.length === 0) throw new Error('Select an image.')

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const filePath = `${uid}/avatar.${fileExt}` // Overwrites old avatar to save space

      // 1. Upload to Supabase Storage
      console.log("UID:", uid, "FilePath:", filePath);
      const { data: { session } } = await supabase.auth.getSession();
console.log("Is session active?:", !!session);
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // 2. Get Public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      
      onUpload(data.publicUrl)
    } catch (error: any) {
      alert(error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-28 h-28">
        {url ? (
          <img 
            src={url} 
            alt="Avatar" 
            className="w-full h-full rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-lg"
          />
        ) : (
          <div className="w-full h-full rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <span className="text-xs">No Photo</span>
          </div>
        )}
        
        {uploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
          </div>
        )}
      </div>

      <label className="cursor-pointer bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition">
        {uploading ? "Uploading..." : "Change Photo"}
        <input
          type="file"
          accept="image/*"
          onChange={uploadAvatar}
          disabled={uploading}
          className="hidden"
        />
      </label>
    </div>
  )
}