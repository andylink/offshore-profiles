"use client"
import React, { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { User, X } from "lucide-react"
import Link from "next/link"

type Profile = { id: string }
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

	useEffect(() => {
		if (!profile?.id) {
			setCerts([])
			return
		}

		let mounted = true

		const fetchCerts = async () => {
			setLoading(true)
			setError(null)

			try {
				// First attempt: relational join if a foreign key / relationship exists
				const { data: relationalData, error: relationalErr } = await supabase
					.from("profile_certs")
					.select("*, lookup_certs(id, cert_name, category)")
					.eq("profile_id", profile.id)
					.order("created_at", { ascending: false })

				if (!relationalErr && relationalData) {
					if (!mounted) return
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
					.eq("profile_id", profile.id)
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

				if (!mounted) return

				setCerts(
					certsData.map((c: any) => ({
						...c,
						cert_name: lookupMap[c.cert_id]?.cert_name ?? "Unknown",
						category: lookupMap[c.cert_id]?.category ?? null,
					}))
				)
			} catch (err: any) {
				console.error(err)
				if (mounted) setError(err?.message ?? "Failed to load certificates")
			} finally {
				if (mounted) setLoading(false)
			}
		}

		fetchCerts()

		return () => {
			mounted = false
		}
	}, [profile?.id])

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
		const handleEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setSelectedCert(null)
				setCertificateUrl(null)
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

	return (
		<div>
			<h3 className="text-lg font-medium">Certificates</h3>

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
											{c.certificate_url ? (
												<button
													onClick={() => setSelectedCert(c)}
													className="text-blue-600 hover:text-blue-800 font-medium"
												>
													View
												</button>
											) : null}
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
		</div>
	)
}