"use client"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { X } from "lucide-react"

type Profile = { id: string }
type LookupCert = {
	id: string
	cert_name: string
	category?: string | null
	display_order?: number | null
}

type ProfileCert = {
	id: string
	profile_id: string
	cert_id: string | null
	expiry_date: string | null
	issue_date: string | null
	issued_by?: string | null
	certificate_url?: string | null
	has_no_expiry?: boolean | null
	created_at?: string | null
}

export default function CertsManagement({ profile, setProfile }: { profile: Profile | null, setProfile: (p: any) => void }) {
	const [certs, setCerts] = useState<Array<ProfileCert & { cert_name?: string }>>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [selectedCert, setSelectedCert] = useState<(ProfileCert & { cert_name?: string }) | null>(null)
	const [certificateUrl, setCertificateUrl] = useState<string | null>(null)
	const [loadingUrl, setLoadingUrl] = useState(false)
	const [showAddModal, setShowAddModal] = useState(false)
	const [lookupCerts, setLookupCerts] = useState<LookupCert[]>([])
	const [loadingLookup, setLoadingLookup] = useState(false)
	const [savingCert, setSavingCert] = useState(false)
	const [deletingCertId, setDeletingCertId] = useState<string | null>(null)
	const [addError, setAddError] = useState<string | null>(null)
	const [selectedCategory, setSelectedCategory] = useState("")
	const [certificateFile, setCertificateFile] = useState<File | null>(null)
	const certificateFileInputRef = useRef<HTMLInputElement | null>(null)
	const [newCertForm, setNewCertForm] = useState({
		cert_id: "",
		issue_date: "",
		expiry_date: "",
		has_no_expiry: false,
		issued_by: "",
	})

	const closeAddModal = () => {
		setShowAddModal(false)
		setAddError(null)
		setSelectedCategory("")
		setCertificateFile(null)
		if (certificateFileInputRef.current) certificateFileInputRef.current.value = ""
		setNewCertForm({
			cert_id: "",
			issue_date: "",
			expiry_date: "",
			has_no_expiry: false,
			issued_by: "",
		})
	}

	const fetchCerts = useCallback(async (profileId: string) => {
		setLoading(true)
		setError(null)

		try {
			// First attempt: relational join if a foreign key / relationship exists
			const { data: relationalData, error: relationalErr } = await supabase
				.from("profile_certs")
				.select("*, lookup_certs(id, cert_name, category)")
				.eq("profile_id", profileId)
				.order("created_at", { ascending: false })

			if (!relationalErr && relationalData) {
				// relationalData rows will have a `lookup_certs` field when relation exists
				const mapped = relationalData.map((r: any) => ({
					id: r.id,
					profile_id: r.profile_id,
					cert_id: r.cert_id ?? null,
					expiry_date: r.expiry_date ?? null,
					issue_date: r.issue_date ?? null,
					issued_by: r.issued_by ?? null,
					certificate_url: r.certificate_url ?? null,
					has_no_expiry: r.has_no_expiry ?? null,
					created_at: r.created_at ?? null,
					cert_name: r.lookup_certs?.cert_name ?? "Unknown",
					category: r.lookup_certs?.category ?? null,
				}))
				setCerts(mapped)
				return
			}

			// Fallback: previous approach (lookup by cert_id)
			const { data: profileCerts, error: profileErr } = await supabase
				.from("profile_certs")
				.select("*")
				.eq("profile_id", profileId)
				.order("created_at", { ascending: false })

			if (profileErr) throw profileErr

			const certsData = profileCerts ?? []
			const certIds = certsData.map((c: any) => c.cert_id).filter(Boolean)

			let lookupMap: Record<string, { cert_name: string; category?: string | null }> = {}
			if (certIds.length) {
				const { data: lookupData, error: lookupErr } = await supabase
					.from("lookup_certs")
					.select("id, cert_name, category")
					.in("id", certIds)

				if (lookupErr) throw lookupErr

				lookupMap = (lookupData ?? []).reduce((acc: any, l: any) => {
					acc[l.id] = { cert_name: l.cert_name, category: l.category }
					return acc
				}, {})
			}

			setCerts(
				certsData.map((c: any) => ({
					...c,
					cert_name: lookupMap[c.cert_id]?.cert_name ?? "Unknown",
					category: lookupMap[c.cert_id]?.category ?? null,
				}))
			)
		} catch (err: any) {
			console.error(err)
			setError(err?.message ?? "Failed to load certificates")
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		if (!profile?.id) {
			setCerts([])
			return
		}

		fetchCerts(profile.id)
	}, [profile?.id, fetchCerts])

	// Group certs by category
	const grouped = certs.reduce<Record<string, Array<typeof certs[number]>>>(
		(acc, c) => {
			const cat = (c as any).category ?? "Uncategorized"
			if (!acc[cat]) acc[cat] = []
			acc[cat].push(c)
			return acc
		},
		{}
	)

	const categories = Object.keys(grouped).sort((a, b) => a.localeCompare(b))
	const lookupCategories = Array.from(new Set(lookupCerts.map((c) => c.category ?? "Uncategorized"))).sort((a, b) => a.localeCompare(b))
	const filteredLookupCerts = lookupCerts.filter((c) => (c.category ?? "Uncategorized") === selectedCategory)

	function getRag(cert: any) {
		if (cert.has_no_expiry) return { label: "Valid", color: "bg-green-100 text-green-800", daysRemaining: null }
		if (!cert.expiry_date) return { label: "Unknown", color: "bg-gray-100 text-gray-700", daysRemaining: null }

		const now = new Date()
		const exp = new Date(cert.expiry_date)
		const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

		if (diffDays < 0) return { label: "Expired", color: "bg-red-100 text-red-800", daysRemaining: diffDays }
		if (diffDays <= 60) return { label: "Expiring", color: "bg-amber-100 text-amber-800", daysRemaining: diffDays }
		return { label: "Valid", color: "bg-green-100 text-green-800", daysRemaining: diffDays }
	}

	// Handle ESC key to close modal
	useEffect(() => {
		if (!showAddModal) return

		let active = true
		const loadLookupCerts = async () => {
			setLoadingLookup(true)
			try {
				const { data, error: lookupError } = await supabase
					.from("lookup_certs")
					.select("id, cert_name, category, display_order")
					.order("display_order", { ascending: true })
					.order("cert_name", { ascending: true })

				if (lookupError) throw lookupError
				if (active) setLookupCerts(data ?? [])
			} catch (err: any) {
				if (active) setAddError(err?.message ?? "Failed to load certificate options")
			} finally {
				if (active) setLoadingLookup(false)
			}
		}

		loadLookupCerts()

		return () => {
			active = false
		}
	}, [showAddModal])

	useEffect(() => {
		const handleEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setSelectedCert(null)
				setCertificateUrl(null)
				closeAddModal()
			}
		}
		window.addEventListener("keydown", handleEsc)
		return () => window.removeEventListener("keydown", handleEsc)
	}, [])

	// Fetch certificate URL from storage when a cert is selected
	useEffect(() => {
		if (!selectedCert?.certificate_url) {
			setCertificateUrl(null)
			return
		}

		const fetchCertificateUrl = async () => {
			setLoadingUrl(true)
			try {
				// Try to get a signed URL (for private buckets)
				const { data: signedData, error: signedError } = await supabase
					.storage
					.from('certificates')
					.createSignedUrl(selectedCert.certificate_url as string, 3600) // 1 hour expiry

				if (!signedError && signedData?.signedUrl) {
					setCertificateUrl(signedData.signedUrl)
					return
				}

				// Fallback: try public URL (for public buckets)
				const { data: publicData } = supabase
					.storage
					.from('certificates')
					.getPublicUrl(selectedCert.certificate_url as string)

				if (publicData?.publicUrl) {
					setCertificateUrl(publicData.publicUrl)
				}
			} catch (err) {
				console.error('Error fetching certificate URL:', err)
			} finally {
				setLoadingUrl(false)
			}
		}

		fetchCertificateUrl()
	}, [selectedCert])

	const handleAddCertificate = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		setAddError(null)

		if (!profile?.id) {
			setAddError("Profile not available")
			return
		}

		if (!newCertForm.cert_id) {
			setAddError("Please select a certificate")
			return
		}

		if (!newCertForm.has_no_expiry && !newCertForm.expiry_date) {
			setAddError("Please set an expiry date or select no expiry")
			return
		}

		setSavingCert(true)
		try {
			let uploadedPath: string | null = null
			if (certificateFile) {
				const safeFileName = certificateFile.name.replace(/\s+/g, "-")
				uploadedPath = `${profile.id}/certificates/${Date.now()}-${safeFileName}`

				const { error: uploadError } = await supabase
					.storage
					.from("certificates")
					.upload(uploadedPath, certificateFile, { upsert: false })

				if (uploadError) throw uploadError
			}

			const { error: insertError } = await supabase
				.from("profile_certs")
				.insert({
					profile_id: profile.id,
					cert_id: newCertForm.cert_id,
					issue_date: newCertForm.issue_date || null,
					expiry_date: newCertForm.has_no_expiry ? null : (newCertForm.expiry_date || null),
					has_no_expiry: newCertForm.has_no_expiry,
					issued_by: newCertForm.issued_by || null,
					certificate_url: uploadedPath,
				})

			if (insertError) throw insertError

			closeAddModal()
			await fetchCerts(profile.id)
		} catch (err: any) {
			setAddError(err?.message ?? "Failed to add certificate")
		} finally {
			setSavingCert(false)
		}
	}

	const handleDeleteCertificate = async (cert: ProfileCert & { cert_name?: string }) => {
		if (!profile?.id) return

		const confirmDelete = window.confirm(`Delete certificate "${cert.cert_name ?? cert.cert_id ?? "Unknown"}"?`)
		if (!confirmDelete) return

		setError(null)
		setDeletingCertId(cert.id)
		try {
			const { data: deletedRows, error: deleteError } = await supabase
				.from("profile_certs")
				.delete()
				.eq("id", cert.id)
				.eq("profile_id", profile.id)
				.select("id")

			if (deleteError) throw deleteError

			if (!deletedRows?.length) {
				throw new Error("No certificate was deleted. Check row permissions (RLS) for delete on profile_certs.")
			}

			if (selectedCert?.id === cert.id) {
				setSelectedCert(null)
				setCertificateUrl(null)
			}

			await fetchCerts(profile.id)
		} catch (err: any) {
			setError(err?.message ?? "Failed to delete certificate")
		} finally {
			setDeletingCertId(null)
		}
	}

	return (
		<div>
			<div className="flex items-center justify-between gap-3">
				<h3 className="text-lg font-medium">Certificates</h3>
				<button
					onClick={() => {
						setAddError(null)
						setSelectedCategory("")
						setCertificateFile(null)
							if (certificateFileInputRef.current) certificateFileInputRef.current.value = ""
						setShowAddModal(true)
					}}
					className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
					disabled={!profile?.id}
				>
					Add New
				</button>
			</div>

			{loading && <div>Loading certificates…</div>}
			{error && <div className="text-red-600">{error}</div>}

			{!loading && !certs.length && <div className="text-sm text-muted-foreground">No certificates found.</div>}

			<div className="space-y-6 mt-4">
				{categories.map((cat) => (
					<section key={cat}>
						<h4 className="text-sm font-semibold mb-2">{cat}</h4>
						<ul className="space-y-2">
							{grouped[cat].map((c) => {
								const rag = getRag(c)
								return (
									<li key={c.id} className="p-3 border rounded">
										<div className="flex items-center justify-between">
											<div>
												<div className="flex items-center gap-2">
													<div className="font-medium">{c.cert_name ?? c.cert_id}</div>
													<span className={`${rag.color} px-2 py-0.5 rounded text-xs font-medium`}>
														{rag.label}
														{rag.label === "Expiring" && rag.daysRemaining !== null && ` (${rag.daysRemaining} days)`}
													</span>
												</div>
												<div className="text-sm text-muted-foreground">
													Issued: {c.issue_date ? new Date(c.issue_date).toLocaleDateString() : "—"}
													{" • "}
													Expires: {c.has_no_expiry ? "No expiry" : c.expiry_date ? new Date(c.expiry_date).toLocaleDateString() : "—"}
												</div>
											</div>
											<div className="flex items-center gap-3">
												{c.certificate_url ? (
													<button
														onClick={() => setSelectedCert(c)}
														className="text-blue-600 hover:text-blue-800 font-medium"
													>
														View
													</button>
												) : null}
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation()
														void handleDeleteCertificate(c)
													}}
													className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
													disabled={deletingCertId === c.id}
												>
													{deletingCertId === c.id ? "Deleting..." : "Delete"}
												</button>
											</div>
										</div>
									</li>
								)
							})}
						</ul>
					</section>
				))}
			</div>

			{/* Certificate Modal */}
			{selectedCert && selectedCert.certificate_url && (
				<div
					className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
					onClick={() => {
						setSelectedCert(null)
						setCertificateUrl(null)
					}}
				>
					<div
						className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
							<h3 className="text-lg font-semibold">{selectedCert.cert_name ?? "Certificate"}</h3>
							<button
								onClick={() => {
									setSelectedCert(null)
									setCertificateUrl(null)
								}}
								className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
							>
								<X className="w-5 h-5" />
							</button>
						</div>
						<div className="flex-1 overflow-auto p-4">
							{loadingUrl ? (
								<div className="flex items-center justify-center h-[70vh]">
									<div>Loading certificate...</div>
								</div>
							) : certificateUrl ? (
								<>
									<iframe
										src={certificateUrl}
										className="w-full h-[70vh] border rounded"
										title="Certificate"
									/>
									<div className="mt-4 flex gap-2">
										<a
											href={certificateUrl}
											target="_blank"
											rel="noreferrer"
											className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
										>
											Open in New Tab
										</a>
									</div>
								</>
							) : (
								<div className="flex items-center justify-center h-[70vh] text-red-600">
									Failed to load certificate
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Add Certificate Modal */}
			{showAddModal && (
				<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeAddModal}>
					<div
						className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
							<h3 className="text-lg font-semibold">Add Certificate</h3>
							<button onClick={closeAddModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
								<X className="w-5 h-5" />
							</button>
						</div>

						<form onSubmit={handleAddCertificate} className="p-4 space-y-4">
							<div>
								<label className="block text-sm font-medium mb-1">Category *</label>
								<select
									value={selectedCategory}
									onChange={(e) => {
										setSelectedCategory(e.target.value)
										setNewCertForm((prev) => ({ ...prev, cert_id: "" }))
									}}
									className="w-full border rounded px-3 py-2 bg-transparent"
									required
									disabled={loadingLookup}
								>
									<option value="">Select a category</option>
									{lookupCategories.map((category) => (
										<option key={category} value={category}>
											{category}
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium mb-1">Certificate *</label>
								<select
									value={newCertForm.cert_id}
									onChange={(e) => setNewCertForm((prev) => ({ ...prev, cert_id: e.target.value }))}
									className="w-full border rounded px-3 py-2 bg-transparent"
									required
									disabled={loadingLookup || !selectedCategory}
								>
									<option value="">{selectedCategory ? "Select a certificate" : "Select a category first"}</option>
									{filteredLookupCerts.map((cert) => (
										<option key={cert.id} value={cert.id}>
											{cert.cert_name}
										</option>
									))}
								</select>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium mb-1">Issue Date</label>
									<input
										type="date"
										value={newCertForm.issue_date}
										onChange={(e) => setNewCertForm((prev) => ({ ...prev, issue_date: e.target.value }))}
										className="w-full border rounded px-3 py-2 bg-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium mb-1">Expiry Date</label>
									<input
										type="date"
										value={newCertForm.expiry_date}
										onChange={(e) => setNewCertForm((prev) => ({ ...prev, expiry_date: e.target.value }))}
										className="w-full border rounded px-3 py-2 bg-transparent"
										disabled={newCertForm.has_no_expiry}
										required={!newCertForm.has_no_expiry}
									/>
								</div>
							</div>

							<label className="flex items-center gap-2 text-sm">
								<input
									type="checkbox"
									checked={newCertForm.has_no_expiry}
									onChange={(e) =>
										setNewCertForm((prev) => ({
											...prev,
											has_no_expiry: e.target.checked,
											expiry_date: e.target.checked ? "" : prev.expiry_date,
										}))
									}
								/>
								No expiry date
							</label>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium mb-1">Issued By</label>
									<input
										type="text"
										value={newCertForm.issued_by}
										onChange={(e) => setNewCertForm((prev) => ({ ...prev, issued_by: e.target.value }))}
										className="w-full border rounded px-3 py-2 bg-transparent"
										placeholder="Issuer"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium mb-1">Certificate File</label>
									<input
										ref={certificateFileInputRef}
										type="file"
										accept="application/pdf,image/*"
										onChange={(e) => setCertificateFile(e.target.files?.[0] ?? null)}
										className="hidden"
									/>
									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={() => certificateFileInputRef.current?.click()}
											className="px-3 py-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-700"
										>
											{certificateFile ? "Change File" : "Upload File"}
										</button>
										{certificateFile && (
											<button
												type="button"
												onClick={() => {
													setCertificateFile(null)
													if (certificateFileInputRef.current) certificateFileInputRef.current.value = ""
												}}
												className="px-3 py-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-700"
											>
												Remove
											</button>
										)}
									</div>
									{certificateFile && <div className="text-xs mt-1">{certificateFile.name}</div>}
									<div className="text-xs text-muted-foreground mt-1">
										Optional. If provided, the file is uploaded to storage automatically.
									</div>
								</div>
							</div>

							{addError && <div className="text-sm text-red-600">{addError}</div>}

							<div className="flex justify-end gap-2 pt-2">
								<button
									type="button"
									onClick={closeAddModal}
									className="px-4 py-2 border rounded"
									disabled={savingCert}
								>
									Cancel
								</button>
								<button
									type="submit"
									className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
									disabled={savingCert || loadingLookup}
								>
									{savingCert ? "Saving..." : "Save Certificate"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	)
}