"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { CheckCircle2, Pencil, Plus, Trash2 } from "lucide-react"

type Profile = { id: string }

type AssignedRole = {
  profile_role_id: string
  role_id: string
  role_name: string
  category: string | null
}

type VesselType = {
  id: string
  type_name: string
}

type SeaTimeEntry = {
  id: string
  profile_role_id: string | null
  vessel_name: string | null
  vessel_type_id: string | null
  vessel_length_meters: number | null
  grt: number | null
  official_number: string | null
  imo_number: string | null
  start_date: string | null
  end_date: string | null
  voyage_description: string | null
  sea_days: number | null
  created_at: string | null
}

type ROVExperience = {
  id: string
  profile_id: string
  profile_role_id: string | null
  project_name: string | null
  client_name: string | null
  location: string | null
  vessel_name: string | null
  vessel_type_id: string | null
  installation_type: string | null
  rov_system: string | null
  rov_class: string | null
  serial_number: string | null
  start_date: string | null
  end_date: string | null
  offshore_days: number | null
  dive_hours: number | null
  total_system_hours: number | null
  scope_of_work: string | null
  created_at?: string | null
  updated_at?: string | null
}

const emptyForm = {
  profile_role_id: "",
  vessel_name: "",
  vessel_type_id: "",
  vessel_length_meters: "",
  grt: "",
  official_number: "",
  imo_number: "",
  start_date: "",
  end_date: "",
  voyage_description: "",
}

const emptyRovForm = {
  profile_role_id: "",
  project_name: "",
  client_name: "",
  location: "",
  vessel_name: "",
  vessel_type_id: "",
  installation_type: "",
  rov_system: "",
  rov_class: "",
  serial_number: "",
  start_date: "",
  end_date: "",
  offshore_days: "",
  dive_hours: "",
  total_system_hours: "",
  scope_of_work: "",
}

const isVesselCrewCategory = (category: string | null) => {
  if (!category) return false
  return category.toLowerCase().includes("vessel crew")
}

const isRovCategory = (category: string | null) => {
  if (!category) return false
  return category.toLowerCase().includes("rov")
}

const calculateSeaDays = (startDate: string, endDate: string) => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  const ms = end.getTime() - start.getTime()
  if (ms < 0) return null
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1
}

export default function ExperienceManagement({ profile }: { profile: Profile | null, setProfile: (p: any) => void }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingRov, setSavingRov] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [assignedRoles, setAssignedRoles] = useState<AssignedRole[]>([])
  const [vesselTypes, setVesselTypes] = useState<VesselType[]>([])
  const [entries, setEntries] = useState<SeaTimeEntry[]>([])
  const [rovExperiences, setRovExperiences] = useState<ROVExperience[]>([])

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingRovId, setDeletingRovId] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [showRovForm, setShowRovForm] = useState(false)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editingRovId, setEditingRovId] = useState<string | null>(null)

  const [form, setForm] = useState(emptyForm)
  const [rovForm, setRovForm] = useState(emptyRovForm)

  const assignedVesselCrewRoles = useMemo(() => {
    return assignedRoles.filter((role) => isVesselCrewCategory(role.category))
  }, [assignedRoles])

  const assignedRovRoles = useMemo(() => {
    return assignedRoles.filter((role) => isRovCategory(role.category))
  }, [assignedRoles])

  const roleNameByProfileRoleId = useMemo(() => {
    return assignedRoles.reduce<Record<string, string>>((acc, role) => {
      acc[role.profile_role_id] = role.role_name
      return acc
    }, {})
  }, [assignedRoles])

  const vesselTypeById = useMemo(() => {
    return vesselTypes.reduce<Record<string, string>>((acc, vesselType) => {
      acc[vesselType.id] = vesselType.type_name
      return acc
    }, {})
  }, [vesselTypes])

  const fetchData = useCallback(async (profileId: string) => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const [rolesRes, vesselTypesRes, seatimeRes, rovRes] = await Promise.all([
        supabase
          .from("profile_roles")
          .select("id, role_id, lookup_roles(role_name, category)")
          .eq("profile_id", profileId),
        supabase
          .from("lookup_vessel_types")
          .select("id, type_name")
          .order("display_order", { ascending: true })
          .order("type_name", { ascending: true }),
        supabase
          .from("profile_seatime")
          .select("id, profile_role_id, vessel_name, vessel_type_id, vessel_length_meters, grt, official_number, imo_number, start_date, end_date, voyage_description, sea_days, created_at")
          .eq("profile_id", profileId)
          .order("start_date", { ascending: false }),
        supabase
          .from("profile_rov_experience")
          .select("id, profile_id, profile_role_id, project_name, client_name, location, vessel_name, vessel_type_id, installation_type, rov_system, rov_class, serial_number, start_date, end_date, offshore_days, dive_hours, total_system_hours, scope_of_work, created_at, updated_at")
          .eq("profile_id", profileId)
          .order("start_date", { ascending: false }),
      ])

      if (rolesRes.error) throw rolesRes.error
      if (vesselTypesRes.error) throw vesselTypesRes.error
      if (seatimeRes.error) throw seatimeRes.error
      if (rovRes.error) throw rovRes.error

      const mappedRoles: AssignedRole[] = (rolesRes.data ?? []).map((row: any) => ({
        profile_role_id: row.id,
        role_id: row.role_id,
        role_name: row.lookup_roles?.role_name ?? "Unknown Role",
        category: row.lookup_roles?.category ?? null,
      }))

      const vesselCrewRoles = mappedRoles.filter((role) => isVesselCrewCategory(role.category))
      const rovRoles = mappedRoles.filter((role) => isRovCategory(role.category))

      setAssignedRoles(mappedRoles)
      setVesselTypes((vesselTypesRes.data as VesselType[]) ?? [])
      setEntries((seatimeRes.data as SeaTimeEntry[]) ?? [])
      setRovExperiences((rovRes.data as ROVExperience[]) ?? [])

      setForm((prev) => ({
        ...prev,
        profile_role_id: prev.profile_role_id || vesselCrewRoles[0]?.profile_role_id || "",
      }))

      setRovForm((prev) => ({
        ...prev,
        profile_role_id: prev.profile_role_id || rovRoles[0]?.profile_role_id || "",
      }))
    } catch (err: any) {
      setError(err?.message ?? "Failed to load experience history")
      setAssignedRoles([])
      setVesselTypes([])
      setEntries([])
      setRovExperiences([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!profile?.id) {
      setLoading(false)
      return
    }
    fetchData(profile.id)
  }, [profile?.id, fetchData])

  const startAddNew = () => {
    setError(null)
    setSuccess(null)
    setEditingEntryId(null)
    setForm({
      ...emptyForm,
      profile_role_id: assignedVesselCrewRoles[0]?.profile_role_id || "",
    })
    setShowForm(true)
  }

  const startEdit = (entry: SeaTimeEntry) => {
    setError(null)
    setSuccess(null)
    setEditingEntryId(entry.id)
    setForm({
      profile_role_id: entry.profile_role_id || assignedVesselCrewRoles[0]?.profile_role_id || "",
      vessel_name: entry.vessel_name || "",
      vessel_type_id: entry.vessel_type_id || "",
      vessel_length_meters: entry.vessel_length_meters != null ? String(entry.vessel_length_meters) : "",
      grt: entry.grt != null ? String(entry.grt) : "",
      official_number: entry.official_number || "",
      imo_number: entry.imo_number || "",
      start_date: entry.start_date || "",
      end_date: entry.end_date || "",
      voyage_description: entry.voyage_description || "",
    })
    setShowForm(true)
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditingEntryId(null)
    setForm({
      ...emptyForm,
      profile_role_id: assignedVesselCrewRoles[0]?.profile_role_id || "",
    })
  }

  const handleSaveEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!profile?.id) return

    setError(null)
    setSuccess(null)

    if (!form.profile_role_id || !form.vessel_name || !form.start_date || !form.end_date) {
      setError("Role, vessel name, start date and end date are required.")
      return
    }

    const seaDays = calculateSeaDays(form.start_date, form.end_date)
    if (seaDays === null) {
      setError("End date must be the same as or later than start date.")
      return
    }

    setSaving(true)
    try {
      const payload = {
        profile_id: profile.id,
        profile_role_id: form.profile_role_id,
        vessel_name: form.vessel_name,
        vessel_type_id: form.vessel_type_id || null,
        vessel_length_meters: form.vessel_length_meters ? Number(form.vessel_length_meters) : null,
        grt: form.grt ? Number(form.grt) : null,
        official_number: form.official_number || null,
        imo_number: form.imo_number || null,
        start_date: form.start_date,
        end_date: form.end_date,
        voyage_description: form.voyage_description || null,
      }

      if (editingEntryId) {
        const { error: updateError } = await supabase
          .from("profile_seatime")
          .update(payload)
          .eq("id", editingEntryId)
          .eq("profile_id", profile.id)
        if (updateError) throw updateError
        setSuccess("Sea time entry updated.")
      } else {
        const { error: insertError } = await supabase.from("profile_seatime").insert(payload)
        if (insertError) throw insertError
        setSuccess("Sea time entry added.")
      }

      setForm({
        ...emptyForm,
        profile_role_id: form.profile_role_id,
      })
      setShowForm(false)
      setEditingEntryId(null)
      await fetchData(profile.id)
    } catch (err: any) {
      setError(err?.message ?? "Failed to save sea time entry")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!profile?.id) return
    if (!window.confirm("Delete this sea time entry?")) return

    setDeletingId(id)
    setError(null)
    setSuccess(null)

    try {
      const { error: deleteError } = await supabase
        .from("profile_seatime")
        .delete()
        .eq("id", id)
        .eq("profile_id", profile.id)

      if (deleteError) throw deleteError
      setEntries((prev) => prev.filter((entry) => entry.id !== id))
      setSuccess("Sea time entry deleted.")
    } catch (err: any) {
      setError(err?.message ?? "Failed to delete sea time entry")
    } finally {
      setDeletingId(null)
    }
  }

  const startAddRov = () => {
    setError(null)
    setSuccess(null)
    setEditingRovId(null)
    setRovForm({
      ...emptyRovForm,
      profile_role_id: assignedRovRoles[0]?.profile_role_id || "",
    })
    setShowRovForm(true)
  }

  const startEditRov = (entry: ROVExperience) => {
    setError(null)
    setSuccess(null)
    setEditingRovId(entry.id)
    setRovForm({
      profile_role_id: entry.profile_role_id || assignedRovRoles[0]?.profile_role_id || "",
      project_name: entry.project_name || "",
      client_name: entry.client_name || "",
      location: entry.location || "",
      vessel_name: entry.vessel_name || "",
      vessel_type_id: entry.vessel_type_id || "",
      installation_type: entry.installation_type || "",
      rov_system: entry.rov_system || "",
      rov_class: entry.rov_class || "",
      serial_number: entry.serial_number || "",
      start_date: entry.start_date || "",
      end_date: entry.end_date || "",
      offshore_days: entry.offshore_days != null ? String(entry.offshore_days) : "",
      dive_hours: entry.dive_hours != null ? String(entry.dive_hours) : "",
      total_system_hours: entry.total_system_hours != null ? String(entry.total_system_hours) : "",
      scope_of_work: entry.scope_of_work || "",
    })
    setShowRovForm(true)
  }

  const cancelRovForm = () => {
    setShowRovForm(false)
    setEditingRovId(null)
    setRovForm({
      ...emptyRovForm,
      profile_role_id: assignedRovRoles[0]?.profile_role_id || "",
    })
  }

  const handleSaveRov = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!profile?.id) return

    setSavingRov(true)
    setError(null)
    setSuccess(null)

    if (!rovForm.profile_role_id || !rovForm.project_name || !rovForm.start_date || !rovForm.end_date) {
      setError("Role, project name, start date and end date are required.")
      setSavingRov(false)
      return
    }

    if (new Date(rovForm.end_date) < new Date(rovForm.start_date)) {
      setError("End date must be the same as or later than start date.")
      setSavingRov(false)
      return
    }

    const payload = {
      profile_id: profile.id,
      profile_role_id: rovForm.profile_role_id,
      project_name: rovForm.project_name,
      client_name: rovForm.client_name || null,
      location: rovForm.location || null,
      vessel_name: rovForm.vessel_name || null,
      vessel_type_id: rovForm.vessel_type_id || null,
      installation_type: rovForm.installation_type || null,
      rov_system: rovForm.rov_system || null,
      rov_class: rovForm.rov_class || null,
      serial_number: rovForm.serial_number || null,
      start_date: rovForm.start_date,
      end_date: rovForm.end_date,
      offshore_days: rovForm.offshore_days ? Number(rovForm.offshore_days) : null,
      dive_hours: rovForm.dive_hours ? Number(rovForm.dive_hours) : null,
      total_system_hours: rovForm.total_system_hours ? Number(rovForm.total_system_hours) : null,
      scope_of_work: rovForm.scope_of_work || null,
    }

    try {
      if (editingRovId) {
        const { error: updateError } = await supabase
          .from("profile_rov_experience")
          .update(payload)
          .eq("id", editingRovId)
          .eq("profile_id", profile.id)
        if (updateError) throw updateError
        setSuccess("ROV experience updated.")
      } else {
        const { error: insertError } = await supabase.from("profile_rov_experience").insert(payload)
        if (insertError) throw insertError
        setSuccess("ROV experience added.")
      }

      setShowRovForm(false)
      setEditingRovId(null)
      await fetchData(profile.id)
    } catch (err: any) {
      setError(err?.message ?? "Failed to save ROV experience")
    } finally {
      setSavingRov(false)
    }
  }

  const handleDeleteRov = async (id: string) => {
    if (!profile?.id) return
    if (!window.confirm("Delete this ROV experience entry?")) return

    setDeletingRovId(id)
    setError(null)
    setSuccess(null)

    try {
      const { error: deleteError } = await supabase
        .from("profile_rov_experience")
        .delete()
        .eq("id", id)
        .eq("profile_id", profile.id)

      if (deleteError) throw deleteError
      setRovExperiences((prev) => prev.filter((row) => row.id !== id))
      setSuccess("ROV experience deleted.")
    } catch (err: any) {
      setError(err?.message ?? "Failed to delete ROV experience")
    } finally {
      setDeletingRovId(null)
    }
  }

  if (!profile?.id) {
    return <div className="p-8 text-slate-500">No profile found.</div>
  }

  if (loading) {
    return <div className="p-8 text-slate-500">Loading experience history...</div>
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Experience History</h2>
        <p className="text-slate-500 text-sm">Digital discharge book and ROV project entries for your assigned roles.</p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {success}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Sea Time</h3>
          <p className="text-slate-500 text-sm">Digital discharge book entries for your Vessel Crew roles.</p>
        </div>

        {assignedVesselCrewRoles.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 p-6 text-slate-600 dark:text-slate-300">
            Assign at least one role in the <span className="font-bold">Vessel Crew</span> category in Role Management to add sea time entries.
          </div>
        ) : (
          <>
            {entries.length === 0 && !showForm && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 p-6">
                <p className="text-slate-600 dark:text-slate-300 mb-4">No sea time records yet.</p>
                <button
                  onClick={startAddNew}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
                >
                  <Plus className="w-4 h-4" />
                  Add Sea Time Record
                </button>
              </div>
            )}

            {entries.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sea Time Records</h3>
                  <button
                    onClick={startAddNew}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Add Sea Time Record
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                        <th className="text-left py-2 pr-4">Vessel</th>
                        <th className="text-left py-2 pr-4">Role</th>
                        <th className="text-left py-2 pr-4">Dates</th>
                        <th className="text-left py-2 pr-4">Sea Days</th>
                        <th className="text-left py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry) => (
                        <tr key={entry.id} className="border-b border-slate-100 dark:border-slate-900">
                          <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-200">{entry.vessel_name || "-"}</td>
                          <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">
                            {entry.profile_role_id ? (roleNameByProfileRoleId[entry.profile_role_id] || "Unknown Role") : "Unknown Role"}
                          </td>
                          <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{entry.start_date || "-"} → {entry.end_date || "-"}</td>
                          <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{entry.sea_days ?? "-"}</td>
                          <td className="py-3">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => startEdit(entry)}
                                className="text-slate-500 hover:text-blue-600 transition-colors"
                                aria-label="Edit sea time entry"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(entry.id)}
                                disabled={deletingId === entry.id}
                                className="text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                aria-label="Delete sea time entry"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {showForm && (
              <form onSubmit={handleSaveEntry} className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 p-6 space-y-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{editingEntryId ? "Edit Sea Time Entry" : "Add Sea Time Entry"}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Role *</label>
                    <select
                      required
                      value={form.profile_role_id}
                      onChange={(e) => setForm((prev) => ({ ...prev, profile_role_id: e.target.value }))}
                      className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-800"
                    >
                      <option value="">Select Role</option>
                      {assignedVesselCrewRoles.map((role) => (
                        <option key={role.profile_role_id} value={role.profile_role_id}>
                          {role.role_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Vessel Name *</label>
                    <input
                      required
                      value={form.vessel_name}
                      onChange={(e) => setForm((prev) => ({ ...prev, vessel_name: e.target.value }))}
                      className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-800"
                      placeholder="e.g. Atlantic Guardian"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Vessel Type</label>
                    <select
                      value={form.vessel_type_id}
                      onChange={(e) => setForm((prev) => ({ ...prev, vessel_type_id: e.target.value }))}
                      className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-800"
                    >
                      <option value="">Select Vessel Type</option>
                      {vesselTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.type_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Vessel Length (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.vessel_length_meters}
                      onChange={(e) => setForm((prev) => ({ ...prev, vessel_length_meters: e.target.value }))}
                      className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-800"
                      placeholder="e.g. 87.5"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">GRT</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.grt}
                      onChange={(e) => setForm((prev) => ({ ...prev, grt: e.target.value }))}
                      className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-800"
                      placeholder="e.g. 2500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Official Number</label>
                    <input
                      value={form.official_number}
                      onChange={(e) => setForm((prev) => ({ ...prev, official_number: e.target.value }))}
                      className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">IMO Number</label>
                    <input
                      value={form.imo_number}
                      onChange={(e) => setForm((prev) => ({ ...prev, imo_number: e.target.value }))}
                      className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Start Date *</label>
                    <input
                      required
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))}
                      className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">End Date *</label>
                    <input
                      required
                      type="date"
                      value={form.end_date}
                      onChange={(e) => setForm((prev) => ({ ...prev, end_date: e.target.value }))}
                      className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Voyage Description</label>
                  <textarea
                    rows={3}
                    value={form.voyage_description}
                    onChange={(e) => setForm((prev) => ({ ...prev, voyage_description: e.target.value }))}
                    className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-800"
                    placeholder="e.g. North Sea campaign, DP watchkeeping and deck operations"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={cancelForm}
                    className="px-5 py-3 rounded-xl font-bold border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    {saving ? "Saving Entry..." : editingEntryId ? "Save Changes" : "Add Sea Time Entry"}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>

      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">ROV Experience</h3>
          <p className="text-slate-500 text-sm">Capture ROV projects for your assigned ROV category roles.</p>
        </div>

        {assignedRovRoles.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 p-6 text-slate-600 dark:text-slate-300">
            Assign at least one role in the <span className="font-bold">ROV</span> category in Role Management to add ROV experience records.
          </div>
        ) : (
          <>
            {rovExperiences.length === 0 && !showRovForm && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 p-6">
                <p className="text-slate-600 dark:text-slate-300 mb-4">No ROV experience records yet.</p>
                <button
                  onClick={startAddRov}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
                >
                  <Plus className="w-4 h-4" />
                  Add ROV Experience
                </button>
              </div>
            )}

            {rovExperiences.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">ROV Experience Records</h4>
                  <button
                    onClick={startAddRov}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Add ROV Experience
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                        <th className="text-left py-2 pr-4">Project</th>
                        <th className="text-left py-2 pr-4">Role</th>
                        <th className="text-left py-2 pr-4">Client</th>
                        <th className="text-left py-2 pr-4">Dates</th>
                        <th className="text-left py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rovExperiences.map((entry) => (
                        <tr key={entry.id} className="border-b border-slate-100 dark:border-slate-900">
                          <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-200">{entry.project_name || "-"}</td>
                          <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{entry.profile_role_id ? (roleNameByProfileRoleId[entry.profile_role_id] || "Unknown Role") : "Unknown Role"}</td>
                          <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{entry.client_name || "-"}</td>
                          <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{entry.start_date || "-"} → {entry.end_date || "-"}</td>
                          <td className="py-3">
                            <div className="flex items-center gap-3">
                              <button onClick={() => startEditRov(entry)} className="text-slate-500 hover:text-blue-600 transition-colors" aria-label="Edit ROV experience">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteRov(entry.id)} disabled={deletingRovId === entry.id} className="text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50" aria-label="Delete ROV experience">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {showRovForm && (
              <form onSubmit={handleSaveRov} className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 p-6 space-y-4">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">{editingRovId ? "Edit ROV Experience" : "Add ROV Experience"}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Role *</label>
                    <select required value={rovForm.profile_role_id} onChange={(e) => setRovForm((prev) => ({ ...prev, profile_role_id: e.target.value }))} className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-800">
                      <option value="">Select Role</option>
                      {assignedRovRoles.map((role) => (
                        <option key={role.profile_role_id} value={role.profile_role_id}>{role.role_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Project Name *</label>
                    <input required value={rovForm.project_name} onChange={(e) => setRovForm((prev) => ({ ...prev, project_name: e.target.value }))} className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Client</label>
                    <input value={rovForm.client_name} onChange={(e) => setRovForm((prev) => ({ ...prev, client_name: e.target.value }))} className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Location</label>
                    <input value={rovForm.location} onChange={(e) => setRovForm((prev) => ({ ...prev, location: e.target.value }))} className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Vessel Name</label>
                    <input value={rovForm.vessel_name} onChange={(e) => setRovForm((prev) => ({ ...prev, vessel_name: e.target.value }))} className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Serial Number</label>
                    <input value={rovForm.serial_number} onChange={(e) => setRovForm((prev) => ({ ...prev, serial_number: e.target.value }))} className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Installation Type</label>
                    <input value={rovForm.installation_type} onChange={(e) => setRovForm((prev) => ({ ...prev, installation_type: e.target.value }))} className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">ROV System</label>
                    <input value={rovForm.rov_system} onChange={(e) => setRovForm((prev) => ({ ...prev, rov_system: e.target.value }))} className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">ROV Class</label>
                    <input value={rovForm.rov_class} onChange={(e) => setRovForm((prev) => ({ ...prev, rov_class: e.target.value }))} className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Start Date *</label>
                    <input required type="date" value={rovForm.start_date} onChange={(e) => setRovForm((prev) => ({ ...prev, start_date: e.target.value }))} className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">End Date *</label>
                    <input required type="date" value={rovForm.end_date} onChange={(e) => setRovForm((prev) => ({ ...prev, end_date: e.target.value }))} className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Offshore Days</label>
                    <input type="number" value={rovForm.offshore_days} onChange={(e) => setRovForm((prev) => ({ ...prev, offshore_days: e.target.value }))} className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Dive Hours</label>
                    <input type="number" step="0.1" value={rovForm.dive_hours} onChange={(e) => setRovForm((prev) => ({ ...prev, dive_hours: e.target.value }))} className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Total System Hours</label>
                    <input type="number" step="0.1" value={rovForm.total_system_hours} onChange={(e) => setRovForm((prev) => ({ ...prev, total_system_hours: e.target.value }))} className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-800" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Scope of Work</label>
                  <textarea rows={3} value={rovForm.scope_of_work} onChange={(e) => setRovForm((prev) => ({ ...prev, scope_of_work: e.target.value }))} className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-800" />
                </div>

                <div className="flex justify-end gap-3">
                  <button type="button" onClick={cancelRovForm} className="px-5 py-3 rounded-xl font-bold border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
                  <button type="submit" disabled={savingRov} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition">
                    {savingRov ? "Saving..." : editingRovId ? "Save Changes" : "Add ROV Experience"}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
