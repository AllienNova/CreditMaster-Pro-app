import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  ChartBarIcon,
  CpuChipIcon,
  ShieldCheckIcon,
  BoltIcon,
  UserGroupIcon,
  AcademicCapIcon,
  TrophyIcon,
  HeartIcon
} from '@heroicons/react/24/outline';

const AboutPage = () => {
  const stats = [
    {
      number: "87%",
      label: "AI Accuracy Rate",
      description: "Our machine learning models achieve industry-leading accuracy"
    },
    {
      number: "28",
      label: "Advanced Strategies",
      description: "Comprehensive arsenal of credit repair tactics"
    },
    {
      number: "66.4%",
      label: "Average Success Rate",
      description: "Across all strategies and credit situations"
    },
    {
      number: "90",
      label: "Day Guarantee",
      description: "Money-back guarantee on all paid plans"
    }
  ];

  const team = [
    {
      name: "Dr. Sarah Chen",
      role: "Chief Technology Officer",
      background: "Former Google AI researcher with 15+ years in machine learning",
      expertise: "Credit scoring algorithms, predictive analytics",
      image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face"
    },
    {
      name: "Michael Rodriguez",
      role: "Head of Legal Compliance",
      background: "Former CFPB attorney specializing in consumer credit law",
      expertise: "FCRA, CROA, FDCPA compliance and regulation",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face"
    },
    {
      name: "Jennifer Kim",
      role: "VP of Product Strategy",
      background: "15+ years in fintech, former Experian product manager",
      expertise: "Credit reporting, consumer financial products",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face"
    }
  ];

  const values = [
    {
      icon: ShieldCheckIcon,
      title: "Transparency First",
      description: "We believe in complete transparency about our methods, success rates, and limitations. No hidden fees or false promises."
    },
    {
      icon: CpuChipIcon,
      title: "AI-Powered Innovation",
      description: "We leverage cutting-edge artificial intelligence to provide insights and strategies that human reviewers often miss."
    },
    {
      icon: AcademicCapIcon,
      title: "Education & Empowerment",
      description: "We don't just fix your credit - we teach you how to maintain and improve it for life."
    },
    {
      icon: HeartIcon,
      title: "Customer Success",
      description: "Your financial freedom is our mission. We measure success by the positive impact on your life."
    }
  ];

  const timeline = [
    {
      year: "2023",
      title: "Company Founded",
      description: "Started with a mission to democratize access to professional-grade credit repair using AI technology."
    },
    {
      year: "2024",
      title: "AI Engine Development",
      description: "Developed our proprietary machine learning engine with 87% accuracy in credit analysis and strategy selection."
    },
    {
      year: "2024",
      title: "Legal Framework",
      description: "Established comprehensive legal compliance framework ensuring all strategies meet FCRA, CROA, and FDCPA requirements."
    },
    {
      year: "2024",
      title: "Platform Launch",
      description: "Launched CreditMaster Pro with 28 advanced strategies and real-time AI-powered credit monitoring."
    }
  ];

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-900 to-purple-900 text-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              Revolutionizing Credit Repair with 
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent"> Artificial Intelligence</span>
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto mb-8">
              We're on a mission to democratize access to professional-grade credit repair by combining 
              cutting-edge AI technology with proven legal strategies.
            </p>
            <div className="flex items-center justify-center space-x-8 text-sm">
              <div className="flex items-center">
                <TrophyIcon className="w-5 h-5 text-yellow-400 mr-2" />
                <span>Industry Leading AI</span>
              </div>
              <div className="flex items-center">
                <ShieldCheckIcon className="w-5 h-5 text-green-400 mr-2" />
                <span>Fully Compliant</span>
              </div>
              <div className="flex items-center">
                <UserGroupIcon className="w-5 h-5 text-blue-400 mr-2" />
                <span>Customer Focused</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Powered by Data, Driven by Results
            </h2>
            <p className="text-xl text-gray-600">
              Our platform combines advanced technology with proven methodologies
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                  <div className="text-4xl font-bold text-blue-600 mb-2">{stat.number}</div>
                  <div className="text-lg font-semibold text-gray-900 mb-2">{stat.label}</div>
                  <div className="text-sm text-gray-600">{stat.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Our Mission: Your Financial Freedom
              </h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                Traditional credit repair companies charge thousands of dollars for basic dispute letters 
                with 30-40% success rates. We believe everyone deserves access to the same advanced 
                strategies used by $500/hour credit attorneys.
              </p>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Our AI-powered platform democratizes these sophisticated techniques, making professional-grade 
                credit repair accessible and affordable for everyone. We don't just fix your credit - 
                we empower you with knowledge and tools for lifelong financial success.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <BoltIcon className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-gray-900">Advanced AI Technology</div>
                    <div className="text-gray-600">87% accuracy in credit analysis and strategy selection</div>
                  </div>
                </div>
                <div className="flex items-start">
                  <ShieldCheckIcon className="w-6 h-6 text-green-600 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-gray-900">Legal Compliance</div>
                    <div className="text-gray-600">All strategies comply with FCRA, CROA, and FDCPA</div>
                  </div>
                </div>
                <div className="flex items-start">
                  <AcademicCapIcon className="w-6 h-6 text-purple-600 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-gray-900">Education First</div>
                    <div className="text-gray-600">Learn while you improve your credit score</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">The Problem We Solve</h3>
              
              <div className="space-y-6">
                <div className="bg-white rounded-lg p-4 border-l-4 border-red-500">
                  <div className="font-semibold text-gray-900 mb-2">Traditional Credit Repair</div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Charges $500-2000+ upfront</li>
                    <li>• Uses basic dispute letters</li>
                    <li>• 30-40% success rate</li>
                    <li>• Takes 6-12 months</li>
                    <li>• No transparency</li>
                  </ul>
                </div>

                <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
                  <div className="font-semibold text-gray-900 mb-2">CreditMaster Pro</div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Starts at $29/month</li>
                    <li>• 28 advanced AI strategies</li>
                    <li>• 66.4% average success rate</li>
                    <li>• Results in 30-90 days</li>
                    <li>• Complete transparency</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Our Core Values
            </h2>
            <p className="text-xl text-gray-600">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg p-6 text-center border border-gray-100">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{value.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Meet Our Expert Team
            </h2>
            <p className="text-xl text-gray-600">
              Industry veterans combining technology, legal expertise, and consumer advocacy
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <div key={index} className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 text-center border border-gray-100">
                <img 
                  src={member.image} 
                  alt={member.name}
                  className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
                />
                <h3 className="text-xl font-bold text-gray-900 mb-2">{member.name}</h3>
                <div className="text-blue-600 font-medium mb-3">{member.role}</div>
                <p className="text-gray-600 text-sm mb-3 leading-relaxed">{member.background}</p>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Expertise:</div>
                  <div className="text-sm font-medium text-gray-900">{member.expertise}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Our Journey
            </h2>
            <p className="text-xl text-gray-600">
              From concept to industry-leading AI platform
            </p>
          </div>

          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-1/2 transform -translate-x-0.5 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>

            <div className="space-y-12">
              {timeline.map((item, index) => (
                <div key={index} className={`flex items-center ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className={`w-1/2 ${index % 2 === 0 ? 'pr-8 text-right' : 'pl-8 text-left'}`}>
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                      <div className="text-2xl font-bold text-blue-600 mb-2">{item.year}</div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                      <p className="text-gray-600 leading-relaxed">{item.description}</p>
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

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-900 to-purple-900 text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Experience the Future of Credit Repair?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join the revolution in AI-powered credit improvement
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
            Start Your Free Trial
          </Button>

          <p className="text-sm text-blue-200 mt-4">
            No credit card required • Cancel anytime
          </p>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;

