/**
 * Financial Coaching Directory
 * 
 * Find certified financial coaches with profiles, booking,
 * session packages, and specialization matching.
 */

'use client';

import { useState } from 'react';

interface Coach {
  id: string;
  name: string;
  title: string;
  certifications: string[];
  specialties: string[];
  rating: number;
  reviews: number;
  sessionPrice: number;
  packagePrice: number;
  availability: string;
  image: string;
}

const mockCoaches: Coach[] = [
  { id: '1', name: 'Dr. Amanda Foster', title: 'Certified Financial Planner', certifications: ['CFP', 'AFC'], specialties: ['Credit Building', 'Debt Management', 'Budgeting'], rating: 4.9, reviews: 234, sessionPrice: 150, packagePrice: 500, availability: 'Mon-Fri', image: '👩‍💼' },
  { id: '2', name: 'Marcus Williams', title: 'Credit Repair Specialist', certifications: ['FICO Pro', 'NACCC'], specialties: ['Credit Repair', 'Score Optimization', 'Dispute Strategy'], rating: 4.8, reviews: 189, sessionPrice: 100, packagePrice: 350, availability: 'Tue-Sat', image: '👨‍💼' },
  { id: '3', name: 'Lisa Park', title: 'Debt Freedom Coach', certifications: ['AFC', 'FFC'], specialties: ['Debt Snowball', 'Financial Wellness', 'Emergency Funds'], rating: 4.7, reviews: 156, sessionPrice: 125, packagePrice: 400, availability: 'Mon-Thu', image: '👩‍💼' },
  { id: '4', name: 'Robert Chen', title: 'Wealth Building Advisor', certifications: ['CFP', 'CFA'], specialties: ['Investment', 'Retirement', 'Tax Strategy'], rating: 4.6, reviews: 98, sessionPrice: 200, packagePrice: 700, availability: 'Wed-Sun', image: '👨‍💼' },
];

function CoachCard({ coach }: { coach: Coach }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex gap-4">
        <div className="text-5xl">{coach.image}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{coach.name}</h3>
          <p className="text-sm text-indigo-600">{coach.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-yellow-400">★</span>
            <span className="font-medium">{coach.rating}</span>
            <span className="text-gray-400">({coach.reviews} reviews)</span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-sm text-gray-500 mb-2">Certifications</p>
        <div className="flex flex-wrap gap-1">
          {coach.certifications.map((c) => (
            <span key={c} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded font-medium">{c}</span>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-sm text-gray-500 mb-2">Specialties</p>
        <div className="flex flex-wrap gap-1">
          {coach.specialties.map((s) => (
            <span key={s} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">{s}</span>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Single Session</p>
          <p className="font-semibold text-lg">${coach.sessionPrice}</p>
        </div>
        <div>
          <p className="text-gray-500">4-Session Package</p>
          <p className="font-semibold text-lg text-green-600">${coach.packagePrice}</p>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        📅 Available: {coach.availability}
      </div>

      <div className="mt-4 flex gap-2">
        <button className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
          Book Session
        </button>
        <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
          View Profile
        </button>
      </div>
    </div>
  );
}

export default function CoachingPage() {
  const [specialty, setSpecialty] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<string>('all');

  const specialties = ['all', 'Credit Building', 'Debt Management', 'Credit Repair', 'Investment'];
  const filteredCoaches = mockCoaches
    .filter(c => specialty === 'all' || c.specialties.some(s => s.includes(specialty)))
    .filter(c => priceRange === 'all' || (priceRange === 'under100' && c.sessionPrice < 100) || (priceRange === '100-150' && c.sessionPrice >= 100 && c.sessionPrice <= 150) || (priceRange === 'over150' && c.sessionPrice > 150));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financial Coaching</h1>
        <p className="text-gray-600">Work with certified coaches to improve your financial health</p>
      </div>

      {/* Benefits Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
        <h2 className="text-lg font-semibold mb-2">🎯 Why Work With a Coach?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-indigo-100">
          <div>✓ Personalized credit improvement plan</div>
          <div>✓ Accountability and motivation</div>
          <div>✓ Expert guidance on complex issues</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <select value={specialty} onChange={(e) => setSpecialty(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          {specialties.map((s) => <option key={s} value={s}>{s === 'all' ? 'All Specialties' : s}</option>)}
        </select>
        <select value={priceRange} onChange={(e) => setPriceRange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="all">Any Price</option>
          <option value="under100">Under $100</option>
          <option value="100-150">$100 - $150</option>
          <option value="over150">Over $150</option>
        </select>
      </div>

      {/* Coach Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredCoaches.map((coach) => <CoachCard key={coach.id} coach={coach} />)}
      </div>
    </div>
  );
}

