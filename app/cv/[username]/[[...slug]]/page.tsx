"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Globe, Mail, MapPin, Phone, User } from "lucide-react"
import MarkdownContent from "@/components/markdown-content"
import { normalizeCustomSections, type CustomSection } from "@/lib/custom-sections"

type PublicProfile = {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  subscription_tier: string | null
  is_paid: boolean | null
  current_city: string | null
  current_country: string | null
  phone_number: string | null
  contact_email: string | null
}

type CvRecord = {
  id: string
  title: string
  slug: string
  is_published: boolean
  include_avatar: boolean
  include_personal: boolean
  include_phone: boolean
  include_email: boolean
  include_location: boolean
  include_certificates: boolean
  selected_cert_ids: string[]
  headline: string
  key_skills: string
  linkedin_url: string
  custom_sections: CustomSection[]
}

type CertItem = {
  id: string
  cert_name: string
}

const asList = (text: string) =>
  (text || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)

export default function PublicCvPage() {
  const params = useParams<{ username: string; slug?: string[] }>()
  const username = params?.username
  const slug = params?.slug?.[0] || null

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [cv, setCv] = useState<CvRecord | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const [certificates, setCertificates] = useState<CertItem[]>([])

  useEffect(() => {
    if (!username) return

    let active = true

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url, subscription_tier, is_paid, current_city, current_country, phone_number, contact_email")
          .eq("username", username)
          .maybeSingle()

        if (profileError) throw profileError
        if (!profileData) throw new Error("Profile not found")

        const profileRow = profileData as PublicProfile

        let cvData: any = null

        if (slug) {
          const { data, error: cvError } = await supabase
            .from("profile_cvs")
            .select("*")
            .eq("profile_id", profileRow.id)
            .eq("is_published", true)
            .eq("slug", slug)
            .maybeSingle()

          if (cvError) throw cvError
          cvData = data
        } else {
          const { data: publishedRows, error: publishedError } = await supabase
            .from("profile_cvs")
            .select("*")
            .eq("profile_id", profileRow.id)
            .eq("is_published", true)
            .order("is_default_public", { ascending: false })
            .order("updated_at", { ascending: false })

          if (publishedError) throw publishedError

          const rows = (publishedRows ?? []) as any[]
          if (rows.length === 1) {
            cvData = rows[0]
          } else if (rows.length > 1) {
            cvData = rows.find((row) => row.is_default_public) ?? rows[0]
          }
        }

        if (!cvData) throw new Error("Published CV not found")

        const cvRow: CvRecord = {
          id: cvData.id,
          title: cvData.title || "CV",
          slug: cvData.slug || "primary",
          is_published: Boolean(cvData.is_published),
          include_avatar: cvData.include_avatar !== false,
          include_personal: Boolean(cvData.include_personal),
          include_phone: cvData.include_phone !== false,
          include_email: cvData.include_email !== false,
          include_location: cvData.include_location !== false,
          include_certificates: Boolean(cvData.include_certificates),
          selected_cert_ids: (cvData.selected_cert_ids ?? []) as string[],
          headline: cvData.headline || "",
          key_skills: cvData.key_skills || "",
          linkedin_url: cvData.linkedin_url || "",
          custom_sections: normalizeCustomSections(cvData.custom_sections),
        }

        const { data: certData, error: certError } = await supabase
          .from("profile_certs")
          .select("id, lookup_certs(cert_name)")
          .eq("profile_id", profileRow.id)

        if (certError) throw certError

        const mappedCerts: CertItem[] = (certData ?? []).map((row: any) => ({
          id: row.id,
          cert_name: row.lookup_certs?.cert_name ?? "Unknown Certificate",
        }))

        if (!active) return

        setProfile(profileRow)
        setCv(cvRow)
        setCertificates(mappedCerts)

        if (profileRow.avatar_url) {
          setAvatarUrl(profileRow.avatar_url)
        } else {
          const { data: storageData } = await supabase.storage.from("avatars").list(profileRow.id, { limit: 20 })
          const avatarFile = storageData?.find((item) => item.name.startsWith("avatar.")) || storageData?.[0]

          if (avatarFile && active) {
            const { data: publicData } = supabase.storage
              .from("avatars")
              .getPublicUrl(`${profileRow.id}/${avatarFile.name}`)
            setAvatarUrl(publicData.publicUrl)
          }
        }
      } catch (err: any) {
        if (active) {
          setError(err?.message ?? "Failed to load CV")
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      active = false
    }
  }, [slug, username])

  const selectedCerts = useMemo(() => {
    if (!cv) return []
    return certificates.filter((entry) => cv.selected_cert_ids.includes(entry.id))
  }, [cv, certificates])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading CV...</div>
  }

  if (error || !profile || !cv) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">{error || "CV not available"}</div>
  }

  const isPaidMember = Boolean(profile.is_paid) || ["pro", "premium", "paid"].includes((profile.subscription_tier || "").toLowerCase())
  const showFreePromo = !isPaidMember

  const skillItems = asList(cv.key_skills)

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 flex justify-center">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          <aside className="lg:col-span-4 bg-slate-900 text-white p-8 space-y-8">
            {cv.include_avatar && (
              <div className="flex justify-center">
                <div className="w-36 h-36 rounded-2xl bg-slate-700 overflow-hidden flex items-center justify-center text-slate-300 text-sm">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile photo" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-slate-300" />
                  )}
                </div>
              </div>
            )}

            {cv.include_personal && (
              <div>
                <h2 className="text-lg font-semibold mb-4 tracking-wide uppercase">Contact</h2>
                <div className="space-y-3 text-sm text-slate-100">
                  {cv.include_phone && <div className="flex items-center gap-3"><Phone size={16} />{profile.phone_number || "No phone"}</div>}
                  {cv.include_email && <div className="flex items-center gap-3"><Mail size={16} />{profile.contact_email || "No email"}</div>}
                  {cv.include_location && <div className="flex items-center gap-3"><MapPin size={16} />{[profile.current_city, profile.current_country].filter(Boolean).join(", ") || "No location"}</div>}
                  <div className="flex items-center gap-3"><Globe size={16} />{cv.linkedin_url || "No profile URL"}</div>
                </div>
              </div>
            )}

            {cv.include_certificates && selectedCerts.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 tracking-wide uppercase">Certifications</h2>
                <div className="space-y-2 text-sm text-slate-100">
                  {selectedCerts.map((cert) => <div key={cert.id}>{cert.cert_name}</div>)}
                </div>
              </div>
            )}

            {skillItems.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 tracking-wide uppercase">Core Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {skillItems.map((skill, idx) => (
                    <span key={`${skill}-${idx}`} className="px-2.5 py-1 rounded-full text-xs bg-slate-700 text-slate-100 border border-slate-600">{skill}</span>
                  ))}
                </div>
              </div>
            )}
          </aside>

          <main className="lg:col-span-8 p-8 md:p-10 space-y-10 text-slate-700">
            <header>
              <h1 className="text-4xl font-bold text-slate-900">{profile.full_name || "Unnamed Professional"}</h1>
              {cv.headline && <p className="text-lg text-slate-600 mt-2">{cv.headline}</p>}
            </header>

            {cv.custom_sections
              .filter((section) => section.title.trim() && section.content.trim())
              .map((section) => (
                <section key={section.id}>
                  <h2 className="text-xl font-semibold border-b border-slate-200 pb-2 mb-4 uppercase tracking-wide text-slate-900">{section.title}</h2>
                  <MarkdownContent content={section.content} className="space-y-3 text-sm" />
                </section>
              ))}

            {showFreePromo && (
              <section className="print:hidden rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                <p className="text-sm font-semibold text-blue-900">Build your own offshore profile</p>
                <p className="text-sm text-blue-800">Create your profile, track experience and certifications, and publish your own CV in minutes.</p>
                <a href="/signup" className="inline-flex items-center px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold">
                  Get Started Free
                </a>
                <p className="text-xs text-blue-700">Recruiters and employers: dedicated hiring features are coming soon.</p>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
