import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  CheckIcon,
  XMarkIcon,
  StarIcon,
  BoltIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  CpuChipIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const PricingPage = () => {
  const [billingCycle, setBillingCycle] = useState('monthly');

  const plans = [
    {
      name: "Starter",
      price: "$99.99",
      originalPrice: "$149.99",
      period: "/month",
      description: "Professional-grade AI credit repair for serious individuals",
      features: [
        "AI Credit Report Analysis",
        "10 Advanced Strategies (of 28)",
        "Monthly Credit Monitoring",
        "Basic Dispute Letters",
        "Email Support",
        "Educational Resources",
        "Progress Tracking Dashboard"
      ],
      limitations: [
        "5 disputes per month",
        "Monthly credit pulls only",
        "No phone support",
        "No real-time monitoring"
      ],
      cta: "Start Free Trial",
      popular: false,
      savings: "Premium Entry Point"
    },
    {
      name: "Professional", 
      price: "$139.99",
      originalPrice: "$199.99",
      period: "/month",
      description: "Complete AI-powered credit repair with weekly monitoring",
      features: [
        "Everything in Starter",
        "All 28 Advanced Strategies",
        "Weekly Credit Monitoring",
        "Method of Verification (MOV)",
        "Estoppel by Silence",
        "FCRA Violation Detection",
        "Unlimited Disputes",
        "Priority Email & Chat Support",
        "Custom Strategy Plans",
        "Advanced Analytics Dashboard",
        "Success Probability Predictions",
        "Personalized Improvement Roadmaps"
      ],
      limitations: [],
      cta: "Start Free Trial",
      popular: true,
      savings: "Most Popular Choice"
    },
    {
      name: "Pro Elite",
      price: "$299",
      originalPrice: "$399",
      period: "/month",
      description: "Premium concierge-level credit repair with real-time monitoring",
      features: [
        "Everything in Professional",
        "Real-Time Credit Monitoring (Daily)",
        "Dedicated Account Manager",
        "Phone Support (Priority Line)",
        "Expedited Dispute Processing",
        "Monthly Credit Coaching Sessions",
        "Identity Theft Protection",
        "Custom Legal Letter Templates",
        "Priority Bureau Communications",
        "Daily Credit Score Tracking",
        "Instant Fraud Alerts",
        "30-Day Results Guarantee"
      ],
      limitations: [],
      cta: "Start Free Trial",
      popular: false,
      savings: "White-Glove Service"
    },
    {
      name: "Enterprise",
      price: "Custom",
      originalPrice: "Starting $999", 
      period: "/month",
      description: "White-label platform for credit repair professionals and agencies",
      features: [
        "Everything in Pro Elite",
        "White-Label Platform (Custom Branding)",
        "Multi-Client Management (Unlimited)",
        "API Access for Integrations",
        "Custom Reporting & Analytics",
        "Dedicated Account Manager",
        "Training and Onboarding",
        "Revenue Sharing Options",
        "Client Management Dashboard",
        "Automated Client Onboarding",
        "Custom Pricing Controls",
        "Partner Portal Access"
      ],
      limitations: [],
      cta: "Contact Sales",
      popular: false,
      savings: "Business Solution"
    }
  ];

  const faqs = [
    {
      question: "Do you offer a free trial?",
      answer: "Yes! We offer a 14-day free trial with full access to all features. No credit card required to start. You can cancel anytime during the trial period."
    },
    {
      question: "What's included in the 90-day money-back guarantee?",
      answer: "If you don't see meaningful improvement in your credit score within 90 days of active use, we'll refund your entire subscription cost. We're confident our AI-powered approach works."
    },
    {
      question: "How is this different from other credit repair services?",
      answer: "Traditional services use basic dispute letters with 30-40% success rates. Our AI uses 28 advanced strategies with 60-85% success rates, including Method of Verification, Estoppel by Silence, and FCRA violation challenges."
    },
    {
      question: "Can I cancel anytime?",
      answer: "Absolutely. You can cancel your subscription at any time from your account dashboard. No cancellation fees or long-term contracts."
    },
    {
      question: "Do you offer discounts for annual billing?",
      answer: "Yes! Annual billing saves you 2 months compared to monthly billing. Plus, you get priority support and additional features."
    }
  ];

  const testimonials = [
    {
      name: "Sarah M.",
      score: "127 points",
      timeframe: "3 months",
      quote: "I went from 580 to 707 in just 3 months. The AI found errors I never would have caught myself.",
      location: "Austin, TX"
    },
    {
      name: "Michael R.",
      score: "89 points", 
      timeframe: "2 months",
      quote: "The Method of Verification strategy removed a bankruptcy that was incorrectly reported. Amazing!",
      location: "Denver, CO"
    },
    {
      name: "Jennifer L.",
      score: "156 points",
      timeframe: "4 months", 
      quote: "Best investment I ever made. My credit went from 'poor' to 'excellent' and I qualified for a mortgage.",
      location: "Miami, FL"
    }
  ];

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-900 to-purple-900 text-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              Choose Your 
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent"> Credit Freedom Plan</span>
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto mb-8">
              Start with our 14-day free trial. No credit card required. 
              90-day money-back guarantee on all paid plans.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center mb-12">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-1 flex">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-6 py-2 rounded-md font-medium transition-all ${
                    billingCycle === 'monthly'
                      ? 'bg-white text-blue-900 shadow-md'
                      : 'text-white hover:text-blue-200'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-6 py-2 rounded-md font-medium transition-all ${
                    billingCycle === 'yearly'
                      ? 'bg-white text-blue-900 shadow-md'
                      : 'text-white hover:text-blue-200'
                  }`}
                >
                  Yearly
                  <span className="ml-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    Save 17%
                  </span>
                </button>
              </div>
            </div>

            {/* Limited Time Offer */}
            <div className="bg-gradient-to-r from-red-500 to-pink-500 rounded-xl p-6 mb-8 inline-block">
              <div className="flex items-center justify-center mb-2">
                <BoltIcon className="w-6 h-6 text-white mr-2" />
                <span className="font-bold text-lg">Limited Time Launch Pricing</span>
              </div>
              <p className="text-sm">
                Save up to 70% off regular pricing. Offer expires soon!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative bg-white rounded-2xl shadow-xl border-2 transition-all hover:shadow-2xl ${
                  plan.popular 
                    ? 'border-blue-500 scale-105' 
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-2 rounded-full text-sm font-bold flex items-center">
                      <StarIcon className="w-4 h-4 mr-1" />
                      Most Popular
                    </div>
                  </div>
                )}

                <div className="p-8">
                  {/* Plan Header */}
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <p className="text-gray-600 mb-6">{plan.description}</p>
                    
                    <div className="mb-4">
                      <div className="flex items-center justify-center">
                        <span className="text-4xl font-bold text-gray-900">
                          ${billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                        </span>
                        <span className="text-gray-500 ml-2">
                          /{billingCycle === 'monthly' ? 'month' : 'year'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 line-through">
                        Regular: ${plan.originalPrice}/{billingCycle === 'monthly' ? 'month' : 'year'}
                      </div>
                      {billingCycle === 'yearly' && (
                        <div className="text-sm text-green-600 font-medium">
                          Save ${(plan.monthlyPrice * 12) - plan.yearlyPrice} per year
                        </div>
                      )}
                    </div>

                    <Button 
                      className={`w-full py-3 text-lg font-bold ${
                        plan.popular
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                          : 'bg-gray-900 hover:bg-gray-800'
                      } text-white`}
                    >
                      {plan.cta}
                    </Button>
                  </div>

                  {/* Features */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 flex items-center">
                      <CheckIcon className="w-5 h-5 text-green-600 mr-2" />
                      What's Included:
                    </h4>
                    <ul className="space-y-3">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start">
                          <CheckIcon className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {plan.limitations.length > 0 && (
                      <div className="pt-4 border-t border-gray-200">
                        <h4 className="font-semibold text-gray-900 flex items-center mb-3">
                          <XMarkIcon className="w-5 h-5 text-red-500 mr-2" />
                          Limitations:
                        </h4>
                        <ul className="space-y-2">
                          {plan.limitations.map((limitation, limitIndex) => (
                            <li key={limitIndex} className="flex items-start">
                              <XMarkIcon className="w-4 h-4 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-600 text-sm">{limitation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Trust Indicators */}
          <div className="text-center mt-16">
            <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <div className="flex flex-col items-center">
                <ShieldCheckIcon className="w-12 h-12 text-green-600 mb-3" />
                <div className="font-semibold text-gray-900">90-Day Guarantee</div>
                <div className="text-sm text-gray-600">Money back if not satisfied</div>
              </div>
              <div className="flex flex-col items-center">
                <CpuChipIcon className="w-12 h-12 text-blue-600 mb-3" />
                <div className="font-semibold text-gray-900">AI-Powered</div>
                <div className="text-sm text-gray-600">87% accuracy rate</div>
              </div>
              <div className="flex flex-col items-center">
                <DocumentTextIcon className="w-12 h-12 text-purple-600 mb-3" />
                <div className="font-semibold text-gray-900">FCRA Compliant</div>
                <div className="text-sm text-gray-600">Legally compliant strategies</div>
              </div>
              <div className="flex flex-col items-center">
                <ChartBarIcon className="w-12 h-12 text-indigo-600 mb-3" />
                <div className="font-semibold text-gray-900">Proven Results</div>
                <div className="text-sm text-gray-600">Average 85+ point increase</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Real Results from Real People
            </h2>
            <p className="text-xl text-gray-600">
              See how our AI-powered platform has transformed credit scores
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    +{testimonial.score}
                  </div>
                  <div className="text-sm text-gray-600">
                    Credit score increase in {testimonial.timeframe}
                  </div>
                </div>
                
                <blockquote className="text-gray-700 mb-4 italic">
                  "{testimonial.quote}"
                </blockquote>
                
                <div className="text-center">
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-600">{testimonial.location}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600">
              Get answers to common questions about our pricing and service
            </p>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{faq.question}</h3>
                <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-900 to-purple-900 text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Transform Your Credit Score?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands who've already experienced the power of AI-driven credit repair
          </p>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 mb-8">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-green-400 mb-2">14 Days</div>
                <div className="text-blue-200">Free Trial</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-400 mb-2">90 Days</div>
                <div className="text-blue-200">Money-Back Guarantee</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-400 mb-2">24/7</div>
                <div className="text-blue-200">AI Monitoring</div>
              </div>
            </div>
          </div>

          <Button 
            size="lg" 
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-12 py-6 text-xl font-bold shadow-2xl transform hover:scale-105 transition-all duration-200"
          >
            Start Your Free Trial Now
          </Button>

          <p className="text-sm text-blue-200 mt-4">
            No credit card required • Cancel anytime • 90-day guarantee
          </p>
        </div>
      </section>
    </div>
  );
};

export default PricingPage;

