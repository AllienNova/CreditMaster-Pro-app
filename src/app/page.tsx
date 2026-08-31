import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-effect border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-12">
              <Link href="/" className="text-2xl font-bold gradient-text">
                CreditMaster Pro
              </Link>
              <div className="hidden md:flex items-center space-x-8">
                <Link href="#features" className="text-gray-700 hover:text-gray-900 transition-colors">
                  Features
                </Link>
                <Link href="#how-it-works" className="text-gray-700 hover:text-gray-900 transition-colors">
                  How It Works
                </Link>
                <Link href="/pricing" className="text-gray-700 hover:text-gray-900 transition-colors">
                  Pricing
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-gray-700 hover:text-gray-900 transition-colors px-4 py-2"
              >
                Sign In
              </Link>
              <Link
                href="/login"
                className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 hero-gradient">
        <div className="max-w-7xl mx-auto text-center">
          <div className="animate-fadeInUp">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 bg-blue-50 rounded-full mb-6">
              <span className="text-blue-600 font-semibold text-sm">🚀 Agentic AI Platform • Available in All 50 States</span>
            </div>

            <h1 className="heading-xl mb-6">
              Transform Your Credit with
              <br />
              <span className="gradient-text">AI-Powered Intelligence.</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Advanced credit intelligence platform powered by 300+ AI models.
              Learn proven strategies, generate dispute letters, and take control of your credit journey.
            </p>

            {/* Value Props */}
            <div className="flex flex-wrap items-center justify-center gap-6 mb-12 text-sm md:text-base">
              <div className="flex items-center text-gray-700">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                AI-Powered Tools
              </div>
              <div className="flex items-center text-gray-700">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Expert Strategies
              </div>
              <div className="flex items-center text-gray-700">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Available Nationwide
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login" className="btn-primary">
                Get Started Free
              </Link>
              <Link href="#how-it-works" className="btn-secondary">
                See How It Works
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 animate-fadeIn">
            <div>
              <div className="text-4xl md:text-5xl font-bold gradient-text">300+</div>
              <div className="text-gray-600 mt-2">AI Models</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold gradient-text">50 States</div>
              <div className="text-gray-600 mt-2">Nationwide</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold gradient-text">24/7</div>
              <div className="text-gray-600 mt-2">AI Guidance</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold gradient-text">100K+</div>
              <div className="text-gray-600 mt-2">Users Educated</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="heading-lg mb-4">Powerful Credit Intelligence Tools</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to understand, improve, and master your credit profile
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="feature-card bg-white p-8 rounded-3xl shadow-lg">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3">AI Dispute Letter Generator</h3>
              <p className="text-gray-600">
                Generate professional, legally-compliant dispute letters using advanced AI. Learn the strategies that work and customize letters for your situation.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="feature-card bg-white p-8 rounded-3xl shadow-lg">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3">Credit Report Analysis</h3>
              <p className="text-gray-600">
                AI-powered analysis identifies errors, negative items, and opportunities. Get actionable insights and understand exactly what's impacting your score.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="feature-card bg-white p-8 rounded-3xl shadow-lg">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3">Utilization Optimizer</h3>
              <p className="text-gray-600">
                Smart strategies for managing credit card utilization. Learn optimal payment timing, balance distribution, and score-boosting techniques.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="feature-card bg-white p-8 rounded-3xl shadow-lg">
              <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3">Student Loan Strategies</h3>
              <p className="text-gray-600">
                Navigate federal programs, calculate optimal repayment plans, and discover forgiveness opportunities with AI-powered guidance.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="feature-card bg-white p-8 rounded-3xl shadow-lg">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3">Goodwill Letter Templates</h3>
              <p className="text-gray-600">
                AI-generated goodwill letters for late payment removal. Learn proven strategies and customize professional appeals to creditors.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="feature-card bg-white p-8 rounded-3xl shadow-lg">
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3">Pay-for-Delete Negotiation</h3>
              <p className="text-gray-600">
                Learn negotiation strategies for collection accounts. Access templates and guidance for successful pay-for-delete agreements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="heading-lg mb-4">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get started in minutes and see results in weeks
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-600 text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-2xl font-bold mb-4">Analyze Your Credit</h3>
              <p className="text-gray-600">
                Upload your credit reports and let our AI identify errors, negative items, and opportunities for improvement across all three bureaus.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-20 h-20 bg-purple-600 text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-2xl font-bold mb-4">Generate & Send Letters</h3>
              <p className="text-gray-600">
                Use AI-powered tools to create professional dispute letters, goodwill requests, and negotiation templates. Learn what works and why.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-20 h-20 bg-green-600 text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-2xl font-bold mb-4">Track Your Progress</h3>
              <p className="text-gray-600">
                Monitor responses, track score changes, and refine your strategy. Our AI learns from your results to optimize future actions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Technology Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="heading-lg mb-6">Powered by 300+ AI Models</h2>
              <p className="text-xl mb-8 opacity-90">
                We leverage the world's most advanced AI including Claude 4.5, GPT-5, DeepSeek R1, and Gemini 2.5 to deliver intelligent credit solutions.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <svg className="w-6 h-6 mr-3 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-lg">Intelligent model routing for optimal results</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 mr-3 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-lg">Multi-model consensus for critical decisions</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 mr-3 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-lg">Continuous learning from 100K+ successful cases</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 mr-3 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-lg">Enterprise-grade security and compliance</span>
                </li>
              </ul>
            </div>
            <div className="relative">
              <div className="glass-effect-dark p-8 rounded-3xl">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/10 rounded-xl">
                    <span className="font-semibold">Claude 4.5 Sonnet</span>
                    <span className="text-green-400">Active</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/10 rounded-xl">
                    <span className="font-semibold">GPT-5 Pro</span>
                    <span className="text-green-400">Active</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/10 rounded-xl">
                    <span className="font-semibold">DeepSeek R1</span>
                    <span className="text-green-400">Active</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/10 rounded-xl">
                    <span className="font-semibold">Gemini 2.5 Pro</span>
                    <span className="text-green-400">Active</span>
                  </div>
                  <div className="text-center pt-4 text-sm opacity-75">
                    + 296 more models available
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="heading-lg mb-4">Trusted by Thousands</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Real results from real people
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white p-8 rounded-3xl shadow-lg">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 mb-6">
                "The AI dispute generator and credit analysis tools helped me improve my score by 127 points in just 3 months. The strategies actually work!"
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                  SM
                </div>
                <div className="ml-4">
                  <div className="font-semibold">Sarah Martinez</div>
                  <div className="text-sm text-gray-500">Los Angeles, CA</div>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white p-8 rounded-3xl shadow-lg">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 mb-6">
                "The student loan strategies and PSLF optimization saved me $45,000. The AI-powered guidance made complex programs easy to understand!"
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
                  JC
                </div>
                <div className="ml-4">
                  <div className="font-semibold">James Chen</div>
                  <div className="text-sm text-gray-500">New York, NY</div>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white p-8 rounded-3xl shadow-lg">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 mb-6">
                "Finally qualified for a mortgage! The utilization optimizer and dispute tools made all the difference. Highly recommend!"
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold">
                  EP
                </div>
                <div className="ml-4">
                  <div className="font-semibold">Emily Parker</div>
                  <div className="text-sm text-gray-500">Austin, TX</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="heading-lg mb-6">Ready to Transform Your Credit?</h2>
          <p className="text-xl text-gray-600 mb-12">
            Join 100,000+ users who have improved their credit scores with AI-powered tools and strategies
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="btn-primary">
              Get Started Free
            </Link>
            <Link href="/pricing" className="btn-secondary">
              View Pricing
            </Link>
          </div>
          <p className="mt-8 text-gray-500">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Disclaimer */}
          <div className="mb-12 p-6 bg-blue-900/30 rounded-2xl border border-blue-500/30">
            <p className="text-sm text-gray-300 leading-relaxed">
              <strong className="text-white">Important:</strong> CreditMaster Pro provides AI-powered tools, templates, and educational resources
              to help you understand and manage your credit. We do not provide credit repair services directly.
              You maintain full control over all actions taken with your credit profile.
              Results may vary. All information is for educational purposes and does not constitute financial or legal advice.
              Available nationwide in all 50 states.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Company */}
            <div>
              <h3 className="text-xl font-bold mb-4 gradient-text">CreditMaster Pro</h3>
              <p className="text-gray-400 mb-4">
                Agentic Credit & Financial Intelligence Platform powered by 300+ AI models.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Tools */}
            <div>
              <h4 className="font-semibold mb-4">Tools</h4>
              <ul className="space-y-2">
                <li><Link href="/credit-repair" className="text-gray-400 hover:text-white transition-colors">Credit Tools</Link></li>
                <li><Link href="/ai-tools" className="text-gray-400 hover:text-white transition-colors">AI Generators</Link></li>
                <li><Link href="/student-loan-agent" className="text-gray-400 hover:text-white transition-colors">Student Loans</Link></li>
                <li><Link href="/pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Guides</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Templates</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Case Studies</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Help Center</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a></li>
                <li><Link href="/terms" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2025 CreditMaster Pro. All rights reserved.</p>
            <p className="mt-2 text-sm">
              AI-Powered Credit Intelligence Platform • Self-Service Tools & Resources • Available in All 50 States
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

