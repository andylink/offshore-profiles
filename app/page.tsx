import Link from "next/link";
import { DarkModeToggle } from "@/app/dark-mode-toggle";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Navigation */}
      <nav className="border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">O</span>
            </div>
            <span className="text-xl font-bold tracking-tight">OffshorePro</span>
          </div>

          <div className="flex items-center gap-4">
            <DarkModeToggle />
            <Link 
              href="/login" 
              className="text-sm font-medium hover:text-blue-600 dark:hover:text-blue-400 transition"
            >
              Log in
            </Link>
            <Link 
              href="/register" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              Join Now
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main>
        <section className="py-20 px-6 text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
            Your Offshore Career, <span className="text-blue-600">Verified & Global.</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-10 leading-relaxed">
            The professional digital hub for offshore workers. Upload your BOSIET, medicals, and certifications. 
            Share your verified profile with recruiters via a custom URL.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold shadow-lg shadow-blue-500/20 transition-all scale-100 hover:scale-105">
              Create My Profile
            </button>
            <button className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-8 py-4 rounded-xl font-semibold transition hover:bg-slate-50 dark:hover:bg-slate-700/50">
              Browse Talent
            </button>
          </div>
          
          <p className="mt-6 text-sm text-slate-500">
            site.com/<span className="font-mono text-blue-500">yourname</span>
          </p>
        </section>

        {/* Features Grid */}
        <section className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-100 dark:border-slate-800">
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon="🚢" 
              title="Certification Vault" 
              desc="Securely store your BOSIET, FOET, and medical certificates with expiry alerts."
            />
            <FeatureCard 
              icon="🌍" 
              title="Shareable CV" 
              desc="A professional public profile designed specifically for the maritime and oil & gas industry."
            />
            <FeatureCard 
              icon="⚡" 
              title="Quick Apply" 
              desc="Instantly export your profile to PDF or share a direct link with hiring managers."
            />
          </div>
        </section>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string, title: string, desc: string }) {
  return (
    <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-slate-600 dark:text-slate-400">{desc}</p>
    </div>
  );
}