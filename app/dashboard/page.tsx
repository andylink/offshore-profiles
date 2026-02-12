"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Navbar from "@/components/Navbar"
import ProfileManagement from "@/components/profile-management"
import { 
  LayoutDashboard, User, Briefcase, Ship, Settings, 
  Menu, X, Eye, Award, Clock, AlertTriangle, ChevronRight, Anchor, ArrowRight,
  School2
} from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('home')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  useEffect(() => {
    const checkOnboarding = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push("/login")

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) setProfile(data)
      setLoading(false)
    }
    checkOnboarding()
  }, [router])

  if (loading) return <div className="p-8 text-center text-slate-500">Loading Fleet Command...</div>

  // --- WIZARD GATE ---
 if (!profile?.setup_completed) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Add the Navbar here so it's always visible */}
      <Navbar onLogout={handleLogout} />
      
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border dark:border-slate-800 text-center">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Anchor className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome Aboard! 🚢</h1>
          <p className="mt-4 text-slate-600 dark:text-slate-400 leading-relaxed">
            To get started, let's build your professional offshore profile. It only takes a few minutes to add your first role and vessel.
          </p>
          <button 
            onClick={() => router.push("/profile/setup")}
            className="mt-8 w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all group"
          >
            Start Profile Setup
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  )
}

  // --- RENDER LOGIC ---
  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <HomeOverview profile={profile} />
      case 'profile': return <ProfileManagement profile={profile} setProfile={setProfile} />
      case 'roles': return <div className="p-8">Role Management (Coming Soon)</div>
      case 'experience': return <div className="p-8">Experience Logs (Coming Soon)</div>
      case 'certificates': return <div className="p-8">Certificates (Coming Soon)</div>
      default: return <HomeOverview profile={profile} />
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* 1. SIDEBAR (Desktop) */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r dark:border-slate-800 
        transform transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex items-center justify-between">
          <span className="text-xl font-black text-blue-600 tracking-tighter">OFFSHORE PRO</span>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="mt-4 px-4 space-y-2">
          <NavItem icon={LayoutDashboard} label="Overview" active={activeTab === 'home'} onClick={() => {setActiveTab('home'); setIsSidebarOpen(false)}} />
          <NavItem icon={User} label="Personal Details" active={activeTab === 'profile'} onClick={() => {setActiveTab('profile'); setIsSidebarOpen(false)}} />
          <NavItem icon={Briefcase} label="Role Management" active={activeTab === 'roles'} onClick={() => {setActiveTab('roles'); setIsSidebarOpen(false)}} />
          <NavItem icon={Ship} label="Experience History" active={activeTab === 'experience'} onClick={() => {setActiveTab('experience'); setIsSidebarOpen(false)}} />
          <NavItem icon={School2} label="Certificates" active={activeTab === 'certificates'} onClick={() => {setActiveTab('certificates'); setIsSidebarOpen(false)}} />
          <div className="pt-4 border-t dark:border-slate-800">
            <NavItem icon={Settings} label="Settings" active={activeTab === 'settings'} onClick={() => {setActiveTab('settings'); setIsSidebarOpen(false)}} />
          </div>
        </nav>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-slate-900 border-b dark:border-slate-800 flex items-center justify-between px-4 md:px-8">
          <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-slate-600">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1" />
          <button onClick={async () => { await supabase.auth.signOut(); router.push("/login") }} className="text-sm font-bold text-slate-500 hover:text-red-500 transition-colors">
            Logout
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}

// --- SUB-COMPONENTS ---

function NavItem({ icon: Icon, label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all
        ${active 
          ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
          : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}
      `}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  )
}

function HomeOverview({ profile }: { profile: any }) {
  return (
    <div className="p-4 md:p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Fleet Command</h2>
        <p className="text-slate-500 text-sm">Welcome back, {profile?.full_name}</p>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={Eye} label="Profile Views" value="124" color="blue" />
        <StatCard icon={Award} label="Certificates" value="12" color="emerald" />
        <StatCard icon={AlertTriangle} label="Expiring Soon" value="2" color="amber" subtext="Within 90 days" />
      </div>

      {/* RECENT ACTIVITY PLACEHOLDER */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 p-6">
        <h3 className="font-bold text-slate-900 dark:text-white mb-4">Compliance Watch</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/20">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-sm font-bold text-amber-900 dark:text-amber-200">BOSIET Refresher</p>
                <p className="text-xs text-amber-700">Expires in 42 days</p>
              </div>
            </div>
            <button className="text-xs font-black uppercase text-amber-600 hover:underline">Update</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color, subtext }: any) {
  const colors: any = {
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
    emerald: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-900/10"
  }
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border dark:border-slate-800 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{label}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{value}</h3>
        {subtext && <span className="text-xs text-slate-400">{subtext}</span>}
      </div>
    </div>
  )
}