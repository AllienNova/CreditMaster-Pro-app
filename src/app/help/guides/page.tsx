'use client';

import { useState } from 'react';

const categories = [
  { id: 'all', label: 'All Guides' },
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'disputes', label: 'Disputes' },
  { id: 'credit-reports', label: 'Credit Reports' },
  { id: 'advanced', label: 'Advanced' },
];

const guides = [
  {
    id: 1,
    title: 'Getting Started with Fynvita',
    category: 'getting-started',
    readTime: '5 min',
    difficulty: 'Beginner',
    description:
      'Learn the basics of navigating the platform and setting up your account.',
  },
  {
    id: 2,
    title: 'How to Connect Your Credit Bureaus',
    category: 'getting-started',
    readTime: '3 min',
    difficulty: 'Beginner',
    description:
      'Step-by-step guide to connecting Experian, Equifax, and TransUnion.',
  },
  {
    id: 3,
    title: 'Understanding Your Credit Report',
    category: 'credit-reports',
    readTime: '8 min',
    difficulty: 'Beginner',
    description:
      'Learn how to read and interpret your credit report from each bureau.',
  },
  {
    id: 4,
    title: 'Filing Your First Dispute',
    category: 'disputes',
    readTime: '6 min',
    difficulty: 'Beginner',
    description:
      'A complete walkthrough of the dispute process from start to finish.',
  },
  {
    id: 5,
    title: 'Writing Effective Dispute Letters',
    category: 'disputes',
    readTime: '10 min',
    difficulty: 'Intermediate',
    description:
      'Tips and templates for writing dispute letters that get results.',
  },
  {
    id: 6,
    title: 'Goodwill Letter Strategies',
    category: 'disputes',
    readTime: '7 min',
    difficulty: 'Intermediate',
    description: 'How to request goodwill adjustments for late payments.',
  },
  {
    id: 7,
    title: 'Credit Score Factors Explained',
    category: 'credit-reports',
    readTime: '12 min',
    difficulty: 'Intermediate',
    description:
      'Deep dive into the five factors that affect your credit score.',
  },
  {
    id: 8,
    title: 'Advanced Dispute Techniques',
    category: 'advanced',
    readTime: '15 min',
    difficulty: 'Advanced',
    description: 'Expert strategies for challenging difficult negative items.',
  },
  {
    id: 9,
    title: 'Dealing with Collection Agencies',
    category: 'advanced',
    readTime: '10 min',
    difficulty: 'Advanced',
    description: 'How to negotiate with collectors and get items removed.',
  },
  {
    id: 10,
    title: 'Building Credit from Scratch',
    category: 'getting-started',
    readTime: '8 min',
    difficulty: 'Beginner',
    description: 'Strategies for establishing credit when you have none.',
  },
];

export default function GuidesPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGuides = guides.filter((guide) => {
    const matchesCategory =
      activeCategory === 'all' || guide.category === activeCategory;
    const matchesSearch =
      guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner':
        return 'bg-emerald-100 text-emerald-700';
      case 'Intermediate':
        return 'bg-yellow-100 text-yellow-700';
      case 'Advanced':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200';
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Guides & Tutorials</h1>
        <input
          type="text"
          placeholder="Search guides..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 w-full md:w-64"
        />
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeCategory === cat.id
                ? 'bg-emerald-500 text-white'
                : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700 hover:border-emerald-300'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Guides Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {filteredGuides.map((guide) => (
          <div
            key={guide.id}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 hover:border-emerald-300 hover:shadow-md transition cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(guide.difficulty)}`}
              >
                {guide.difficulty}
              </span>
              <span className="text-xs text-gray-400 dark:text-slate-500">
                {guide.readTime} read
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {guide.title}
            </h3>
            <p className="text-gray-500 dark:text-slate-400 text-sm mb-4">{guide.description}</p>
            <button className="text-emerald-500 text-sm font-medium hover:text-emerald-600">
              Read Guide →
            </button>
          </div>
        ))}
      </div>

      {filteredGuides.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-slate-400">No guides found matching your search.</p>
        </div>
      )}
    </div>
  );
}
