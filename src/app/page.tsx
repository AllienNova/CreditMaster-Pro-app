import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CreditMaster Pro - AI-Powered Credit Repair & Financial Wellness",
  description: "Transform your credit score with AI-powered dispute automation, personalized strategies, and real-time monitoring. Join 50,000+ users who improved their credit by an average of 100+ points.",
  openGraph: {
    title: "CreditMaster Pro - AI-Powered Credit Repair",
    description: "Transform your credit score with AI-powered dispute automation and personalized strategies.",
    type: "website",
    url: "https://creditmasterpro.com",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CreditMaster Pro - AI-Powered Credit Repair",
    description: "Transform your credit score with AI-powered dispute automation.",
  },
};

// Animated Credit Score Component
function AnimatedCreditScore() {
  return (
    <div className="relative w-64 h-64 mx-auto">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="50" cy="50" r="45" fill="none"
          stroke="url(#gradient)" strokeWidth="8"
          strokeDasharray="283" strokeDashoffset="70"
          strokeLinecap="round"
          className="animate-pulse"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-bold bg-gradient-to-r from-emerald-500 to-blue-500 bg-clip-text text-transparent">
          750
        </span>
        <span className="text-sm text-gray-500 mt-1">Excellent</span>
        <span className="text-xs text-emerald-500 mt-1">+127 points</span>
      </div>
    </div>
  );
}

// Feature Card Component
function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

// Testimonial Card Component
function TestimonialCard({ quote, name, score, image }: { quote: string; name: string; score: string; image: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
      <div className="flex items-center mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-emerald-400 to-blue-500 flex items-center justify-center text-white font-bold">
          {image}
        </div>
        <div className="ml-4">
          <p className="font-semibold text-gray-900">{name}</p>
          <p className="text-sm text-emerald-500">{score}</p>
        </div>
      </div>
      <p className="text-gray-600 italic">&ldquo;{quote}&rdquo;</p>
      <div className="flex mt-4 text-yellow-400">
        {"★★★★★".split("").map((star, i) => <span key={i}>{star}</span>)}
      </div>
    </div>
  );
}

// Pricing Card Component
function PricingCard({ name, price, features, popular }: { name: string; price: string; features: string[]; popular?: boolean }) {
  return (
    <div className={`rounded-xl p-6 ${popular ? "bg-gradient-to-br from-emerald-500 to-blue-600 text-white scale-105" : "bg-white border border-gray-200"}`}>
      {popular && <span className="text-xs font-semibold bg-white text-emerald-600 px-3 py-1 rounded-full">MOST POPULAR</span>}
      <h3 className={`text-xl font-bold mt-4 ${popular ? "text-white" : "text-gray-900"}`}>{name}</h3>
      <p className={`text-3xl font-bold mt-2 ${popular ? "text-white" : "text-gray-900"}`}>{price}<span className="text-sm font-normal">/mo</span></p>
      <ul className="mt-6 space-y-3">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center">
            <span className={`mr-2 ${popular ? "text-emerald-200" : "text-emerald-500"}`}>✓</span>
            <span className={popular ? "text-white/90" : "text-gray-600"}>{feature}</span>
          </li>
        ))}
      </ul>
      <Link href="/auth/signup" className={`block mt-6 py-3 px-6 rounded-lg text-center font-semibold transition ${popular ? "bg-white text-emerald-600 hover:bg-gray-100" : "bg-emerald-500 text-white hover:bg-emerald-600"}`}>
        Get Started
      </Link>
    </div>
  );
}

// FAQ Item Component
function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group bg-white rounded-lg border border-gray-200 overflow-hidden">
      <summary className="flex items-center justify-between p-4 cursor-pointer font-semibold text-gray-900 hover:bg-gray-50">
        {question}
        <span className="ml-4 text-emerald-500 group-open:rotate-180 transition-transform">▼</span>
      </summary>
      <p className="px-4 pb-4 text-gray-600">{answer}</p>
    </details>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-blue-600 bg-clip-text text-transparent">
              CreditMaster Pro
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="text-gray-600 hover:text-gray-900">Features</Link>
              <Link href="#how-it-works" className="text-gray-600 hover:text-gray-900">How It Works</Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900">Pricing</Link>
              <Link href="/auth/login" className="text-gray-600 hover:text-gray-900">Login</Link>
              <Link href="/auth/signup" className="bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition">
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
                Transform Your <span className="bg-gradient-to-r from-emerald-500 to-blue-600 bg-clip-text text-transparent">Credit Score</span> with AI
              </h1>
              <p className="mt-6 text-xl text-gray-600">
                Join 50,000+ users who improved their credit by an average of 100+ points using our AI-powered dispute automation and personalized strategies.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link href="/auth/signup" className="bg-emerald-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-emerald-600 transition text-center">
                  Start Free 7-Day Trial
                </Link>
                <Link href="#demo" className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:border-emerald-500 hover:text-emerald-500 transition text-center">
                  Watch Demo
                </Link>
              </div>
              <div className="mt-8 flex items-center gap-6 text-sm text-gray-500">
                <span className="flex items-center"><span className="text-emerald-500 mr-1">✓</span> No credit card required</span>
                <span className="flex items-center"><span className="text-emerald-500 mr-1">✓</span> Cancel anytime</span>
              </div>
            </div>
            <div className="flex justify-center">
              <AnimatedCreditScore />
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 text-gray-400">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">50K+</p>
              <p className="text-sm">Active Users</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">100+</p>
              <p className="text-sm">Avg Point Increase</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">85%</p>
              <p className="text-sm">Dispute Success Rate</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">4.9★</p>
              <p className="text-sm">User Rating</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900">Powerful Features for Credit Success</h2>
            <p className="mt-4 text-xl text-gray-600">Everything you need to repair, build, and maintain excellent credit</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard icon="🤖" title="AI-Powered Disputes" description="Generate legally-compliant dispute letters in seconds using advanced AI trained on thousands of successful cases." />
            <FeatureCard icon="📊" title="Real-Time Monitoring" description="Track your credit score across all three bureaus with instant alerts for any changes or suspicious activity." />
            <FeatureCard icon="🎯" title="Personalized Strategies" description="Get custom action plans based on your unique credit profile and financial goals." />
            <FeatureCard icon="📈" title="Score Simulator" description="See how different actions will impact your score before you take them." />
            <FeatureCard icon="💳" title="Credit Building Tools" description="Access secured cards, credit builder loans, and authorized user strategies." />
            <FeatureCard icon="🔒" title="Bank-Level Security" description="Your data is protected with 256-bit encryption and SOC 2 compliance." />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900">How It Works</h2>
            <p className="mt-4 text-xl text-gray-600">Three simple steps to better credit</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center text-2xl font-bold text-emerald-600">1</div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">Connect</h3>
              <p className="mt-2 text-gray-600">Securely link your credit reports from all three bureaus in minutes.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600">2</div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">Analyze</h3>
              <p className="mt-2 text-gray-600">Our AI scans your reports to identify errors, inaccuracies, and opportunities.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center text-2xl font-bold text-purple-600">3</div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">Repair</h3>
              <p className="mt-2 text-gray-600">Generate and send dispute letters automatically, then track results in real-time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900">What Our Users Say</h2>
            <p className="mt-4 text-xl text-gray-600">Join thousands of satisfied customers</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <TestimonialCard image="JD" name="James D." score="+142 points in 90 days" quote="I was skeptical at first, but CreditMaster Pro helped me remove 5 negative items and my score jumped from 580 to 722!" />
            <TestimonialCard image="SM" name="Sarah M." score="+98 points in 60 days" quote="The AI dispute letters are incredible. I got approved for my first mortgage after using this service for just 2 months." />
            <TestimonialCard image="RK" name="Robert K." score="+115 points in 45 days" quote="Best investment I've made. The personalized strategies and real-time monitoring made all the difference." />
          </div>
        </div>
      </section>

      {/* Pricing Preview Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900">Simple, Transparent Pricing</h2>
            <p className="mt-4 text-xl text-gray-600">Choose the plan that fits your needs</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard name="Basic" price="$29" features={["3 Dispute Letters/Month", "Credit Monitoring", "Score Simulator", "Email Support"]} />
            <PricingCard name="Premium" price="$79" features={["Unlimited Disputes", "All 3 Bureau Monitoring", "AI Strategy Engine", "Priority Support", "Goodwill Letters"]} popular />
            <PricingCard name="Enterprise" price="$199" features={["Everything in Premium", "Dedicated Account Manager", "White-Label Options", "API Access", "Custom Integrations"]} />
          </div>
          <div className="text-center mt-8">
            <Link href="/pricing" className="text-emerald-500 hover:text-emerald-600 font-semibold">
              View Full Pricing Details →
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            <FAQItem question="How long does it take to see results?" answer="Most users see their first dispute results within 30-45 days. Significant score improvements typically occur within 60-90 days of consistent use." />
            <FAQItem question="Is this legal?" answer="Absolutely! We help you exercise your legal rights under the Fair Credit Reporting Act (FCRA) to dispute inaccurate, incomplete, or unverifiable information on your credit reports." />
            <FAQItem question="Will this hurt my credit score?" answer="No. Disputing items on your credit report does not negatively impact your score. In fact, successful disputes often lead to score improvements." />
            <FAQItem question="Can I cancel anytime?" answer="Yes! There are no long-term contracts. You can cancel your subscription at any time with no cancellation fees." />
            <FAQItem question="Is my data secure?" answer="Yes. We use bank-level 256-bit encryption and are SOC 2 compliant. We never sell your data to third parties." />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-emerald-500 to-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white">Ready to Transform Your Credit?</h2>
          <p className="mt-4 text-xl text-white/90">Join 50,000+ users who have improved their credit scores with CreditMaster Pro</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup" className="bg-white text-emerald-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition">
              Start Your Free Trial
            </Link>
            <Link href="/contact" className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white/10 transition">
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-2xl font-bold text-white mb-4">CreditMaster Pro</h3>
              <p className="text-sm">AI-powered credit repair and financial wellness platform.</p>
              <div className="flex gap-4 mt-4">
                <a href="#" className="hover:text-white">𝕏</a>
                <a href="#" className="hover:text-white">in</a>
                <a href="#" className="hover:text-white">f</a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/features" className="hover:text-white">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="/integrations" className="hover:text-white">Integrations</Link></li>
                <li><Link href="/api" className="hover:text-white">API</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/help" className="hover:text-white">Help Center</Link></li>
                <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
                <li><Link href="/guides" className="hover:text-white">Guides</Link></li>
                <li><Link href="/webinars" className="hover:text-white">Webinars</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
                <li><Link href="/security" className="hover:text-white">Security</Link></li>
                <li><Link href="/compliance" className="hover:text-white">Compliance</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-sm text-center">
            <p>© 2024 CreditMaster Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
