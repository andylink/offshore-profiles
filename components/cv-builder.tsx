"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { ChevronLeft, ChevronRight, FileText, Globe, Mail, MapPin, Phone, Plus, Trash2, User } from "lucide-react"

type Profile = {
  id: string
  full_name?: string | null
  username?: string | null
  avatar_url?: string | null
  nationality?: string | null
  current_city?: string | null
  current_country?: string | null
  phone_number?: string | null
  contact_email?: string | null
  subscription_tier?: string | null
  is_paid?: boolean | null
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
  dive_hours: number | null
  scope_of_work: string | null
}

type CertItem = {
  id: string
  cert_name: string
  issue_date: string | null
  expiry_date: string | null
  has_no_expiry: boolean | null
  issued_by: string | null
}

type CustomSection = {
  id: string
  title: string
  content: string
}

type CvRecord = {
  id: string
  profile_id: string
  title: string
  slug: string
  is_published: boolean
  is_default_public: boolean
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
  custom_sections: CustomSection[]
  updated_at: string
}

const formatDate = (value: string | null) => {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short" })
}

const asList = (text: string) =>
  text
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")

const parseCustomSections = (value: unknown): CustomSection[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((entry: any) => ({
      id: typeof entry?.id === "string" ? entry.id : crypto.randomUUID(),
      title: typeof entry?.title === "string" ? entry.title : "",
      content: typeof entry?.content === "string" ? entry.content : "",
    }))
    .filter((item) => item.title || item.content)
}

export default function CvBuilder({ profile }: { profile: Profile | null }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isOptionsCollapsed, setIsOptionsCollapsed] = useState(false)

  const [roles, setRoles] = useState<RoleItem[]>([])
  const [seaTime, setSeaTime] = useState<SeaTimeItem[]>([])
  const [rovExperience, setRovExperience] = useState<RovItem[]>([])
  const [certificates, setCertificates] = useState<CertItem[]>([])

  const [cvRecords, setCvRecords] = useState<CvRecord[]>([])
  const [activeCvId, setActiveCvId] = useState<string | null>(null)
  const [cvTitle, setCvTitle] = useState("Primary CV")
  const [cvSlug, setCvSlug] = useState("primary")
  const [isPublished, setIsPublished] = useState(false)
  const [isDefaultPublic, setIsDefaultPublic] = useState(true)
  const [includeAvatar, setIncludeAvatar] = useState(true)

  const [includePersonal, setIncludePersonal] = useState(true)
  const [includePhone, setIncludePhone] = useState(true)
  const [includeEmail, setIncludeEmail] = useState(true)
  const [includeLocation, setIncludeLocation] = useState(true)
  const [includeRoles, setIncludeRoles] = useState(true)
  const [includeSeaTime, setIncludeSeaTime] = useState(true)
  const [includeRov, setIncludeRov] = useState(true)
  const [includeCertificates, setIncludeCertificates] = useState(true)

  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])
  const [selectedSeaTimeIds, setSelectedSeaTimeIds] = useState<string[]>([])
  const [selectedRovIds, setSelectedRovIds] = useState<string[]>([])
  const [selectedCertIds, setSelectedCertIds] = useState<string[]>([])

  const [headline, setHeadline] = useState("")
  const [professionalSummary, setProfessionalSummary] = useState("")
  const [keySkills, setKeySkills] = useState("")
  const [linkedinUrl, setLinkedinUrl] = useState("")
  const [education, setEducation] = useState("")
  const [additionalNotes, setAdditionalNotes] = useState("")
  const [customSections, setCustomSections] = useState<CustomSection[]>([])
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(profile?.avatar_url ?? null)

  const defaultRoleIds = useMemo(() => roles.map((item) => item.profile_role_id), [roles])
  const defaultSeaTimeIds = useMemo(() => seaTime.map((item) => item.id), [seaTime])
  const defaultRovIds = useMemo(() => rovExperience.map((item) => item.id), [rovExperience])
  const defaultCertIds = useMemo(() => certificates.map((item) => item.id), [certificates])

  const isPaidUser = useMemo(() => {
    if (profile?.is_paid) return true
    const tier = (profile?.subscription_tier || "").toLowerCase()
    return tier === "pro" || tier === "premium" || tier === "paid"
  }, [profile?.is_paid, profile?.subscription_tier])

  const canCreateAnotherCv = isPaidUser || cvRecords.length < 1

  const roleByProfileRoleId = useMemo(
    () =>
      roles.reduce<Record<string, string>>((acc, role) => {
        acc[role.profile_role_id] = role.role_name
        return acc
      }, {}),
    [roles]
  )

  const selectedRoles = useMemo(
    () => roles.filter((role) => selectedRoleIds.includes(role.profile_role_id)),
    [roles, selectedRoleIds]
  )

  const selectedSeaTime = useMemo(
    () => seaTime.filter((entry) => selectedSeaTimeIds.includes(entry.id)),
    [seaTime, selectedSeaTimeIds]
  )

  const selectedRovExperience = useMemo(
    () => rovExperience.filter((entry) => selectedRovIds.includes(entry.id)),
    [rovExperience, selectedRovIds]
  )

  const selectedCertificates = useMemo(
    () => certificates.filter((entry) => selectedCertIds.includes(entry.id)),
    [certificates, selectedCertIds]
  )

  const skillItems = useMemo(() => asList(keySkills), [keySkills])
  const summaryParagraphs = useMemo(() => asList(professionalSummary), [professionalSummary])
  const educationLines = useMemo(() => asList(education), [education])
  const additionalInfoLines = useMemo(() => asList(additionalNotes), [additionalNotes])

  const publicUrl = useMemo(() => {
    if (!profile?.username || !cvSlug) return ""
    return `/cv/${profile.username}/${cvSlug}`
  }, [profile?.username, cvSlug])

  const rootPublicUrl = useMemo(() => {
    if (!profile?.username) return ""
    return `/cv/${profile.username}`
  }, [profile?.username])

  const applyRecordToForm = useCallback((record: CvRecord | null) => {
    if (!record) return

    setActiveCvId(record.id)
    setCvTitle(record.title || "Untitled CV")
    setCvSlug(record.slug || "primary")
    setIsPublished(Boolean(record.is_published))
    setIsDefaultPublic(Boolean(record.is_default_public))
    setIncludeAvatar(record.include_avatar !== false)

    setIncludePersonal(Boolean(record.include_personal))
    setIncludePhone(record.include_phone !== false)
    setIncludeEmail(record.include_email !== false)
    setIncludeLocation(record.include_location !== false)
    setIncludeRoles(Boolean(record.include_roles))
    setIncludeSeaTime(Boolean(record.include_seatime))
    setIncludeRov(Boolean(record.include_rov))
    setIncludeCertificates(Boolean(record.include_certificates))

    setSelectedRoleIds(record.selected_role_ids ?? [])
    setSelectedSeaTimeIds(record.selected_seatime_ids ?? [])
    setSelectedRovIds(record.selected_rov_ids ?? [])
    setSelectedCertIds(record.selected_cert_ids ?? [])

    setHeadline(record.headline || "")
    setProfessionalSummary(record.professional_summary || "")
    setKeySkills(record.key_skills || "")
    setLinkedinUrl(record.linkedin_url || "")
    setEducation(record.education || "")
    setAdditionalNotes(record.additional_notes || "")
    setCustomSections(record.custom_sections || [])
  }, [])

  const resetToBlankCv = (defaults?: {
    roleIds: string[]
    seaTimeIds: string[]
    rovIds: string[]
    certIds: string[]
  }) => {
    setActiveCvId(null)
    setCvTitle("Primary CV")
    setCvSlug("primary")
    setIsPublished(false)
    setIsDefaultPublic(true)
    setIncludeAvatar(true)

    setIncludePersonal(true)
    setIncludePhone(true)
    setIncludeEmail(true)
    setIncludeLocation(true)
    setIncludeRoles(true)
    setIncludeSeaTime(true)
    setIncludeRov(true)
    setIncludeCertificates(true)

    setSelectedRoleIds(defaults?.roleIds ?? defaultRoleIds)
    setSelectedSeaTimeIds(defaults?.seaTimeIds ?? defaultSeaTimeIds)
    setSelectedRovIds(defaults?.rovIds ?? defaultRovIds)
    setSelectedCertIds(defaults?.certIds ?? defaultCertIds)

    setHeadline("")
    setProfessionalSummary("")
    setKeySkills("")
    setLinkedinUrl("")
    setEducation("")
    setAdditionalNotes("")
    setCustomSections([])
  }

  const loadCvRecords = useCallback(async (profileId: string, defaults?: {
    roleIds: string[]
    seaTimeIds: string[]
    rovIds: string[]
    certIds: string[]
  }) => {
    const { data, error: cvError } = await supabase
      .from("profile_cvs")
      .select("*")
      .eq("profile_id", profileId)
      .order("updated_at", { ascending: false })

    if (cvError) {
      throw cvError
    }

    const mapped: CvRecord[] = (data ?? []).map((row: any) => ({
      id: row.id,
      profile_id: row.profile_id,
      title: row.title || "Untitled CV",
      slug: row.slug || "primary",
      is_published: Boolean(row.is_published),
      is_default_public: Boolean(row.is_default_public),
      include_avatar: row.include_avatar !== false,
      include_personal: Boolean(row.include_personal),
      include_phone: row.include_phone !== false,
      include_email: row.include_email !== false,
      include_location: row.include_location !== false,
      include_roles: Boolean(row.include_roles),
      include_seatime: Boolean(row.include_seatime),
      include_rov: Boolean(row.include_rov),
      include_certificates: Boolean(row.include_certificates),
      selected_role_ids: (row.selected_role_ids ?? []) as string[],
      selected_seatime_ids: (row.selected_seatime_ids ?? []) as string[],
      selected_rov_ids: (row.selected_rov_ids ?? []) as string[],
      selected_cert_ids: (row.selected_cert_ids ?? []) as string[],
      headline: row.headline || "",
      professional_summary: row.professional_summary || "",
      key_skills: row.key_skills || "",
      linkedin_url: row.linkedin_url || "",
      education: row.education || "",
      additional_notes: row.additional_notes || "",
      custom_sections: parseCustomSections(row.custom_sections),
      updated_at: row.updated_at,
    }))

    setCvRecords(mapped)

    if (mapped.length > 0) {
      applyRecordToForm(mapped[0])
      return
    }

    resetToBlankCv(defaults)
  }, [applyRecordToForm])

  const fetchData = useCallback(async (profileId: string) => {
    setLoading(true)
    setError(null)

    try {
      const [rolesRes, seaRes, rovRes, certRes] = await Promise.all([
        supabase
          .from("profile_roles")
          .select("id, lookup_roles(role_name, category)")
          .eq("profile_id", profileId),
        supabase
          .from("profile_seatime")
          .select("id, profile_role_id, vessel_name, start_date, end_date, sea_days, voyage_description")
          .eq("profile_id", profileId)
          .order("start_date", { ascending: false }),
        supabase
          .from("profile_rov_experience")
          .select("id, profile_role_id, project_name, client_name, location, start_date, end_date, offshore_days, dive_hours, scope_of_work")
          .eq("profile_id", profileId)
          .order("start_date", { ascending: false }),
        supabase
          .from("profile_certs")
          .select("id, issue_date, expiry_date, has_no_expiry, issued_by, lookup_certs(cert_name)")
          .eq("profile_id", profileId)
          .order("created_at", { ascending: false }),
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

      const mappedSea: SeaTimeItem[] = (seaRes.data ?? []) as SeaTimeItem[]
      const mappedRov: RovItem[] = (rovRes.data ?? []) as RovItem[]
      const mappedCerts: CertItem[] = (certRes.data ?? []).map((row: any) => ({
        id: row.id,
        cert_name: row.lookup_certs?.cert_name ?? "Unknown Certificate",
        issue_date: row.issue_date ?? null,
        expiry_date: row.expiry_date ?? null,
        has_no_expiry: row.has_no_expiry ?? null,
        issued_by: row.issued_by ?? null,
      }))

      setRoles(mappedRoles)
      setSeaTime(mappedSea)
      setRovExperience(mappedRov)
      setCertificates(mappedCerts)

      const defaults = {
        roleIds: mappedRoles.map((item) => item.profile_role_id),
        seaTimeIds: mappedSea.map((item) => item.id),
        rovIds: mappedRov.map((item) => item.id),
        certIds: mappedCerts.map((item) => item.id),
      }

      await loadCvRecords(profileId, defaults)
    } catch (err: any) {
      setError(err?.message ?? "Failed to load CV source data")
      setRoles([])
      setSeaTime([])
      setRovExperience([])
      setCertificates([])
      setCvRecords([])
      resetToBlankCv({ roleIds: [], seaTimeIds: [], rovIds: [], certIds: [] })
    } finally {
      setLoading(false)
    }
  }, [loadCvRecords])

  useEffect(() => {
    if (!profile?.id) {
      setLoading(false)
      return
    }

    fetchData(profile.id)
  }, [profile?.id])

  useEffect(() => {
    setAvatarPreviewUrl(profile?.avatar_url ?? null)
  }, [profile?.avatar_url, profile?.id])

  useEffect(() => {
    if (!profile?.id || profile?.avatar_url) return

    let active = true

    const loadAvatarFromBucket = async () => {
      const { data, error: storageError } = await supabase.storage
        .from("avatars")
        .list(profile.id, { limit: 20 })

      if (storageError || !data || data.length === 0 || !active) return

      const avatarFile = data.find((file) => file.name.startsWith("avatar.")) || data[0]
      if (!avatarFile) return

      const { data: publicData } = supabase.storage
        .from("avatars")
        .getPublicUrl(`${profile.id}/${avatarFile.name}`)

      if (active) {
        setAvatarPreviewUrl(publicData.publicUrl)
      }
    }

    loadAvatarFromBucket()

    return () => {
      active = false
    }
  }, [profile?.id, profile?.avatar_url])

  const toggleSelected = (current: string[], value: string, set: (next: string[]) => void) => {
    if (current.includes(value)) {
      set(current.filter((id) => id !== value))
      return
    }
    set([...current, value])
  }

  const addCustomSection = () => {
    const id = crypto.randomUUID()
    setCustomSections((prev) => [...prev, { id, title: "", content: "" }])
  }

  const updateCustomSection = (id: string, patch: Partial<CustomSection>) => {
    setCustomSections((prev) => prev.map((section) => (section.id === id ? { ...section, ...patch } : section)))
  }

  const removeCustomSection = (id: string) => {
    setCustomSections((prev) => prev.filter((section) => section.id !== id))
  }

  const saveCurrentCv = async () => {
    if (!profile?.id) return

    const normalizedSlug = slugify(cvSlug || cvTitle) || "primary"
    const willBeTotalCvCount = activeCvId ? cvRecords.length : cvRecords.length + 1
    const effectivePublished = isPublished
    const effectiveDefaultPublic = effectivePublished
      ? (willBeTotalCvCount === 1 ? true : isDefaultPublic)
      : false

    setSaving(true)
    setError(null)
    setStatusMessage(null)

    try {
      if (effectiveDefaultPublic) {
        await supabase
          .from("profile_cvs")
          .update({ is_default_public: false })
          .eq("profile_id", profile.id)
      }

      const payload = {
        profile_id: profile.id,
        title: cvTitle.trim() || "Untitled CV",
        slug: normalizedSlug,
        is_published: effectivePublished,
        is_default_public: effectiveDefaultPublic,
        include_avatar: includeAvatar,
        include_personal: includePersonal,
        include_phone: includePhone,
        include_email: includeEmail,
        include_location: includeLocation,
        include_roles: includeRoles,
        include_seatime: includeSeaTime,
        include_rov: includeRov,
        include_certificates: includeCertificates,
        selected_role_ids: selectedRoleIds,
        selected_seatime_ids: selectedSeaTimeIds,
        selected_rov_ids: selectedRovIds,
        selected_cert_ids: selectedCertIds,
        headline,
        professional_summary: professionalSummary,
        key_skills: keySkills,
        linkedin_url: linkedinUrl,
        education,
        additional_notes: additionalNotes,
        custom_sections: customSections,
      }

      let savedId = activeCvId

      if (activeCvId) {
        const { data: updated, error: updateError } = await supabase
          .from("profile_cvs")
          .update(payload)
          .eq("id", activeCvId)
          .eq("profile_id", profile.id)
          .select("id")
          .single()

        if (updateError) throw updateError
        savedId = updated.id
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("profile_cvs")
          .insert(payload)
          .select("id")
          .single()

        if (insertError) throw insertError
        savedId = inserted.id
      }

      await loadCvRecords(profile.id)

      if (savedId) {
        const fresh = (await supabase
          .from("profile_cvs")
          .select("*")
          .eq("id", savedId)
          .single()).data as any

        if (fresh) {
          applyRecordToForm({
            id: fresh.id,
            profile_id: fresh.profile_id,
            title: fresh.title || "Untitled CV",
            slug: fresh.slug || "primary",
            is_published: Boolean(fresh.is_published),
            is_default_public: Boolean(fresh.is_default_public),
            include_avatar: fresh.include_avatar !== false,
            include_personal: Boolean(fresh.include_personal),
            include_phone: fresh.include_phone !== false,
            include_email: fresh.include_email !== false,
            include_location: fresh.include_location !== false,
            include_roles: Boolean(fresh.include_roles),
            include_seatime: Boolean(fresh.include_seatime),
            include_rov: Boolean(fresh.include_rov),
            include_certificates: Boolean(fresh.include_certificates),
            selected_role_ids: (fresh.selected_role_ids ?? []) as string[],
            selected_seatime_ids: (fresh.selected_seatime_ids ?? []) as string[],
            selected_rov_ids: (fresh.selected_rov_ids ?? []) as string[],
            selected_cert_ids: (fresh.selected_cert_ids ?? []) as string[],
            headline: fresh.headline || "",
            professional_summary: fresh.professional_summary || "",
            key_skills: fresh.key_skills || "",
            linkedin_url: fresh.linkedin_url || "",
            education: fresh.education || "",
            additional_notes: fresh.additional_notes || "",
            custom_sections: parseCustomSections(fresh.custom_sections),
            updated_at: fresh.updated_at,
          })
        }
      }

      setCvSlug(normalizedSlug)
      setIsPublished(effectivePublished)
      setIsDefaultPublic(effectiveDefaultPublic)
      setStatusMessage("CV saved")
    } catch (saveError: any) {
      setError(saveError?.message ?? "Failed to save CV")
    } finally {
      setSaving(false)
    }
  }

  const createNewCv = () => {
    if (!canCreateAnotherCv) {
      setError("Free plan supports 1 CV. Upgrade to create multiple CVs.")
      return
    }

    setStatusMessage(null)
    setError(null)

    const nextCount = cvRecords.length + 1
    setCvTitle(`CV ${nextCount}`)
    setCvSlug(`cv-${nextCount}`)
    setActiveCvId(null)
    setIsPublished(false)
    setIsDefaultPublic(cvRecords.length === 0)
    setIncludeAvatar(true)

    setIncludePersonal(true)
    setIncludePhone(true)
    setIncludeEmail(true)
    setIncludeLocation(true)
    setIncludeRoles(true)
    setIncludeSeaTime(true)
    setIncludeRov(true)
    setIncludeCertificates(true)

    setSelectedRoleIds(defaultRoleIds)
    setSelectedSeaTimeIds(defaultSeaTimeIds)
    setSelectedRovIds(defaultRovIds)
    setSelectedCertIds(defaultCertIds)

    setHeadline("")
    setProfessionalSummary("")
    setKeySkills("")
    setLinkedinUrl("")
    setEducation("")
    setAdditionalNotes("")
    setCustomSections([])
  }

  const deleteActiveCv = async () => {
    if (!profile?.id || !activeCvId) return

    const confirmDelete = window.confirm("Delete this CV?")
    if (!confirmDelete) return

    setSaving(true)
    setError(null)
    setStatusMessage(null)

    try {
      const { error: deleteError } = await supabase
        .from("profile_cvs")
        .delete()
        .eq("id", activeCvId)
        .eq("profile_id", profile.id)

      if (deleteError) throw deleteError

      await loadCvRecords(profile.id)
      setStatusMessage("CV deleted")
    } catch (deleteError: any) {
      setError(deleteError?.message ?? "Failed to delete CV")
    } finally {
      setSaving(false)
    }
  }

  if (!profile?.id) {
    return <div className="p-8 text-slate-500">No profile found.</div>
  }

  if (loading) {
    return <div className="p-8 text-slate-500">Loading CV builder...</div>
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Resume / CV Builder</h2>
        <p className="text-slate-500 text-sm">Publish a primary CV at /cv/{profile.username || "username"} and additional versions at /cv/{profile.username || "username"}/{cvSlug || "cv-slug"}.</p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}
      {statusMessage && <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-3 text-sm">{statusMessage}</div>}

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        <div className="w-full flex justify-end xl:hidden">
          <button
            onClick={() => setIsOptionsCollapsed((prev) => !prev)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {isOptionsCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {isOptionsCollapsed ? "Show Options" : "Hide Options"}
          </button>
        </div>

        <div
          className={`w-full overflow-hidden transition-all duration-300 ease-out ${
            isOptionsCollapsed
              ? "xl:w-0 xl:opacity-0 xl:-translate-x-6 xl:pointer-events-none"
              : "xl:w-[440px] xl:opacity-100 xl:translate-x-0"
          }`}
        >
          <section className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 p-5 space-y-6 xl:w-[440px]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">CV documents</h3>
              <button
                onClick={createNewCv}
                className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4" /> New CV
              </button>
            </div>

            <div className="space-y-2">
              {cvRecords.length === 0 && (
                <p className="text-sm text-slate-500">No saved CV yet. Configure and click Save CV.</p>
              )}
              {cvRecords.map((cv) => (
                <button
                  key={cv.id}
                  onClick={() => applyRecordToForm(cv)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${
                    activeCvId === cv.id
                      ? "border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold">{cv.title}</div>
                    <div className="flex items-center gap-1">
                      {cv.is_published ? (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">Published</span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-600">Draft</span>
                      )}
                      {cv.is_default_public && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">Primary</span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">/{cv.slug}</div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={cvTitle}
                onChange={(e) => {
                  setCvTitle(e.target.value)
                  if (!activeCvId && !cvSlug) {
                    setCvSlug(slugify(e.target.value))
                  }
                }}
                placeholder="CV Name"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
              />
              <input
                value={cvSlug}
                onChange={(e) => setCvSlug(slugify(e.target.value))}
                placeholder="cv-slug"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
              />
            </div>

            <div className="space-y-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 p-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Status</label>
                  <select
                    value={isPublished ? "published" : "draft"}
                    onChange={(e) => {
                      const nextPublished = e.target.value === "published"
                      setIsPublished(nextPublished)
                      if (!nextPublished) {
                        setIsDefaultPublic(false)
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
                  >
                    <option value="draft">Draft (not public)</option>
                    <option value="published">Published (public)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Primary URL</label>
                  <label className="flex items-center gap-2 py-2">
                    <input
                      type="checkbox"
                      checked={isDefaultPublic}
                      disabled={!isPublished}
                      onChange={(e) => setIsDefaultPublic(e.target.checked)}
                    />
                    <span className={!isPublished ? "text-slate-400" : ""}>Use for /cv/{profile.username || "username"}</span>
                  </label>
                </div>
              </div>
              {!isPublished && (
                <p className="text-xs text-slate-500">Draft CVs are private and cannot be primary.</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={saveCurrentCv}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save CV"}
              </button>
              <button
                onClick={deleteActiveCv}
                disabled={!activeCvId || saving}
                className="px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-bold disabled:opacity-40"
              >
                Delete CV
              </button>
            </div>

            {isPublished && publicUrl && (
              <div className="text-xs text-slate-500 space-y-1">
                {isDefaultPublic && rootPublicUrl && (
                  <p>
                    Primary URL: <a href={rootPublicUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{rootPublicUrl}</a>
                  </p>
                )}
                <p>
                  CV URL: <a href={publicUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{publicUrl}</a>
                </p>
              </div>
            )}

            {!isPaidUser && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Free plan: 1 CV maximum. Paid plan can create multiple CVs.
              </p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 mb-3">Sections</h3>
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={includeAvatar} onChange={(e) => setIncludeAvatar(e.target.checked)} />
                Show avatar image
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={includePersonal} onChange={(e) => setIncludePersonal(e.target.checked)} />
                Contact details
              </label>
              {includePersonal && (
                <div className="ml-6 space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={includePhone} onChange={(e) => setIncludePhone(e.target.checked)} />
                    Telephone
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={includeEmail} onChange={(e) => setIncludeEmail(e.target.checked)} />
                    Contact email
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={includeLocation} onChange={(e) => setIncludeLocation(e.target.checked)} />
                    Location
                  </label>
                </div>
              )}
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={includeRoles} onChange={(e) => setIncludeRoles(e.target.checked)} />
                Role history
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={includeSeaTime} onChange={(e) => setIncludeSeaTime(e.target.checked)} />
                Sea time experience
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={includeRov} onChange={(e) => setIncludeRov(e.target.checked)} />
                ROV experience
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={includeCertificates} onChange={(e) => setIncludeCertificates(e.target.checked)} />
                Certifications
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">Freeform content</h3>
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Title (e.g. Senior Offshore Technician)"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
            />
            <input
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="LinkedIn or portfolio URL"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
            />
            <textarea
              value={professionalSummary}
              onChange={(e) => setProfessionalSummary(e.target.value)}
              placeholder="Professional profile (one paragraph per line)"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent min-h-24"
            />
            <textarea
              value={keySkills}
              onChange={(e) => setKeySkills(e.target.value)}
              placeholder="Core skills (one per line)"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent min-h-20"
            />
            <textarea
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              placeholder="Education (one item per line)"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent min-h-20"
            />
            <textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Additional information (one item per line)"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent min-h-20"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">Custom sections</h3>
              <button
                onClick={addCustomSection}
                className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            {customSections.length === 0 && <p className="text-sm text-slate-500">No custom sections yet.</p>}
            {customSections.map((section) => (
              <div key={section.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-2">
                <input
                  value={section.title}
                  onChange={(e) => updateCustomSection(section.id, { title: e.target.value })}
                  placeholder="Section title"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
                />
                <textarea
                  value={section.content}
                  onChange={(e) => updateCustomSection(section.id, { content: e.target.value })}
                  placeholder="Section content"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent min-h-20"
                />
                <button
                  onClick={() => removeCustomSection(section.id)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">Profile data selection</h3>

            <div>
              <p className="text-xs font-bold text-slate-500 mb-2">Roles</p>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {roles.map((role) => (
                  <label key={role.profile_role_id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedRoleIds.includes(role.profile_role_id)}
                      onChange={() => toggleSelected(selectedRoleIds, role.profile_role_id, setSelectedRoleIds)}
                    />
                    <span>{role.role_name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-500 mb-2">Sea time entries</p>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {seaTime.map((entry) => (
                  <label key={entry.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedSeaTimeIds.includes(entry.id)}
                      onChange={() => toggleSelected(selectedSeaTimeIds, entry.id, setSelectedSeaTimeIds)}
                    />
                    <span>{entry.vessel_name || "Unnamed vessel"} ({formatDate(entry.start_date)} - {formatDate(entry.end_date)})</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-500 mb-2">ROV entries</p>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {rovExperience.map((entry) => (
                  <label key={entry.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedRovIds.includes(entry.id)}
                      onChange={() => toggleSelected(selectedRovIds, entry.id, setSelectedRovIds)}
                    />
                    <span>{entry.project_name || "Unnamed project"} ({formatDate(entry.start_date)} - {formatDate(entry.end_date)})</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-500 mb-2">Certificates</p>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {certificates.map((cert) => (
                  <label key={cert.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedCertIds.includes(cert.id)}
                      onChange={() => toggleSelected(selectedCertIds, cert.id, setSelectedCertIds)}
                    />
                    <span>{cert.cert_name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          </section>
        </div>

        <section className="w-full flex-1 bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">Live preview</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsOptionsCollapsed((prev) => !prev)}
                className="hidden xl:inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {isOptionsCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                {isOptionsCollapsed ? "Show Options" : "Hide Options"}
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <FileText className="w-4 h-4" /> Print / Save PDF
              </button>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-1 lg:grid-cols-12">
              <aside className="lg:col-span-4 bg-slate-900 dark:bg-slate-950 text-white p-8 space-y-8">
                {includeAvatar && (
                  <div className="flex justify-center">
                    <div className="w-36 h-36 rounded-2xl bg-slate-700 overflow-hidden flex items-center justify-center text-slate-300 text-sm">
                      {avatarPreviewUrl ? (
                        <img src={avatarPreviewUrl} alt="Profile photo" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-10 h-10 text-slate-300" />
                      )}
                    </div>
                  </div>
                )}

                {includePersonal && (
                  <div>
                    <h2 className="text-lg font-semibold mb-4 tracking-wide uppercase">Contact</h2>
                    <div className="space-y-3 text-sm text-slate-100">
                      {includePhone && (
                        <div className="flex items-center gap-3">
                          <Phone size={16} />
                          {profile.phone_number || "No phone"}
                        </div>
                      )}
                      {includeEmail && (
                        <div className="flex items-center gap-3">
                          <Mail size={16} />
                          {profile.contact_email || "No email"}
                        </div>
                      )}
                      {includeLocation && (
                        <div className="flex items-center gap-3">
                          <MapPin size={16} />
                          {[profile.current_city, profile.current_country].filter(Boolean).join(", ") || "No location"}
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <Globe size={16} />
                        {linkedinUrl || "No profile URL"}
                      </div>
                    </div>
                  </div>
                )}

                {includeCertificates && selectedCertificates.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold mb-4 tracking-wide uppercase">Certifications</h2>
                    <div className="space-y-2 text-sm text-slate-100">
                      {selectedCertificates.map((cert) => (
                        <div key={cert.id}>{cert.cert_name}</div>
                      ))}
                    </div>
                  </div>
                )}

                {skillItems.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold mb-4 tracking-wide uppercase">Core Skills</h2>
                    <div className="flex flex-wrap gap-2">
                      {skillItems.map((skill, idx) => (
                        <span key={`${skill}-${idx}`} className="px-2.5 py-1 rounded-full text-xs bg-slate-700 text-slate-100 border border-slate-600">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </aside>

              <main className="lg:col-span-8 p-8 md:p-10 space-y-10 text-slate-700 dark:text-slate-300">
                <header>
                  <h1 className="text-4xl font-bold text-slate-900 dark:text-white">{profile.full_name || "Unnamed Professional"}</h1>
                  {headline && <p className="text-lg text-slate-600 dark:text-slate-400 mt-2">{headline}</p>}
                </header>

                {summaryParagraphs.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold border-b border-slate-200 dark:border-slate-700 pb-2 mb-4 uppercase tracking-wide text-slate-900 dark:text-white">
                      Professional Profile
                    </h2>
                    <div className="space-y-2 leading-relaxed">
                      {summaryParagraphs.map((line, idx) => (
                        <p key={`${line}-${idx}`}>{line}</p>
                      ))}
                    </div>
                  </section>
                )}

                {(includeSeaTime && selectedSeaTime.length > 0) || (includeRov && selectedRovExperience.length > 0) ? (
                  <section>
                    <h2 className="text-xl font-semibold border-b border-slate-200 dark:border-slate-700 pb-2 mb-6 uppercase tracking-wide text-slate-900 dark:text-white">
                      Offshore Experience
                    </h2>
                    <div className="space-y-6">
                      {includeSeaTime && selectedSeaTime.map((entry) => (
                        <div key={entry.id}>
                          <div className="flex flex-wrap justify-between items-center gap-2">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{entry.vessel_name || "Unnamed vessel"}</h3>
                            <span className="text-sm text-slate-500 dark:text-slate-400">{formatDate(entry.start_date)} - {formatDate(entry.end_date) || "Present"}</span>
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {entry.profile_role_id ? roleByProfileRoleId[entry.profile_role_id] || "Sea Time Entry" : "Sea Time Entry"}
                            {entry.sea_days != null ? ` • ${entry.sea_days} days` : ""}
                          </p>
                          {entry.voyage_description && (
                            <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                              {asList(entry.voyage_description).map((point, idx) => (
                                <li key={`${entry.id}-voyage-${idx}`}>{point}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}

                      {includeRov && selectedRovExperience.map((entry) => (
                        <div key={entry.id}>
                          <div className="flex flex-wrap justify-between items-center gap-2">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{entry.project_name || "Unnamed project"}</h3>
                            <span className="text-sm text-slate-500 dark:text-slate-400">{formatDate(entry.start_date)} - {formatDate(entry.end_date) || "Present"}</span>
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {entry.client_name || "ROV Project"}
                            {entry.location ? ` • ${entry.location}` : ""}
                            {entry.offshore_days != null ? ` • ${entry.offshore_days} offshore days` : ""}
                          </p>
                          {entry.scope_of_work && (
                            <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                              {asList(entry.scope_of_work).map((point, idx) => (
                                <li key={`${entry.id}-scope-${idx}`}>{point}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                {includeRoles && selectedRoles.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold border-b border-slate-200 dark:border-slate-700 pb-2 mb-4 uppercase tracking-wide text-slate-900 dark:text-white">
                      Role Summary
                    </h2>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {selectedRoles.map((role) => (
                        <li key={role.profile_role_id}>
                          {role.role_name}
                          {role.category ? ` (${role.category})` : ""}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {educationLines.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold border-b border-slate-200 dark:border-slate-700 pb-2 mb-4 uppercase tracking-wide text-slate-900 dark:text-white">
                      Education
                    </h2>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {educationLines.map((line, idx) => (
                        <li key={`edu-${idx}`}>{line}</li>
                      ))}
                    </ul>
                  </section>
                )}

                {customSections
                  .filter((section) => section.title.trim() && section.content.trim())
                  .map((section) => (
                    <section key={section.id}>
                      <h2 className="text-xl font-semibold border-b border-slate-200 dark:border-slate-700 pb-2 mb-4 uppercase tracking-wide text-slate-900 dark:text-white">
                        {section.title}
                      </h2>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {asList(section.content).map((line, idx) => (
                          <li key={`${section.id}-${idx}`}>{line}</li>
                        ))}
                      </ul>
                    </section>
                  ))}

                {additionalInfoLines.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold border-b border-slate-200 dark:border-slate-700 pb-2 mb-4 uppercase tracking-wide text-slate-900 dark:text-white">
                      Additional Information
                    </h2>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {additionalInfoLines.map((line, idx) => (
                        <li key={`add-${idx}`}>{line}</li>
                      ))}
                    </ul>
                  </section>
                )}
              </main>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
