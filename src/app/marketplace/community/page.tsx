/**
 * Community Forum
 * 
 * Credit repair community with discussion forums, success stories,
 * Q&A, and member profiles.
 */

'use client';

import { useState } from 'react';

interface Post {
  id: string;
  title: string;
  author: string;
  category: string;
  content: string;
  likes: number;
  replies: number;
  date: string;
  pinned?: boolean;
}

interface SuccessStory {
  id: string;
  author: string;
  scoreBefore: number;
  scoreAfter: number;
  timeframe: string;
  summary: string;
  likes: number;
}

const mockPosts: Post[] = [
  { id: '1', title: '📌 Welcome! Read the community guidelines', author: 'Admin', category: 'Announcements', content: 'Welcome to the CPFI community...', likes: 245, replies: 12, date: '2024-01-01', pinned: true },
  { id: '2', title: 'How I removed 5 collections in 30 days', author: 'CreditWarrior', category: 'Success Stories', content: 'I want to share my journey...', likes: 189, replies: 47, date: '2024-01-15' },
  { id: '3', title: 'Best dispute letter template for late payments?', author: 'NewToCredit', category: 'Questions', content: 'Looking for advice on disputing...', likes: 34, replies: 23, date: '2024-01-18' },
  { id: '4', title: 'Goodwill letter success with Chase!', author: 'DebtFreeJourney', category: 'Success Stories', content: 'Just wanted to share that my goodwill letter worked...', likes: 156, replies: 38, date: '2024-01-17' },
  { id: '5', title: 'Understanding FCRA timelines', author: 'CreditExpert', category: 'Education', content: 'Many people ask about how long bureaus have to respond...', likes: 89, replies: 15, date: '2024-01-16' },
];

const mockStories: SuccessStory[] = [
  { id: '1', author: 'CreditWarrior', scoreBefore: 520, scoreAfter: 720, timeframe: '8 months', summary: 'Removed 5 collections, 2 charge-offs, and paid down utilization', likes: 234 },
  { id: '2', author: 'DebtFreeJourney', scoreBefore: 580, scoreAfter: 750, timeframe: '12 months', summary: 'Paid off $15k debt and disputed inaccurate late payments', likes: 189 },
  { id: '3', author: 'NewBeginnings', scoreBefore: 490, scoreAfter: 680, timeframe: '6 months', summary: 'Focused on secured cards and authorized user accounts', likes: 156 },
];

function PostCard({ post }: { post: Post }) {
  const categoryColors: Record<string, string> = {
    'Announcements': 'bg-red-100 text-red-700',
    'Success Stories': 'bg-green-100 text-green-700',
    'Questions': 'bg-blue-100 text-blue-700',
    'Education': 'bg-purple-100 text-purple-700',
  };

  return (
    <div className={`bg-white rounded-lg p-4 shadow-sm border ${post.pinned ? 'border-indigo-300' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <span className={`px-2 py-0.5 text-xs rounded-full ${categoryColors[post.category] || 'bg-gray-100 text-gray-700'}`}>
            {post.category}
          </span>
          <h3 className="font-medium text-gray-900 mt-2">{post.title}</h3>
          <p className="text-sm text-gray-500 mt-1">by {post.author} • {post.date}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
        <span>❤️ {post.likes}</span>
        <span>💬 {post.replies}</span>
      </div>
    </div>
  );
}

function StoryCard({ story }: { story: SuccessStory }) {
  const improvement = story.scoreAfter - story.scoreBefore;

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200">
      <div className="flex items-center justify-between mb-3">
        <span className="font-medium text-gray-900">{story.author}</span>
        <span className="text-green-600 font-bold">+{improvement} pts</span>
      </div>
      <div className="flex items-center gap-4 mb-3">
        <div className="text-center">
          <p className="text-2xl font-bold text-red-500">{story.scoreBefore}</p>
          <p className="text-xs text-gray-500">Before</p>
        </div>
        <span className="text-2xl">→</span>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{story.scoreAfter}</p>
          <p className="text-xs text-gray-500">After</p>
        </div>
        <div className="text-sm text-gray-500 ml-auto">
          ⏱️ {story.timeframe}
        </div>
      </div>
      <p className="text-sm text-gray-600">{story.summary}</p>
      <div className="mt-3 text-sm text-gray-500">❤️ {story.likes} found this inspiring</div>
    </div>
  );
}

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<'discussions' | 'stories'>('discussions');
  const [category, setCategory] = useState<string>('all');

  const categories = ['all', 'Announcements', 'Success Stories', 'Questions', 'Education'];
  const filteredPosts = category === 'all' ? mockPosts : mockPosts.filter(p => p.category === category);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Community</h1>
          <p className="text-gray-600">Connect with others on their credit journey</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
          + New Post
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button onClick={() => setActiveTab('discussions')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 ${activeTab === 'discussions' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}>
          💬 Discussions
        </button>
        <button onClick={() => setActiveTab('stories')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 ${activeTab === 'stories' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}>
          🏆 Success Stories
        </button>
      </div>

      {activeTab === 'discussions' && (
        <>
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm ${category === cat ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                {cat === 'all' ? 'All Topics' : cat}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {filteredPosts.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
        </>
      )}

      {activeTab === 'stories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockStories.map((story) => <StoryCard key={story.id} story={story} />)}
        </div>
      )}
    </div>
  );
}

