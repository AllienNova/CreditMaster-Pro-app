/**
 * Marketplace Landing Page
 * 
 * Hub showing all marketplace categories with cards, featured products,
 * and quick access to popular services.
 */

import Link from 'next/link';

export const metadata = {
  title: 'Marketplace | CreditMaster Pro',
  description: 'Discover trusted products and services for credit building',
};

const categories = [
  {
    name: 'Credit Monitoring',
    description: 'Real-time tracking across all 3 bureaus',
    href: '/marketplace/monitoring',
    icon: '📊',
    color: 'from-blue-500 to-cyan-500',
    featured: true,
  },
  {
    name: 'Tradelines',
    description: 'Authorized user tradelines to boost your score',
    href: '/marketplace/tradelines',
    icon: '📈',
    color: 'from-green-500 to-emerald-500',
    featured: true,
  },
  {
    name: 'Credit Repair Services',
    description: 'Vetted credit repair companies',
    href: '/marketplace/services',
    icon: '🔧',
    color: 'from-purple-500 to-indigo-500',
    featured: true,
  },
  {
    name: 'Education Library',
    description: 'Courses and guides for financial literacy',
    href: '/marketplace/education',
    icon: '📚',
    color: 'from-orange-500 to-amber-500',
  },
  {
    name: 'Credit Calculators',
    description: 'Financial planning tools',
    href: '/marketplace/calculators',
    icon: '🧮',
    color: 'from-pink-500 to-rose-500',
  },
  {
    name: 'Report Analysis',
    description: 'AI-powered credit report parsing',
    href: '/marketplace/analysis',
    icon: '🔍',
    color: 'from-teal-500 to-cyan-500',
  },
  {
    name: 'Secured Cards',
    description: 'Best secured credit cards comparison',
    href: '/marketplace/secured-cards',
    icon: '💳',
    color: 'from-indigo-500 to-blue-500',
  },
  {
    name: 'Builder Loans',
    description: 'Credit builder loan marketplace',
    href: '/marketplace/loans',
    icon: '💰',
    color: 'from-yellow-500 to-orange-500',
  },
  {
    name: 'Debt Consolidation',
    description: 'Consolidate and save on interest',
    href: '/marketplace/consolidation',
    icon: '📋',
    color: 'from-red-500 to-pink-500',
  },
  {
    name: 'Credit Attorneys',
    description: 'Legal help for complex cases',
    href: '/marketplace/attorneys',
    icon: '⚖️',
    color: 'from-slate-500 to-gray-500',
  },
  {
    name: 'Financial Coaching',
    description: '1-on-1 expert guidance',
    href: '/marketplace/coaching',
    icon: '🎯',
    color: 'from-violet-500 to-purple-500',
  },
  {
    name: 'Community',
    description: 'Success stories and forums',
    href: '/marketplace/community',
    icon: '👥',
    color: 'from-emerald-500 to-green-500',
  },
];

export default function MarketplacePage() {
  const featuredCategories = categories.filter((c) => c.featured);
  const otherCategories = categories.filter((c) => !c.featured);

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Credit Building Marketplace</h1>
        <p className="text-indigo-100 max-w-2xl">
          Discover trusted products, services, and tools to help you build and repair your credit.
          All providers are vetted for quality and reliability.
        </p>
      </div>

      {/* Featured Categories */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Featured</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredCategories.map((category) => (
            <Link
              key={category.href}
              href={category.href}
              className="group relative overflow-hidden rounded-xl bg-white shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
              <div className="p-6">
                <span className="text-4xl mb-4 block">{category.icon}</span>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{category.name}</h3>
                <p className="text-sm text-gray-600">{category.description}</p>
              </div>
              <div className={`h-1 bg-gradient-to-r ${category.color}`} />
            </Link>
          ))}
        </div>
      </section>

      {/* All Categories */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">All Categories</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {otherCategories.map((category) => (
            <Link
              key={category.href}
              href={category.href}
              className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <span className="text-2xl">{category.icon}</span>
              <div>
                <h3 className="font-medium text-gray-900">{category.name}</h3>
                <p className="text-sm text-gray-500">{category.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

