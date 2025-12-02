/**
 * Credit Attorneys Directory
 * 
 * Find credit repair attorneys with profiles, reviews,
 * consultation booking, and case type matching.
 */

'use client';

import { useState } from 'react';

interface Attorney {
  id: string;
  name: string;
  firm: string;
  location: string;
  specialties: string[];
  rating: number;
  reviews: number;
  yearsExperience: number;
  consultationFee: string;
  caseTypes: string[];
  image: string;
}

const mockAttorneys: Attorney[] = [
  { id: '1', name: 'Sarah Mitchell', firm: 'Mitchell Consumer Law', location: 'Los Angeles, CA', specialties: ['FCRA Violations', 'Identity Theft', 'Debt Collection'], rating: 4.9, reviews: 127, yearsExperience: 15, consultationFee: 'Free', caseTypes: ['Credit Report Errors', 'Harassment', 'FDCPA'], image: '👩‍⚖️' },
  { id: '2', name: 'James Rodriguez', firm: 'Consumer Rights Legal', location: 'Miami, FL', specialties: ['Credit Repair', 'Bankruptcy', 'Debt Settlement'], rating: 4.8, reviews: 89, yearsExperience: 12, consultationFee: '$50', caseTypes: ['Wrongful Collections', 'Credit Disputes', 'Lawsuits'], image: '👨‍⚖️' },
  { id: '3', name: 'Emily Chen', firm: 'Chen & Associates', location: 'New York, NY', specialties: ['FCRA', 'TCPA', 'Consumer Protection'], rating: 4.7, reviews: 156, yearsExperience: 18, consultationFee: 'Free', caseTypes: ['Robocalls', 'Data Breaches', 'Credit Errors'], image: '👩‍⚖️' },
  { id: '4', name: 'Michael Thompson', firm: 'Thompson Law Group', location: 'Chicago, IL', specialties: ['Debt Defense', 'Credit Repair', 'Foreclosure'], rating: 4.6, reviews: 72, yearsExperience: 10, consultationFee: '$75', caseTypes: ['Debt Lawsuits', 'Mortgage Issues', 'Collections'], image: '👨‍⚖️' },
];

function AttorneyCard({ attorney }: { attorney: Attorney }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex gap-4">
        <div className="text-5xl">{attorney.image}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{attorney.name}</h3>
          <p className="text-sm text-gray-500">{attorney.firm}</p>
          <p className="text-sm text-gray-500">📍 {attorney.location}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-yellow-400">★</span>
            <span className="font-medium">{attorney.rating}</span>
            <span className="text-gray-400">({attorney.reviews} reviews)</span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Experience</p>
          <p className="font-semibold">{attorney.yearsExperience} years</p>
        </div>
        <div>
          <p className="text-gray-500">Consultation</p>
          <p className="font-semibold text-green-600">{attorney.consultationFee}</p>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-sm text-gray-500 mb-2">Specialties</p>
        <div className="flex flex-wrap gap-1">
          {attorney.specialties.map((s) => (
            <span key={s} className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded">{s}</span>
          ))}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
          Book Consultation
        </button>
        <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
          View Profile
        </button>
      </div>
    </div>
  );
}

export default function AttorneysPage() {
  const [specialty, setSpecialty] = useState<string>('all');
  const [freeConsultOnly, setFreeConsultOnly] = useState(false);

  const specialties = ['all', 'FCRA Violations', 'Identity Theft', 'Debt Collection', 'Credit Repair'];
  const filteredAttorneys = mockAttorneys
    .filter(a => specialty === 'all' || a.specialties.includes(specialty))
    .filter(a => !freeConsultOnly || a.consultationFee === 'Free');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Credit Attorneys</h1>
        <p className="text-gray-600">Find experienced attorneys for credit-related legal issues</p>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-amber-800 text-sm">
          <strong>💡 When to consult an attorney:</strong> If you have FCRA violations, identity theft, harassment from collectors, or need to sue a creditor.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <select value={specialty} onChange={(e) => setSpecialty(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          {specialties.map((s) => <option key={s} value={s}>{s === 'all' ? 'All Specialties' : s}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={freeConsultOnly} onChange={(e) => setFreeConsultOnly(e.target.checked)} className="rounded" />
          Free Consultation Only
        </label>
      </div>

      {/* Attorney Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredAttorneys.map((attorney) => <AttorneyCard key={attorney.id} attorney={attorney} />)}
      </div>
    </div>
  );
}

