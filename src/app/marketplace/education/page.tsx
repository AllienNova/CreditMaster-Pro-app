/**
 * Financial Education Library
 * 
 * Courses, guides, and educational content with course catalog,
 * article reader, video player, and quizzes.
 */

'use client';

import { useState } from 'react';

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  lessons: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  progress: number;
  thumbnail: string;
}

interface Article {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  date: string;
}

const mockCourses: Course[] = [
  { id: '1', title: 'Credit Score Fundamentals', description: 'Learn how credit scores work and what factors affect them', category: 'Basics', duration: '2h 30m', lessons: 12, level: 'beginner', progress: 75, thumbnail: '📊' },
  { id: '2', title: 'Dispute Letter Mastery', description: 'Write effective dispute letters that get results', category: 'Disputes', duration: '3h 15m', lessons: 18, level: 'intermediate', progress: 30, thumbnail: '✉️' },
  { id: '3', title: 'Advanced Credit Strategies', description: 'Expert techniques for rapid credit improvement', category: 'Advanced', duration: '4h', lessons: 24, level: 'advanced', progress: 0, thumbnail: '🎯' },
  { id: '4', title: 'Debt Management 101', description: 'Strategies for paying off debt efficiently', category: 'Debt', duration: '2h', lessons: 10, level: 'beginner', progress: 100, thumbnail: '💰' },
  { id: '5', title: 'Identity Theft Protection', description: 'Protect yourself from fraud and identity theft', category: 'Security', duration: '1h 45m', lessons: 8, level: 'beginner', progress: 50, thumbnail: '🔒' },
];

const mockArticles: Article[] = [
  { id: '1', title: 'Understanding Your Credit Report', excerpt: 'A comprehensive guide to reading and interpreting your credit report...', category: 'Basics', readTime: '8 min', date: '2024-01-15' },
  { id: '2', title: '5 Myths About Credit Scores', excerpt: 'Common misconceptions that could be hurting your credit...', category: 'Tips', readTime: '5 min', date: '2024-01-12' },
  { id: '3', title: 'How to Negotiate with Creditors', excerpt: 'Effective strategies for settling debts and removing negative items...', category: 'Advanced', readTime: '12 min', date: '2024-01-10' },
];

function CourseCard({ course }: { course: Course }) {
  const levelColors = { beginner: 'bg-green-100 text-green-800', intermediate: 'bg-yellow-100 text-yellow-800', advanced: 'bg-red-100 text-red-800' };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-32 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
        <span className="text-5xl">{course.thumbnail}</span>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className={`px-2 py-0.5 text-xs rounded-full ${levelColors[course.level]}`}>{course.level}</span>
          <span className="text-xs text-gray-500">{course.category}</span>
        </div>
        <h3 className="font-semibold text-gray-900 mb-1">{course.title}</h3>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{course.description}</p>
        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
          <span>📚 {course.lessons} lessons</span>
          <span>⏱️ {course.duration}</span>
        </div>
        {course.progress > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">Progress</span>
              <span className="text-indigo-600">{course.progress}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div className="h-2 bg-indigo-600 rounded-full" style={{ width: `${course.progress}%` }} />
            </div>
          </div>
        )}
        <button className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
          {course.progress === 0 ? 'Start Course' : course.progress === 100 ? 'Review' : 'Continue'}
        </button>
      </div>
    </div>
  );
}

function ArticleCard({ article }: { article: Article }) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:border-indigo-300 transition-colors">
      <span className="text-xs text-indigo-600 font-medium">{article.category}</span>
      <h4 className="font-medium text-gray-900 mt-1 mb-2">{article.title}</h4>
      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{article.excerpt}</p>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{article.readTime} read</span>
        <span>{article.date}</span>
      </div>
    </div>
  );
}

export default function EducationPage() {
  const [activeTab, setActiveTab] = useState<'courses' | 'articles'>('courses');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const categories = ['all', ...Array.from(new Set(mockCourses.map(c => c.category)))];
  const filteredCourses = categoryFilter === 'all' ? mockCourses : mockCourses.filter(c => c.category === categoryFilter);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Education Library</h1>
        <p className="text-gray-600">Courses and guides for financial literacy</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button onClick={() => setActiveTab('courses')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 ${activeTab === 'courses' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}>
          📚 Courses
        </button>
        <button onClick={() => setActiveTab('articles')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 ${activeTab === 'articles' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}>
          📰 Articles
        </button>
      </div>

      {activeTab === 'courses' && (
        <>
          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setCategoryFilter(cat)}
                className={`px-4 py-2 rounded-lg text-sm ${categoryFilter === cat ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {cat === 'all' ? 'All Courses' : cat}
              </button>
            ))}
          </div>

          {/* Course Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => <CourseCard key={course.id} course={course} />)}
          </div>
        </>
      )}

      {activeTab === 'articles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockArticles.map((article) => <ArticleCard key={article.id} article={article} />)}
        </div>
      )}
    </div>
  );
}

