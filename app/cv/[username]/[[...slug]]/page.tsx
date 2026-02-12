"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Globe, Mail, MapPin, Phone, User } from "lucide-react"

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
  include_roles: boolean
  include_seatime: boolean
  include_rov: boolean
  include_certificates: boolean
  selected_role_ids: string[]
  selected_seatime_ids: string[]
  selected_rov_ids: string[]
  selected_cert_ids: string[]
  headline: string
  professional_summary: string
  key_skills: string
  linkedin_url: string
  education: string
  additional_notes: string
  custom_sections: { id: string; title: string; content: string }[]
}

type RoleItem = {
  profile_role_id: string
  role_name: string
  category: string | null
}

type SeaTimeItem = {
  id: string
  profile_role_id: string | null
  vessel_name: string | null
  start_date: string | null
  end_date: string | null
  sea_days: number | null
  voyage_description: string | null
}

type RovItem = {
  id: string
  profile_role_id: string | null
  project_name: string | null
  client_name: string | null
  location: string | null
  start_date: string | null
  end_date: string | null
  offshore_days: number | null
  scope_of_work: string | null
}

type CertItem = {
  id: string
  cert_name: string
}

const formatDate = (value: string | null) => {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short" })
}

const asList = (text: string) =>
  (text || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)

const parseCustomSections = (value: unknown) => {
  if (!Array.isArray(value)) return []
  return value.map((entry: any) => ({
    id: typeof entry?.id === "string" ? entry.id : crypto.randomUUID(),
    title: typeof entry?.title === "string" ? entry.title : "",
    content: typeof entry?.content === "string" ? entry.content : "",
  }))
}

export default function PublicCvPage() {
  const params = useParams<{ username: string; slug?: string[] }>()
  const username = params?.username
  const slug = params?.slug?.[0] || null

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [cv, setCv] = useState<CvRecord | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const [roles, setRoles] = useState<RoleItem[]>([])
  const [seaTime, setSeaTime] = useState<SeaTimeItem[]>([])
  const [rovExperience, setRovExperience] = useState<RovItem[]>([])
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
          include_roles: Boolean(cvData.include_roles),
          include_seatime: Boolean(cvData.include_seatime),
          include_rov: Boolean(cvData.include_rov),
          include_certificates: Boolean(cvData.include_certificates),
          selected_role_ids: (cvData.selected_role_ids ?? []) as string[],
          selected_seatime_ids: (cvData.selected_seatime_ids ?? []) as string[],
          selected_rov_ids: (cvData.selected_rov_ids ?? []) as string[],
          selected_cert_ids: (cvData.selected_cert_ids ?? []) as string[],
          headline: cvData.headline || "",
          professional_summary: cvData.professional_summary || "",
          key_skills: cvData.key_skills || "",
          linkedin_url: cvData.linkedin_url || "",
          education: cvData.education || "",
          additional_notes: cvData.additional_notes || "",
          custom_sections: parseCustomSections(cvData.custom_sections),
        }

        const [rolesRes, seaRes, rovRes, certRes] = await Promise.all([
          supabase
            .from("profile_roles")
            .select("id, lookup_roles(role_name, category)")
            .eq("profile_id", profileRow.id),
          supabase
            .from("profile_seatime")
            .select("id, profile_role_id, vessel_name, start_date, end_date, sea_days, voyage_description")
            .eq("profile_id", profileRow.id)
            .order("start_date", { ascending: false }),
          supabase
            .from("profile_rov_experience")
            .select("id, profile_role_id, project_name, client_name, location, start_date, end_date, offshore_days, scope_of_work")
            .eq("profile_id", profileRow.id)
            .order("start_date", { ascending: false }),
          supabase
            .from("profile_certs")
            .select("id, lookup_certs(cert_name)")
            .eq("profile_id", profileRow.id),
        ])

        if (rolesRes.error) throw rolesRes.error
        if (seaRes.error) throw seaRes.error
        if (rovRes.error) throw rovRes.error
        if (certRes.error) throw certRes.error

        const mappedRoles: RoleItem[] = (rolesRes.data ?? []).map((row: any) => ({
          profile_role_id: row.id,
          role_name: row.lookup_roles?.role_name ?? "Unknown Role",
          category: row.lookup_roles?.category ?? null,
        }))

        const mappedCerts: CertItem[] = (certRes.data ?? []).map((row: any) => ({
          id: row.id,
          cert_name: row.lookup_certs?.cert_name ?? "Unknown Certificate",
        }))

        if (!active) return

        setProfile(profileRow)
        setCv(cvRow)
        setRoles(mappedRoles)
        setSeaTime((seaRes.data ?? []) as SeaTimeItem[])
        setRovExperience((rovRes.data ?? []) as RovItem[])
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

  const roleByProfileRoleId = useMemo(
    () =>
      roles.reduce<Record<string, string>>((acc, role) => {
        acc[role.profile_role_id] = role.role_name
        return acc
      }, {}),
    [roles]
  )

  const selectedRoles = useMemo(() => {
    if (!cv) return []
    return roles.filter((role) => cv.selected_role_ids.includes(role.profile_role_id))
  }, [cv, roles])

  const selectedSeaTime = useMemo(() => {
    if (!cv) return []
    return seaTime.filter((entry) => cv.selected_seatime_ids.includes(entry.id))
  }, [cv, seaTime])

  const selectedRov = useMemo(() => {
    if (!cv) return []
    return rovExperience.filter((entry) => cv.selected_rov_ids.includes(entry.id))
  }, [cv, rovExperience])

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
  const summaryParagraphs = asList(cv.professional_summary)
  const educationLines = asList(cv.education)
  const additionalInfoLines = asList(cv.additional_notes)

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

            {summaryParagraphs.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold border-b border-slate-200 pb-2 mb-4 uppercase tracking-wide text-slate-900">Professional Profile</h2>
                <div className="space-y-2 leading-relaxed">{summaryParagraphs.map((line, idx) => <p key={`${line}-${idx}`}>{line}</p>)}</div>
              </section>
            )}

            {(cv.include_seatime && selectedSeaTime.length > 0) || (cv.include_rov && selectedRov.length > 0) ? (
              <section>
                <h2 className="text-xl font-semibold border-b border-slate-200 pb-2 mb-6 uppercase tracking-wide text-slate-900">Offshore Experience</h2>
                <div className="space-y-6">
                  {cv.include_seatime && selectedSeaTime.map((entry) => (
                    <div key={entry.id}>
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">{entry.vessel_name || "Unnamed vessel"}</h3>
                        <span className="text-sm text-slate-500">{formatDate(entry.start_date)} - {formatDate(entry.end_date) || "Present"}</span>
                      </div>
                      <p className="text-sm text-slate-500">
                        {entry.profile_role_id ? roleByProfileRoleId[entry.profile_role_id] || "Sea Time Entry" : "Sea Time Entry"}
                        {entry.sea_days != null ? ` • ${entry.sea_days} days` : ""}
                      </p>
                      {entry.voyage_description && (
                        <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                          {asList(entry.voyage_description).map((point, idx) => <li key={`${entry.id}-voy-${idx}`}>{point}</li>)}
                        </ul>
                      )}
                    </div>
                  ))}

                  {cv.include_rov && selectedRov.map((entry) => (
                    <div key={entry.id}>
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">{entry.project_name || "Unnamed project"}</h3>
                        <span className="text-sm text-slate-500">{formatDate(entry.start_date)} - {formatDate(entry.end_date) || "Present"}</span>
                      </div>
                      <p className="text-sm text-slate-500">
                        {entry.client_name || "ROV Project"}
                        {entry.location ? ` • ${entry.location}` : ""}
                        {entry.offshore_days != null ? ` • ${entry.offshore_days} offshore days` : ""}
                      </p>
                      {entry.scope_of_work && (
                        <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                          {asList(entry.scope_of_work).map((point, idx) => <li key={`${entry.id}-scope-${idx}`}>{point}</li>)}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {cv.include_roles && selectedRoles.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold border-b border-slate-200 pb-2 mb-4 uppercase tracking-wide text-slate-900">Role Summary</h2>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {selectedRoles.map((role) => (
                    <li key={role.profile_role_id}>{role.role_name}{role.category ? ` (${role.category})` : ""}</li>
                  ))}
                </ul>
              </section>
            )}

            {educationLines.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold border-b border-slate-200 pb-2 mb-4 uppercase tracking-wide text-slate-900">Education</h2>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {educationLines.map((line, idx) => <li key={`edu-${idx}`}>{line}</li>)}
                </ul>
              </section>
            )}

            {cv.custom_sections
              .filter((section) => section.title.trim() && section.content.trim())
              .map((section) => (
                <section key={section.id}>
                  <h2 className="text-xl font-semibold border-b border-slate-200 pb-2 mb-4 uppercase tracking-wide text-slate-900">{section.title}</h2>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {asList(section.content).map((line, idx) => <li key={`${section.id}-${idx}`}>{line}</li>)}
                  </ul>
                </section>
              ))}

            {additionalInfoLines.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold border-b border-slate-200 pb-2 mb-4 uppercase tracking-wide text-slate-900">Additional Information</h2>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {additionalInfoLines.map((line, idx) => <li key={`add-${idx}`}>{line}</li>)}
                </ul>
              </section>
            )}

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
