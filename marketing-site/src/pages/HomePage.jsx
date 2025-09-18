import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  ChartBarIcon,
  ShieldCheckIcon,
  BoltIcon,
  CheckCircleIcon,
  StarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

const HomePage = () => {
  const [timeLeft, setTimeLeft] = useState({
    hours: 23,
    minutes: 47,
    seconds: 32
  });

  // Countdown timer for urgency
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const painPoints = [
    "Denied for loans despite having income?",
    "Paying high interest rates on everything?", 
    "Embarrassed to check your credit score?",
    "Tired of credit repair companies that don't deliver?",
    "Frustrated with slow, manual dispute processes?"
  ];

  const features = [
    {
      icon: BoltIcon,
      title: "AI-Powered Analysis",
      description: "Our machine learning algorithms analyze your credit with 87% accuracy, identifying opportunities others miss.",
      benefit: "Get results 10x faster than traditional methods"
    },
    {
      icon: ShieldCheckIcon,
      title: "28 Advanced Strategies",
      description: "Professional-grade tactics including Method of Verification, Estoppel by Silence, and FCRA violations.",
      benefit: "Access strategies used by $500/hour credit attorneys"
    },
    {
      icon: ChartBarIcon,
      title: "Real-Time Monitoring",
      description: "Instant alerts when your score changes, new accounts appear, or disputes are resolved.",
      benefit: "Never miss an opportunity to improve your credit"
    }
  ];

  const testimonials = [
    {
      name: "Sarah M.",
      location: "Austin, TX",
      before: 547,
      after: 721,
      timeframe: "4 months",
      quote: "I was skeptical about AI credit repair, but CreditMaster Pro removed 12 negative items and increased my score by 174 points. I finally qualified for my dream home!",
      rating: 5
    },
    {
      name: "Marcus J.",
      location: "Denver, CO", 
      before: 623,
      after: 758,
      timeframe: "3 months",
      quote: "The Method of Verification strategy alone removed 3 collections that other companies couldn't touch. This actually works.",
      rating: 5
    },
    {
      name: "Jennifer L.",
      location: "Miami, FL",
      before: 592,
      after: 742,
      timeframe: "5 months",
      quote: "From car loan rejection to 2.9% APR approval. CreditMaster Pro literally saved me $18,000 in interest over 5 years.",
      rating: 5
    }
  ];

  const comparisonData = [
    { feature: "AI-Powered Analysis", us: true, others: false },
    { feature: "28 Advanced Strategies", us: true, others: false },
    { feature: "Real-Time Monitoring", us: true, others: false },
    { feature: "FCRA Violation Detection", us: true, others: false },
    { feature: "Method of Verification", us: true, others: false },
    { feature: "Estoppel by Silence", us: true, others: false },
    { feature: "Money-Back Guarantee", us: true, others: true },
    { feature: "Monthly Fee", us: "$29", others: "$99-199" }
  ];

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900 text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Main Message */}
            <div className="text-center lg:text-left">
              {/* Urgency Banner */}
              <div className="inline-flex items-center bg-red-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6 animate-pulse">
                <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
                Limited Time: Early Access Pricing Ends Soon
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                Transform Your Credit Score in 
                <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent"> 90 Days</span>
              </h1>

              <p className="text-xl lg:text-2xl text-blue-100 mb-8 leading-relaxed">
                Stop letting bad credit control your life. Our AI-powered platform uses 28 advanced strategies to remove negative items and boost your score faster than ever before.
              </p>

              {/* Pain Points */}
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold mb-4 text-yellow-300">Are You Tired Of...</h3>
                <ul className="space-y-2 text-blue-100">
                  {painPoints.map((point, index) => (
                    <li key={index} className="flex items-start">
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-4 text-lg font-semibold shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  Start Your Credit Transformation
                  <ArrowRightIcon className="w-5 h-5 ml-2" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="border-2 border-white text-white hover:bg-white hover:text-blue-900 px-8 py-4 text-lg font-semibold"
                >
                  <PlayIcon className="w-5 h-5 mr-2" />
                  Watch Demo (2 min)
                </Button>
              </div>

              {/* Social Proof */}
              <div className="flex items-center justify-center lg:justify-start space-x-6 text-sm text-blue-200">
                <div className="flex items-center">
                  <div className="flex -space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <StarSolid key={i} className="w-5 h-5 text-yellow-400" />
                    ))}
                  </div>
                  <span className="ml-2">4.8/5 Rating</span>
                </div>
                <div className="flex items-center">
                  <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2" />
                  <span>FCRA Compliant</span>
                </div>
              </div>
            </div>

            {/* Right Column - Countdown Timer & Stats */}
            <div className="text-center">
              {/* Countdown Timer */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-8">
                <h3 className="text-2xl font-bold mb-4 text-yellow-300">Early Access Pricing Ends In:</h3>
                <div className="flex justify-center space-x-4 mb-4">
                  <div className="bg-red-600 rounded-lg p-4 min-w-[80px]">
                    <div className="text-3xl font-bold">{timeLeft.hours.toString().padStart(2, '0')}</div>
                    <div className="text-sm text-red-200">Hours</div>
                  </div>
                  <div className="bg-red-600 rounded-lg p-4 min-w-[80px]">
                    <div className="text-3xl font-bold">{timeLeft.minutes.toString().padStart(2, '0')}</div>
                    <div className="text-sm text-red-200">Minutes</div>
                  </div>
                  <div className="bg-red-600 rounded-lg p-4 min-w-[80px]">
                    <div className="text-3xl font-bold">{timeLeft.seconds.toString().padStart(2, '0')}</div>
                    <div className="text-sm text-red-200">Seconds</div>
                  </div>
                </div>
                <p className="text-yellow-200 font-medium">Premium Launch Pricing - Professional AI Credit Repair!</p>
              </div>

              {/* Key Stats */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                  <div className="text-4xl font-bold text-green-400 mb-2">87%</div>
                  <div className="text-blue-200">AI Accuracy Rate</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                  <div className="text-4xl font-bold text-green-400 mb-2">28</div>
                  <div className="text-blue-200">Advanced Strategies</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                  <div className="text-4xl font-bold text-green-400 mb-2">90</div>
                  <div className="text-blue-200">Day Guarantee</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                  <div className="text-4xl font-bold text-green-400 mb-2">24/7</div>
                  <div className="text-blue-200">Monitoring</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Agitation Section */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              The Hidden Cost of Bad Credit is 
              <span className="text-red-600"> Destroying Your Financial Future</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Every day you wait, bad credit costs you money. Here's the brutal truth about what poor credit is really costing you...
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-red-500">
              <div className="text-3xl font-bold text-red-600 mb-4">$250,000+</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Lifetime Interest Penalty</h3>
              <p className="text-gray-600">
                Poor credit can cost you over $250,000 in extra interest on mortgages, car loans, and credit cards over your lifetime.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-red-500">
              <div className="text-3xl font-bold text-red-600 mb-4">$500+</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Monthly Opportunity Cost</h3>
              <p className="text-gray-600">
                Higher insurance premiums, security deposits, and loan payments can cost you $500+ more per month.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-red-500">
              <div className="text-3xl font-bold text-red-600 mb-4">Priceless</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Dreams Denied</h3>
              <p className="text-gray-600">
                How many opportunities have you missed? Dream homes, business loans, or simply the peace of mind that comes with good credit?
              </p>
            </div>
          </div>

          {/* Emotional Hook */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-8 border border-red-200">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                But Here's What Really Hurts...
              </h3>
              <p className="text-lg text-gray-700 mb-6 max-w-4xl mx-auto leading-relaxed">
                It's not just the money. It's the <strong>shame</strong> of being denied. The <strong>stress</strong> of high payments. 
                The <strong>frustration</strong> of watching others get opportunities you can't access. The <strong>fear</strong> that 
                it will never get better. You deserve financial freedom, and every day you wait is another day of unnecessary suffering.
              </p>
              <div className="bg-white rounded-lg p-6 inline-block shadow-md">
                <p className="text-xl font-semibold text-blue-900">
                  "The best time to fix your credit was 7 years ago. The second best time is right now."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Finally, A Credit Repair Solution That 
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Actually Works</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              CreditMaster Pro combines cutting-edge AI with proven legal strategies to deliver results faster than traditional credit repair companies.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            {features.map((feature, index) => (
              <div key={index} className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-8 border border-blue-100 hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mb-6">
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600 mb-4">{feature.description}</p>
                <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm font-medium">
                  ✓ {feature.benefit}
                </div>
              </div>
            ))}
          </div>

          {/* Comparison Table */}
          <div className="bg-gray-50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">
              Why CreditMaster Pro Beats Traditional Credit Repair
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-4 px-6 font-semibold text-gray-900">Feature</th>
                    <th className="text-center py-4 px-6 font-semibold text-blue-600">CreditMaster Pro</th>
                    <th className="text-center py-4 px-6 font-semibold text-gray-600">Traditional Companies</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((row, index) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="py-4 px-6 font-medium text-gray-900">{row.feature}</td>
                      <td className="py-4 px-6 text-center">
                        {typeof row.us === 'boolean' ? (
                          row.us ? (
                            <CheckCircleIcon className="w-6 h-6 text-green-600 mx-auto" />
                          ) : (
                            <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                              <div className="w-3 h-0.5 bg-red-500"></div>
                            </div>
                          )
                        ) : (
                          <span className="font-semibold text-blue-600">{row.us}</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {typeof row.others === 'boolean' ? (
                          row.others ? (
                            <CheckCircleIcon className="w-6 h-6 text-green-600 mx-auto" />
                          ) : (
                            <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                              <div className="w-3 h-0.5 bg-red-500"></div>
                            </div>
                          )
                        ) : (
                          <span className="font-semibold text-gray-600">{row.others}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Real People, Real Results, Real Fast
            </h2>
            <p className="text-xl text-gray-600">
              See how CreditMaster Pro has transformed lives and unlocked financial opportunities
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
                <div className="flex items-center mb-4">
                  <div className="flex">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <StarSolid key={i} className="w-5 h-5 text-yellow-400" />
                    ))}
                  </div>
                  <span className="ml-2 text-sm text-gray-600">({testimonial.rating}.0)</span>
                </div>
                
                <blockquote className="text-gray-700 mb-6 italic">
                  "{testimonial.quote}"
                </blockquote>
                
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <div className="font-semibold text-gray-900">{testimonial.name}</div>
                      <div className="text-sm text-gray-600">{testimonial.location}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Timeframe</div>
                      <div className="font-semibold text-blue-600">{testimonial.timeframe}</div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-red-100 to-green-100 rounded-lg p-4 mt-4">
                    <div className="flex justify-between items-center">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{testimonial.before}</div>
                        <div className="text-xs text-gray-600">BEFORE</div>
                      </div>
                      <ArrowRightIcon className="w-6 h-6 text-gray-400" />
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{testimonial.after}</div>
                        <div className="text-xs text-gray-600">AFTER</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-blue-600">+{testimonial.after - testimonial.before}</div>
                        <div className="text-xs text-gray-600">POINTS</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-900 to-purple-900 text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Your Credit Transformation Starts Today
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Don't let another day pass watching others get the opportunities you deserve. 
            Join thousands who've already transformed their financial future with CreditMaster Pro.
          </p>

          {/* Risk Reversal */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 mb-8">
            <h3 className="text-2xl font-semibold mb-4 text-yellow-300">
              100% Risk-Free Guarantee
            </h3>
            <p className="text-blue-100 mb-4">
              We're so confident CreditMaster Pro will improve your credit, we offer a 90-day money-back guarantee. 
              If you don't see significant improvement in your credit score within 90 days, we'll refund every penny.
            </p>
            <div className="flex items-center justify-center space-x-4 text-sm">
              <div className="flex items-center">
                <ShieldCheckIcon className="w-5 h-5 text-green-400 mr-2" />
                <span>No Risk</span>
              </div>
              <div className="flex items-center">
                <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2" />
                <span>No Contracts</span>
              </div>
              <div className="flex items-center">
                <ClockIcon className="w-5 h-5 text-green-400 mr-2" />
                <span>Cancel Anytime</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-12 py-6 text-xl font-bold shadow-2xl transform hover:scale-105 transition-all duration-200"
            >
              Start Your Credit Transformation Now
              <ArrowRightIcon className="w-6 h-6 ml-3" />
            </Button>
            
            <p className="text-sm text-blue-200">
              Professional Plans Starting at $99.99/month - Premium AI Technology
            </p>
            
            <div className="flex items-center justify-center space-x-6 text-sm text-blue-200 mt-6">
              <span>✓ Instant Access</span>
              <span>✓ No Setup Fees</span>
              <span>✓ Cancel Anytime</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;

