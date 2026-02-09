'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Award,
  Star,
  Clock,
  Calendar,
  Video,
  Search,
  CheckCircle,
  Briefcase,
  Users,
  TrendingUp,
  Shield,
  Heart,
  MessageSquare,
  ThumbsUp,
  Zap,
} from 'lucide-react';

interface RatingBreakdown {
  knowledge: number;
  communication: number;
  helpfulness: number;
}

interface Expert {
  id: string;
  name: string;
  headline: string;
  avatarUrl?: string;
  certifications: string[];
  specialties: string[];
  yearsExperience: number;
  hourlyRate: number;
  rating: number;
  ratingBreakdown: RatingBreakdown;
  reviewCount: number;
  totalSessions: number;
  repeatClientRate: number;
  responseTime: string;
  offersFreeConsult: boolean;
  bio: string;
  topReview?: string;
}

const MOCK_EXPERTS: Expert[] = [
  {
    id: '1',
    name: 'Dr. Sarah Mitchell',
    headline: 'Certified Financial Planner | Retirement Specialist',
    certifications: ['CFP', 'ChFC'],
    specialties: ['Retirement Planning', 'Estate Planning', 'Tax Optimization'],
    yearsExperience: 15,
    hourlyRate: 200,
    rating: 4.9,
    ratingBreakdown: { knowledge: 4.9, communication: 4.8, helpfulness: 5.0 },
    reviewCount: 127,
    totalSessions: 342,
    repeatClientRate: 78,
    responseTime: '< 2 hours',
    offersFreeConsult: true,
    bio: 'Helping families build generational wealth through strategic financial planning.',
    topReview:
      'Sarah helped us create a clear retirement roadmap. We finally feel confident about our future!',
  },
  {
    id: '2',
    name: 'Marcus Johnson, CFA',
    headline: 'Investment Analyst | Portfolio Management',
    certifications: ['CFA', 'CFP'],
    specialties: [
      'Investment Strategy',
      'Portfolio Management',
      'Risk Assessment',
    ],
    yearsExperience: 12,
    hourlyRate: 175,
    rating: 4.8,
    ratingBreakdown: { knowledge: 5.0, communication: 4.6, helpfulness: 4.8 },
    reviewCount: 89,
    totalSessions: 256,
    repeatClientRate: 65,
    responseTime: '< 4 hours',
    offersFreeConsult: true,
    bio: 'Data-driven investment strategies for long-term wealth building.',
    topReview:
      'Marcus explained complex investment concepts in simple terms I could understand.',
  },
  {
    id: '3',
    name: 'Jennifer Williams',
    headline: 'Debt Management Expert | Credit Counselor',
    certifications: ['AFC', 'FFC'],
    specialties: ['Debt Management', 'Credit Building', 'Budgeting'],
    yearsExperience: 8,
    hourlyRate: 125,
    rating: 4.9,
    ratingBreakdown: { knowledge: 4.8, communication: 5.0, helpfulness: 5.0 },
    reviewCount: 203,
    totalSessions: 512,
    repeatClientRate: 82,
    responseTime: '< 1 hour',
    offersFreeConsult: true,
    bio: 'Passionate about helping people achieve debt freedom and financial peace.',
    topReview:
      'Jennifer gave me hope when I thought there was none. Paid off $30k in 18 months!',
  },
  {
    id: '4',
    name: 'Robert Chen, CPA',
    headline: 'Tax Strategist | Small Business Finance',
    certifications: ['CPA', 'CFP'],
    specialties: [
      'Tax Optimization',
      'Small Business Finance',
      'Estate Planning',
    ],
    yearsExperience: 20,
    hourlyRate: 225,
    rating: 4.7,
    ratingBreakdown: { knowledge: 5.0, communication: 4.5, helpfulness: 4.6 },
    reviewCount: 156,
    totalSessions: 428,
    repeatClientRate: 71,
    responseTime: '< 6 hours',
    offersFreeConsult: false,
    bio: 'Minimizing tax burden while maximizing wealth for entrepreneurs and professionals.',
    topReview:
      'Robert saved my business $45k in taxes last year. Worth every penny!',
  },
];

const SPECIALTIES = [
  'Retirement Planning',
  'Investment Strategy',
  'Debt Management',
  'Tax Optimization',
  'Credit Building',
  'Estate Planning',
  'Small Business',
  'Budgeting',
];

// Visual star rating component
function StarRating({
  rating,
  size = 'sm',
}: {
  rating: number;
  size?: 'sm' | 'md';
}) {
  const fullStars = Math.floor(rating);
  const partialStar = rating - fullStars;
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="relative">
          <Star className={`${iconSize} text-gray-200`} />
          {i < fullStars && (
            <Star
              className={`${iconSize} text-amber-400 fill-amber-400 absolute top-0 left-0`}
            />
          )}
          {i === fullStars && partialStar > 0 && (
            <div
              className="absolute top-0 left-0 overflow-hidden"
              style={{ width: `${partialStar * 100}%` }}
            >
              <Star className={`${iconSize} text-amber-400 fill-amber-400`} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Visual rating bar for breakdown
function RatingBar({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
}) {
  const percentage = (value / 5) * 100;

  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-gray-400 dark:text-slate-500 shrink-0" />
      <span className="text-xs text-gray-600 dark:text-slate-400 w-24 shrink-0">
        {label}
      </span>
      <div className="flex-1 h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
        />
      </div>
      <span className="text-xs font-medium text-gray-900 dark:text-white w-8">
        {value.toFixed(1)}
      </span>
    </div>
  );
}

// Experience level visual indicator
function ExperienceLevel({ years }: { years: number }) {
  const level = years >= 15 ? 'Expert' : years >= 8 ? 'Senior' : 'Professional';
  const color =
    years >= 15
      ? 'from-blue-500 to-blue-500'
      : years >= 8
        ? 'from-blue-500 to-blue-500'
        : 'from-green-500 to-emerald-500';
  const filled = Math.min(Math.ceil(years / 5), 4);

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={`w-2 h-6 rounded-sm ${i < filled ? `bg-gradient-to-t ${color}` : 'bg-gray-200 dark:bg-slate-700'}`}
          />
        ))}
      </div>
      <div>
        <span className="text-xs font-medium text-gray-900 dark:text-white">
          {level}
        </span>
        <span className="text-xs text-gray-500 dark:text-slate-400 ml-1">({years} yrs)</span>
      </div>
    </div>
  );
}

// Trust indicators visual
function TrustBadges({
  repeatRate,
  responseTime,
  sessions,
}: {
  repeatRate: number;
  responseTime: string;
  sessions: number;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {repeatRate >= 70 && (
        <div className="flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded-full">
          <Heart className="w-3 h-3 text-green-600" />
          <span className="text-xs font-medium text-green-700 dark:text-green-400">
            {repeatRate}% return
          </span>
        </div>
      )}
      {responseTime.includes('1') || responseTime.includes('2') ? (
        <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-full">
          <Zap className="w-3 h-3 text-blue-600" />
          <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
            Quick responder
          </span>
        </div>
      ) : null}
      {sessions >= 300 && (
        <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-full">
          <Award className="w-3 h-3 text-blue-600" />
          <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
            Top rated
          </span>
        </div>
      )}
    </div>
  );
}

export default function ExpertsPage() {
  const [experts] = useState<Expert[]>(MOCK_EXPERTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(
    null
  );
  const [expandedExpert, setExpandedExpert] = useState<string | null>(null);

  const filteredExperts = experts.filter((expert) => {
    const matchesSearch =
      !searchQuery ||
      expert.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expert.specialties.some((s) =>
        s.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesSpecialty =
      !selectedSpecialty || expert.specialties.includes(selectedSpecialty);
    return matchesSearch && matchesSpecialty;
  });

  const totalExperts = experts.length;
  const avgRating = (
    experts.reduce((sum, e) => sum + e.rating, 0) / experts.length
  ).toFixed(1);
  const totalSessions = experts.reduce((sum, e) => sum + e.totalSessions, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400 text-sm font-medium mb-4">
            <Shield className="w-4 h-4" />
            All Experts Verified & Credentialed
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Connect with Financial Experts
          </h1>
          <p className="text-gray-600 dark:text-slate-400 max-w-2xl mx-auto">
            Book one-on-one sessions with certified financial planners,
            analysts, and counselors.
          </p>
        </div>

        {/* Visual Stats Banner */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-4 text-center shadow-sm"
          >
            <div className="flex justify-center mb-2">
              <Users className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {totalExperts}
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400">Verified Experts</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-4 text-center shadow-sm"
          >
            <div className="flex justify-center mb-2">
              <Star className="w-8 h-8 text-amber-500 fill-amber-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {avgRating}
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400">Average Rating</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-4 text-center shadow-sm"
          >
            <div className="flex justify-center mb-2">
              <Video className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {totalSessions.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400">Sessions Completed</p>
          </motion.div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search by name or specialty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
              <button
                onClick={() => setSelectedSpecialty(null)}
                className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${!selectedSpecialty ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600'}`}
              >
                All
              </button>
              {SPECIALTIES.slice(0, 4).map((specialty) => (
                <button
                  key={specialty}
                  onClick={() =>
                    setSelectedSpecialty(
                      selectedSpecialty === specialty ? null : specialty
                    )
                  }
                  className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedSpecialty === specialty ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600'}`}
                >
                  {specialty}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Expert Cards with Rich Visualizations */}
        <div className="space-y-4 mb-8">
          {filteredExperts.map((expert, index) => {
            const isExpanded = expandedExpert === expert.id;

            return (
              <motion.div
                key={expert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex gap-4">
                    {/* Avatar with rating badge */}
                    <div className="relative shrink-0">
                      <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                        {expert.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </div>
                      <div className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-800 rounded-full px-2 py-0.5 shadow-md flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          {expert.rating}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Name and Certifications */}
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                            {expert.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-slate-400">
                            {expert.headline}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {expert.certifications.map((cert) => (
                            <span
                              key={cert}
                              className="px-2 py-1 text-xs font-bold bg-gradient-to-r from-blue-500 to-blue-500 text-white rounded"
                            >
                              {cert}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Visual indicators row */}
                      <div className="flex items-center gap-6 mt-3 mb-3">
                        <ExperienceLevel years={expert.yearsExperience} />
                        <div className="flex items-center gap-2">
                          <StarRating rating={expert.rating} />
                          <span className="text-sm text-gray-500 dark:text-slate-400">
                            ({expert.reviewCount} reviews)
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-slate-400">
                          <Video className="w-4 h-4" />
                          <span>{expert.totalSessions} sessions</span>
                        </div>
                      </div>

                      {/* Trust badges */}
                      <TrustBadges
                        repeatRate={expert.repeatClientRate}
                        responseTime={expert.responseTime}
                        sessions={expert.totalSessions}
                      />

                      {/* Specialties */}
                      <div className="flex flex-wrap gap-1 mt-3">
                        {expert.specialties.map((specialty) => (
                          <span
                            key={specialty}
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded"
                          >
                            {specialty}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Price and CTA */}
                    <div className="shrink-0 text-right">
                      <div className="mb-2">
                        <span className="text-3xl font-bold text-gray-900 dark:text-white">
                          ${expert.hourlyRate}
                        </span>
                        <span className="text-gray-500 dark:text-slate-400 text-sm">/hr</span>
                      </div>
                      {expert.offersFreeConsult && (
                        <div className="mb-3 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded text-center">
                          <span className="text-xs font-medium text-green-700 dark:text-green-400">
                            Free 15-min consult
                          </span>
                        </div>
                      )}
                      <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                        Book Session
                      </button>
                      <button
                        onClick={() =>
                          setExpandedExpert(isExpanded ? null : expert.id)
                        }
                        className="w-full mt-2 px-4 py-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {isExpanded ? 'Less info' : 'More details'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="border-t border-gray-100 dark:border-slate-700 p-6 bg-gray-50 dark:bg-slate-800/50"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Rating breakdown */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <Star className="w-4 h-4 text-amber-500" />
                          Rating Breakdown
                        </h4>
                        <RatingBar
                          label="Knowledge"
                          value={expert.ratingBreakdown.knowledge}
                          icon={Briefcase}
                        />
                        <RatingBar
                          label="Communication"
                          value={expert.ratingBreakdown.communication}
                          icon={MessageSquare}
                        />
                        <RatingBar
                          label="Helpfulness"
                          value={expert.ratingBreakdown.helpfulness}
                          icon={ThumbsUp}
                        />
                      </div>

                      {/* About */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                          About
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-slate-400">
                          {expert.bio}
                        </p>
                        <div className="mt-3 flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1 text-gray-500 dark:text-slate-400">
                            <Clock className="w-4 h-4" />
                            <span>Responds {expert.responseTime}</span>
                          </div>
                        </div>
                      </div>

                      {/* Top review */}
                      {expert.topReview && (
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <ThumbsUp className="w-4 h-4 text-green-500" />
                            Top Review
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-slate-400 italic">
                            &ldquo;{expert.topReview}&rdquo;
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Become an Expert CTA */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-8 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                Are you a Financial Professional?
              </h2>
              <p className="text-blue-100 max-w-xl">
                Join our platform to connect with clients seeking financial
                guidance.
              </p>
              <div className="flex items-center gap-4 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>CFP, CFA, CPA accepted</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Set your own rates</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Flexible scheduling</span>
                </div>
              </div>
            </div>
            <button className="px-6 py-3 bg-white dark:bg-slate-800 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors shrink-0">
              Apply Now
            </button>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Disclaimer:</strong> Sessions with financial experts are for
            educational purposes. Experts may provide general guidance but not
            personalized investment advice unless properly licensed. Always
            verify credentials and consult with a qualified professional before
            making financial decisions.
          </p>
        </div>
      </div>
    </div>
  );
}
