"use client"
import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { User } from "lucide-react"
import Link from "next/link"

export default function ProfileManagement({ profile, setProfile }: { profile: any, setProfile: (p: any) => void }) {
  const [isEditing, setIsEditing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    username: profile?.username || '',
    dob: profile?.date_of_birth || ''
  })

  // --- AVATAR UPLOAD LOGIC ---
  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      if (!event.target.files || event.target.files.length === 0) return

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}-${Math.random()}.${fileExt}`
      const filePath = fileName

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // 3. Update Profile Table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id)

      if (updateError) throw updateError

      setProfile({ ...profile, avatar_url: publicUrl })
      alert("Avatar updated!")
    } catch (error: any) {
      alert(error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleUpdate = async () => {
    const { error } = await supabase
      .from('profiles')
      .update(formData)
      .eq('id', profile.id)

    if (!error) {
      setProfile({ ...profile, ...formData })
      setIsEditing(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Professional Profile</h2>
          <p className="text-slate-500 text-sm">Manage your identity and offshore credentials.</p>
        </div>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 text-sm font-bold bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Edit Profile
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border dark:border-slate-800 shadow-sm overflow-hidden">
        {/* AVATAR SECTION */}
        <div className="p-8 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col items-center">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border-4 border-white dark:border-slate-900 shadow-md">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <User size={40} />
                </div>
              )}
            </div>
            <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-opacity">
              <span className="text-xs font-bold">{uploading ? '...' : 'Change'}</span>
              <input 
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={uploadAvatar} 
                disabled={uploading} 
              />
            </label>
          </div>
          <p className="mt-3 text-xs font-bold text-slate-400 uppercase">Profile Photo</p>
        </div>

        <div className="p-8 space-y-6">
          {/* Form fields (Full Name, Username, DOB) remain the same as previous step */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
            {isEditing ? (
              <input 
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
              />
            ) : (
              <p className="text-lg font-semibold text-slate-900 dark:text-white">{profile?.full_name || 'Not set'}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">DOB</label>
            {isEditing ? (
              <input 
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                value={formData.dob}
                onChange={(e) => setFormData({...formData, dob: e.target.value})}
              />
            ) : (
              <p className="text-lg font-semibold text-slate-900 dark:text-white">{profile?.date_of_birth || 'Not set'}</p>
            )}
          </div>
           <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Online Resume</label>
            {isEditing ? (
              <input 
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                value={formData.username}
                onChange={(e) => setFormData({...formData, dob: e.target.value})}
              />
            ) : (
              <p className="text-lg font-semibold text-slate-900 dark:text-white"><Link href={`http://www.offshorepro.com/${profile?.username || 'Not set'}`} className="text-blue-500 hover:underline">offshorepro.com/{profile?.username || 'Not set'}</Link></p>
            )}
          </div>
          

        </div>

        {isEditing && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-800 flex justify-end gap-3">
            <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm font-bold text-slate-500">Cancel</button>
            <button onClick={handleUpdate} className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700">Save Changes</button>
          </div>
        )}
      </div>
    </div>
  )
}