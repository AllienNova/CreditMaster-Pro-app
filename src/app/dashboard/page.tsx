
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import OnboardingTour from '@/components/onboarding/OnboardingTour'
import { useOnboarding } from '@/components/onboarding/OnboardingProvider'
import { dashboardTourSteps } from '@/components/onboarding/tours/dashboardTour'

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface User {
  id: string
  email: string
  user_metadata: {
    full_name?: string
  }
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { hasCompletedOnboarding, completeOnboarding, skipOnboarding } = useOnboarding()
  const [showTour, setShowTour] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      setUser(session.user as User)
      setLoading(false)

      // Show onboarding tour for new users
      if (!hasCompletedOnboarding) {
        setTimeout(() => setShowTour(true), 1000)
      }
    }

    getUser()
  }, [router, supabase.auth, hasCompletedOnboarding])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your AI credit dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">🤖</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
                  CreditMaster Pro
                </h1>
                <p className="text-sm text-gray-500">Credit Intelligence Dashboard</p>
              </div>
            </div>
            
            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <a href="/dashboard" className="text-sm font-medium text-blue-600 border-b-2 border-blue-600 pb-1">Dashboard</a>
              <a href="/student-loan-agent" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">Student Loans</a>
              <a href="/pricing" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">Pricing</a>
            </nav>

            <div className="flex items-center space-x-4">
              <span className="hidden sm:block text-sm text-gray-700 max-w-32 truncate">
                Welcome, {user?.user_metadata?.full_name || user?.email}
              </span>
              <button 
                onClick={handleSignOut}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8" data-tour="welcome">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Your Credit Intelligence Dashboard
          </h2>
          <p className="text-gray-600 text-sm sm:text-base">
            Track your progress, access AI-powered tools, and monitor your credit improvement journey.
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-lg p-4 sm:p-6 hover:shadow-xl transition-shadow" data-tour="credit-score">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Credit Score</h3>
              <span className="text-green-600 text-lg">📈</span>
            </div>
            <div className="text-2xl font-bold text-green-600">678</div>
            <p className="text-xs text-green-600">+36 from last month</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-lg p-4 sm:p-6 hover:shadow-xl transition-shadow" data-tour="ai-tools">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">AI Tools Used</h3>
              <span className="text-blue-600 text-lg">🤖</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">12</div>
            <p className="text-xs text-gray-600">Letters generated this month</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-lg p-4 sm:p-6 hover:shadow-xl transition-shadow" data-tour="disputes">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Disputes Sent</h3>
              <span className="text-orange-600 text-lg">⚠️</span>
            </div>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-gray-600">7 completed this month</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-lg p-4 sm:p-6 hover:shadow-xl transition-shadow" data-tour="strategies">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Strategies Learned</h3>
              <span className="text-purple-600 text-lg">⚡</span>
            </div>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-gray-600">Personalized for you</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-lg p-4 sm:p-6 mb-8" data-tour="quick-actions">
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-green-600 text-lg">🛡️</span>
            <h3 className="text-lg font-semibold">Quick Access Tools</h3>
          </div>
          <p className="text-gray-600 mb-6 text-sm sm:text-base">Access your AI-powered credit intelligence tools</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              type="button"
              data-tour="get-started"
              className="h-20 flex flex-col items-center justify-center space-y-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all transform hover:scale-105 shadow-lg"
            >
              <span className="text-xl">📤</span>
              <span className="text-sm text-center">Upload Credit Report</span>
            </button>
            <button
              type="button"
              className="h-20 flex flex-col items-center justify-center space-y-2 border-2 border-blue-200 hover:bg-blue-50 rounded-lg transition-all transform hover:scale-105 hover:border-blue-300"
            >
              <span className="text-xl text-blue-600">🤖</span>
              <span className="text-sm text-blue-600 text-center">AI Analysis</span>
            </button>
            <button
              type="button"
              className="h-20 flex flex-col items-center justify-center space-y-2 border-2 border-purple-200 hover:bg-purple-50 rounded-lg transition-all transform hover:scale-105 hover:border-purple-300"
            >
              <span className="text-xl text-purple-600">📄</span>
              <span className="text-sm text-purple-600 text-center">Generate Dispute</span>
            </button>
            <button
              type="button"
              className="h-20 flex flex-col items-center justify-center space-y-2 border-2 border-cyan-200 hover:bg-cyan-50 rounded-lg transition-all transform hover:scale-105 hover:border-cyan-300"
            >
              <span className="text-xl text-cyan-600">⚡</span>
              <span className="text-sm text-cyan-600 text-center">View AI Strategies</span>
            </button>
          </div>
        </div>

        {/* Student Loan CTA */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 rounded-lg p-6 text-white" data-tour="student-loan">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
            <div className="mb-4 sm:mb-0">
              <h3 className="text-xl font-bold mb-2">🎓 Student Loan Specialist</h3>
              <p className="text-blue-100 text-sm sm:text-base">
                Get specialized AI-powered help with your student loan credit repair
              </p>
            </div>
            <a
              href="/student-loan-agent"
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors whitespace-nowrap"
            >
              Get Started
            </a>
          </div>
        </div>
      </main>

      {/* Onboarding Tour */}
      <OnboardingTour
        steps={dashboardTourSteps}
        isOpen={showTour}
        onComplete={() => {
          setShowTour(false)
          completeOnboarding()
        }}
        onSkip={() => {
          setShowTour(false)
          skipOnboarding()
        }}
      />
    </div>
  )
}

