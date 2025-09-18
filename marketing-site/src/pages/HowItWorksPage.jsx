import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DocumentTextIcon,
  CpuChipIcon,
  BoltIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  PlayIcon,
  ClockIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const HowItWorksPage = () => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      number: 1,
      title: "Upload Your Credit Reports",
      subtitle: "Secure AI Analysis in Minutes",
      description: "Simply upload your credit reports from all three bureaus. Our AI instantly analyzes every line item with 87% accuracy, identifying opportunities that human reviewers often miss.",
      details: [
        "Drag-and-drop file upload (PDF, Word, or images)",
        "Bank-level encryption protects your data",
        "AI processes reports 50x faster than humans",
        "Identifies all negative items, errors, and opportunities",
        "Cross-bureau discrepancy detection"
      ],
      icon: DocumentTextIcon,
      color: "blue",
      timeframe: "2-3 minutes"
    },
    {
      number: 2,
      title: "AI Creates Your Custom Plan",
      subtitle: "28 Advanced Strategies Personalized for You",
      description: "Our machine learning engine analyzes your unique situation and selects the most effective strategies from our arsenal of 28 advanced credit repair tactics.",
      details: [
        "Method of Verification (MOV) for stubborn items",
        "Estoppel by Silence for non-responsive bureaus", 
        "FCRA violation detection and challenges",
        "Debt validation and procedural disputes",
        "Strategic timing for maximum impact"
      ],
      icon: CpuChipIcon,
      color: "purple",
      timeframe: "5-10 minutes"
    },
    {
      number: 3,
      title: "Automated Execution",
      subtitle: "Professional Letters & Legal Compliance",
      description: "We automatically generate and send professionally crafted dispute letters, track responses, and execute follow-up strategies - all while maintaining strict legal compliance.",
      details: [
        "FCRA, CROA, and FDCPA compliant letters",
        "Certified mail tracking and delivery confirmation",
        "30-day response monitoring with automatic escalation",
        "Legal citation integration for maximum impact",
        "Multi-round strategy execution"
      ],
      icon: BoltIcon,
      color: "green",
      timeframe: "Ongoing"
    },
    {
      number: 4,
      title: "Real-Time Monitoring & Results",
      subtitle: "Watch Your Score Improve",
      description: "Track your progress with real-time credit monitoring, instant alerts, and detailed analytics showing exactly how each strategy impacts your score.",
      details: [
        "24/7 credit monitoring across all bureaus",
        "Instant alerts for score changes and new items",
        "Detailed progress reports and analytics",
        "Success rate tracking by strategy type",
        "Projected timeline for your credit goals"
      ],
      icon: ChartBarIcon,
      color: "indigo",
      timeframe: "24/7"
    }
  ];

  const strategies = [
    {
      name: "Method of Verification (MOV)",
      description: "Challenges bureaus to prove they followed proper verification procedures",
      successRate: "85%",
      difficulty: "Advanced",
      legalBasis: "FCRA Section 611(a)(7)"
    },
    {
      name: "Estoppel by Silence",
      description: "Leverages bureau non-response as legal admission of error",
      successRate: "70%", 
      difficulty: "Expert",
      legalBasis: "FCRA Section 611(a)(5)(A)"
    },
    {
      name: "Procedural Dispute Challenges",
      description: "Identifies and challenges FCRA procedural violations",
      successRate: "60%",
      difficulty: "Expert", 
      legalBasis: "FCRA Sections 611-616"
    },
    {
      name: "Debt Validation Letters",
      description: "Forces creditors to prove debt ownership and accuracy",
      successRate: "75%",
      difficulty: "Intermediate",
      legalBasis: "FDCPA Section 809(b)"
    },
    {
      name: "Cross-Bureau Discrepancy Analysis",
      description: "Identifies inconsistencies between bureau reports",
      successRate: "65%",
      difficulty: "Advanced",
      legalBasis: "FCRA Section 623"
    },
    {
      name: "Student Loan Strategies",
      description: "Specialized tactics for student loan reporting issues",
      successRate: "65%",
      difficulty: "Advanced", 
      legalBasis: "Corey Gray Method"
    }
  ];

  const timeline = [
    {
      phase: "Days 1-7",
      title: "Initial Analysis & Setup",
      activities: [
        "AI analyzes your credit reports",
        "Custom strategy plan created",
        "First round of disputes sent",
        "Monitoring systems activated"
      ]
    },
    {
      phase: "Days 8-30", 
      title: "First Response Cycle",
      activities: [
        "Bureau responses tracked",
        "Initial results appear",
        "Follow-up strategies deployed",
        "Score improvements begin"
      ]
    },
    {
      phase: "Days 31-60",
      title: "Optimization Phase", 
      activities: [
        "Advanced strategies activated",
        "MOV and Estoppel tactics deployed",
        "Significant score improvements",
        "New opportunities identified"
      ]
    },
    {
      phase: "Days 61-90",
      title: "Final Push & Maintenance",
      activities: [
        "Stubborn items targeted",
        "Legal escalation if needed",
        "Score optimization completed",
        "Ongoing monitoring established"
      ]
    }
  ];

  const faqs = [
    {
      question: "How is this different from other credit repair companies?",
      answer: "Traditional companies use basic dispute letters and manual processes. We use AI to analyze your reports with 87% accuracy and deploy 28 advanced strategies including Method of Verification, Estoppel by Silence, and FCRA violation challenges that most companies don't even know exist."
    },
    {
      question: "Is this legal and compliant?",
      answer: "Absolutely. All our strategies are based on established consumer protection laws (FCRA, CROA, FDCPA). We maintain strict legal compliance and our methods are used by top credit attorneys. Every letter includes proper legal citations and follows federal guidelines."
    },
    {
      question: "How fast will I see results?",
      answer: "Most clients see initial improvements within 30 days, with significant score increases by 60-90 days. Our AI identifies quick wins first, then deploys longer-term strategies. The average score improvement is 55-115 points over 6 months."
    },
    {
      question: "What if it doesn't work for me?",
      answer: "We offer a 90-day money-back guarantee. If you don't see meaningful improvement in your credit score within 90 days, we'll refund your entire investment. We're confident in our AI-powered approach because it works."
    },
    {
      question: "Do I need to do anything after signing up?",
      answer: "Very little. After uploading your reports, our AI handles everything automatically. You'll receive progress updates and can monitor your improvement in real-time through our dashboard. The system works while you sleep."
    }
  ];

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-900 to-purple-900 text-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              How CreditMaster Pro 
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent"> Transforms Your Credit</span>
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto mb-8">
              Our AI-powered platform combines cutting-edge technology with proven legal strategies to deliver results faster than traditional credit repair methods.
            </p>
            <div className="flex items-center justify-center space-x-8 text-sm">
              <div className="flex items-center">
                <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2" />
                <span>87% AI Accuracy</span>
              </div>
              <div className="flex items-center">
                <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2" />
                <span>28 Advanced Strategies</span>
              </div>
              <div className="flex items-center">
                <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2" />
                <span>FCRA Compliant</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Step Process */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              4 Simple Steps to Credit Freedom
            </h2>
            <p className="text-xl text-gray-600">
              Our proven process has helped thousands achieve their credit goals
            </p>
          </div>

          {/* Step Navigation */}
          <div className="flex justify-center mb-12">
            <div className="flex space-x-4 bg-gray-100 rounded-lg p-2">
              {steps.map((step, index) => (
                <button
                  key={index}
                  onClick={() => setActiveStep(index)}
                  className={`px-6 py-3 rounded-md font-medium transition-all ${
                    activeStep === index
                      ? 'bg-white text-blue-600 shadow-md'
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  Step {step.number}
                </button>
              ))}
            </div>
          </div>

          {/* Active Step Content */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center mb-6">
                <div className={`w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mr-4`}>
                  {React.createElement(steps[activeStep].icon, { className: "w-8 h-8 text-white" })}
                </div>
                <div>
                  <div className="text-sm text-gray-500 font-medium">STEP {steps[activeStep].number}</div>
                  <h3 className="text-2xl font-bold text-gray-900">{steps[activeStep].title}</h3>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <div className="flex items-center text-blue-800">
                  <ClockIcon className="w-5 h-5 mr-2" />
                  <span className="font-medium">Time Required: {steps[activeStep].timeframe}</span>
                </div>
              </div>

              <h4 className="text-lg font-semibold text-gray-900 mb-3">{steps[activeStep].subtitle}</h4>
              <p className="text-gray-600 mb-6 leading-relaxed">{steps[activeStep].description}</p>

              <div className="space-y-3">
                {steps[activeStep].details.map((detail, index) => (
                  <div key={index} className="flex items-start">
                    <CheckCircleIcon className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{detail}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-8">
              <div className="text-center">
                <div className={`w-24 h-24 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6`}>
                  {React.createElement(steps[activeStep].icon, { className: "w-12 h-12 text-white" })}
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-4">
                  {steps[activeStep].title}
                </h4>
                <p className="text-gray-600 mb-6">
                  {steps[activeStep].subtitle}
                </p>
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                  <PlayIcon className="w-4 h-4 mr-2" />
                  Watch Step {steps[activeStep].number} Demo
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Strategies Section */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Advanced Strategies That 
              <span className="text-blue-600">Actually Work</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              While other companies use basic dispute letters, we deploy sophisticated legal strategies 
              typically used by $500/hour credit attorneys.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {strategies.map((strategy, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    strategy.difficulty === 'Expert' ? 'bg-red-100 text-red-800' :
                    strategy.difficulty === 'Advanced' ? 'bg-orange-100 text-orange-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {strategy.difficulty}
                  </div>
                  <div className="text-2xl font-bold text-green-600">{strategy.successRate}</div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-3">{strategy.name}</h3>
                <p className="text-gray-600 mb-4">{strategy.description}</p>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Legal Basis:</div>
                  <div className="text-sm font-medium text-gray-900">{strategy.legalBasis}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <div className="bg-blue-100 rounded-xl p-8 inline-block">
              <h3 className="text-xl font-semibold text-blue-900 mb-3">
                Why These Strategies Work Better
              </h3>
              <p className="text-blue-800 max-w-2xl">
                Traditional credit repair uses generic dispute letters with 30-40% success rates. 
                Our advanced strategies target specific legal vulnerabilities with 60-85% success rates, 
                delivering results 2-3x faster than conventional methods.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Your 90-Day Credit Transformation Timeline
            </h2>
            <p className="text-xl text-gray-600">
              See exactly what happens each phase of your credit repair journey
            </p>
          </div>

          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-1/2 transform -translate-x-0.5 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>

            <div className="space-y-12">
              {timeline.map((phase, index) => (
                <div key={index} className={`flex items-center ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className={`w-1/2 ${index % 2 === 0 ? 'pr-8 text-right' : 'pl-8 text-left'}`}>
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                      <div className="text-sm font-semibold text-blue-600 mb-2">{phase.phase}</div>
                      <h3 className="text-xl font-bold text-gray-900 mb-4">{phase.title}</h3>
                      <ul className="space-y-2">
                        {phase.activities.map((activity, actIndex) => (
                          <li key={actIndex} className="flex items-center text-gray-600">
                            <CheckCircleIcon className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                            <span>{activity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Timeline Node */}
                  <div className="relative z-10">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">{index + 1}</span>
                    </div>
                  </div>

                  <div className="w-1/2"></div>
                </div>
              ))}
            </div>
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
              Get answers to the most common questions about our process
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

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-900 to-purple-900 text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Transform Your Credit?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands who've already experienced the power of AI-driven credit repair
          </p>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 mb-8">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-green-400 mb-2">87%</div>
                <div className="text-blue-200">AI Accuracy Rate</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-400 mb-2">90</div>
                <div className="text-blue-200">Day Guarantee</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-400 mb-2">24/7</div>
                <div className="text-blue-200">Monitoring</div>
              </div>
            </div>
          </div>

          <Button 
            size="lg" 
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-12 py-6 text-xl font-bold shadow-2xl transform hover:scale-105 transition-all duration-200"
          >
            Start Your Credit Transformation
            <ArrowRightIcon className="w-6 h-6 ml-3" />
          </Button>

          <p className="text-sm text-blue-200 mt-4">
            Special Launch Pricing: $29/month (Regular Price: $99/month)
          </p>
        </div>
      </section>
    </div>
  );
};

export default HowItWorksPage;

