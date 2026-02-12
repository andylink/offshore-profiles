"use client"
import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { CheckCircle2 } from "lucide-react"

type Profile = { id: string }

type LookupRole = {
	id: string
	role_name: string
	category: string | null
	display_order: number | null
}

export default function RolesManagement({ profile }: { profile: Profile | null, setProfile: (p: any) => void }) {
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState<string | null>(null)

	const [roles, setRoles] = useState<LookupRole[]>([])
	const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])

	const fetchData = useCallback(async (profileId: string) => {
		setLoading(true)
		setError(null)
		setSuccess(null)

		try {
			const [
				{ data: lookupRoles, error: lookupError },
				{ data: assignedRoles, error: assignedError },
			] = await Promise.all([
				supabase
					.from("lookup_roles")
					.select("id, role_name, category, display_order")
					.order("display_order", { ascending: true })
					.order("role_name", { ascending: true }),
				supabase
					.from("profile_roles")
					.select("id, role_id")
					.eq("profile_id", profileId),
			])

			if (lookupError) throw lookupError
			if (assignedError) throw assignedError

			setRoles((lookupRoles as LookupRole[]) ?? [])
			setSelectedRoleIds((assignedRoles ?? []).map((row: any) => row.role_id).filter(Boolean))
		} catch (err: any) {
			setError(err?.message ?? "Failed to load roles")
			setRoles([])
			setSelectedRoleIds([])
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		if (!profile?.id) {
			setRoles([])
			setSelectedRoleIds([])
			setLoading(false)
			return
		}

		fetchData(profile.id)
	}, [profile?.id, fetchData])

	const groupedRoles = useMemo(() => {
		return roles.reduce<Record<string, LookupRole[]>>((acc, role) => {
			const category = role.category || "Other"
			if (!acc[category]) acc[category] = []
			acc[category].push(role)
			return acc
		}, {})
	}, [roles])

	const categories = useMemo(() => Object.keys(groupedRoles).sort((a, b) => a.localeCompare(b)), [groupedRoles])

	const toggleRole = (roleId: string) => {
		setSuccess(null)
		setSelectedRoleIds((prev) =>
			prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
		)
	}

	const handleSaveRoles = async () => {
		if (!profile?.id) return

		setSaving(true)
		setError(null)
		setSuccess(null)

		try {
			const { error: deleteError } = await supabase.from("profile_roles").delete().eq("profile_id", profile.id)
			if (deleteError) throw deleteError

			if (selectedRoleIds.length > 0) {
				const inserts = selectedRoleIds.map((roleId) => ({
					profile_id: profile.id,
					role_id: roleId,
				}))

				const { error: insertError } = await supabase.from("profile_roles").insert(inserts)
				if (insertError) throw insertError
			}

			await fetchData(profile.id)
			setSuccess("Roles updated successfully.")
		} catch (err: any) {
			setError(err?.message ?? "Failed to save roles")
		} finally {
			setSaving(false)
		}
	}

	if (!profile?.id) {
		return <div className="p-8 text-slate-500">No profile found.</div>
	}

	if (loading) {
		return <div className="p-8 text-slate-500">Loading roles...</div>
	}

	return (
		<div className="p-4 md:p-8 max-w-4xl space-y-6">
			<div>
				<h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Role Management</h2>
				<p className="text-slate-500 text-sm">
					Select all roles you can work in. These roles will drive your future experience forms.
				</p>
			</div>

			{error && (
				<div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
					{error}
				</div>
			)}

			{success && (
				<div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-3 text-sm flex items-center gap-2">
					<CheckCircle2 className="w-4 h-4" />
					{success}
				</div>
			)}

			{categories.length === 0 ? (
				<div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 p-6 text-slate-500">
					No roles are available. Check role lookup table data and access policies.
				</div>
			) : (
				<div className="space-y-4">
					{categories.map((category) => (
						<div key={category} className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 p-5">
							<h3 className="text-sm font-black uppercase tracking-wider text-slate-500 mb-4">{category}</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								{groupedRoles[category].map((role) => {
									const checked = selectedRoleIds.includes(role.id)
									return (
										<label
											key={role.id}
											className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
												checked
													? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20"
													: "border-slate-200 dark:border-slate-700"
											}`}
										>
											<input
												type="checkbox"
												checked={checked}
												onChange={() => toggleRole(role.id)}
												className="w-4 h-4 rounded border-slate-300 text-blue-600"
											/>
											<span className="text-sm font-medium text-slate-800 dark:text-slate-200">{role.role_name}</span>
										</label>
									)
								})}
							</div>
						</div>
					))}
				</div>
			)}

			<div className="flex items-center justify-between gap-4">
				<p className="text-sm text-slate-500">Selected roles: {selectedRoleIds.length}</p>
				<button
					onClick={handleSaveRoles}
					disabled={saving}
					className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition"
				>
					{saving ? "Saving Roles..." : "Save Roles"}
				</button>
			</div>
		</div>
	)
}