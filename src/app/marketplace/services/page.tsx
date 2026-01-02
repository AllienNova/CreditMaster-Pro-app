/**
 * Credit Repair Services Directory
 *
 * Vetted credit repair companies directory with provider listing,
 * comparison table, reviews, and filtering.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

interface CreditRepairService {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  bbbRating: string;
  yearsInBusiness: number;
  priceRange: string;
  services: string[];
  guarantee: string;
  verified: boolean;
}

// Fallback mock data for development/offline mode
const mockServices: CreditRepairService[] = [
  { id: '1', name: 'Lexington Law', rating: 4.5, reviewCount: 12500, bbbRating: 'A+', yearsInBusiness: 18, priceRange: '$89-$129/mo', services: ['Disputes', 'Monitoring', 'Identity Protection'], guarantee: '90-day money back', verified: true },
  { id: '2', name: 'Credit Saint', rating: 4.7, reviewCount: 8200, bbbRating: 'A', yearsInBusiness: 15, priceRange: '$79-$119/mo', services: ['Disputes', 'Score Tracking', 'Creditor Intervention'], guarantee: '90-day money back', verified: true },
  { id: '3', name: 'Sky Blue Credit', rating: 4.4, reviewCount: 6800, bbbRating: 'A+', yearsInBusiness: 20, priceRange: '$79/mo flat', services: ['Disputes', 'Debt Validation', 'Goodwill Letters'], guarantee: '90-day money back', verified: true },
  { id: '4', name: 'The Credit People', rating: 4.3, reviewCount: 5400, bbbRating: 'A', yearsInBusiness: 12, priceRange: '$69-$99/mo', services: ['Disputes', 'Score Analysis', 'Credit Education'], guarantee: '60-day money back', verified: true },
  { id: '5', name: 'Ovation Credit', rating: 4.2, reviewCount: 4100, bbbRating: 'A-', yearsInBusiness: 10, priceRange: '$89-$149/mo', services: ['Disputes', 'Personal Case Manager', 'Unlimited Challenges'], guarantee: '30-day money back', verified: false },
];

// Map API provider to CreditRepairService format
function mapProviderToService(provider: Record<string, unknown>): CreditRepairService {
  return {
    id: String(provider.id || ''),
    name: String(provider.name || ''),
    rating: Number(provider.rating || 0),
    reviewCount: Number(provider.reviewCount || 0),
    bbbRating: String(provider.bbbRating || 'N/A'),
    yearsInBusiness: Number(provider.yearsInBusiness || 0),
    priceRange: String(provider.priceRange || 'Contact for pricing'),
    services: Array.isArray(provider.services) ? provider.services.map(String) : [],
    guarantee: String(provider.guarantee || 'Contact for details'),
    verified: Boolean(provider.verified),
  };
}

function ServiceCard({ service }: { service: CreditRepairService }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{service.name}</h3>
            {service.verified && <span className="text-blue-500">✓</span>}
          </div>
          <p className="text-sm text-gray-500">{service.yearsInBusiness} years in business</p>
        </div>
        <span className="px-2 py-1 text-sm font-medium bg-green-100 text-green-800 rounded">BBB: {service.bbbRating}</span>
      </div>
      
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center">
          <span className="text-yellow-400">★</span>
          <span className="ml-1 font-medium">{service.rating}</span>
          <span className="ml-1 text-sm text-gray-500">({service.reviewCount.toLocaleString()})</span>
        </div>
        <span className="text-indigo-600 font-medium">{service.priceRange}</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {service.services.map((s) => (
          <span key={s} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">{s}</span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <span className="text-sm text-gray-500">💰 {service.guarantee}</span>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
          View Details
        </button>
      </div>
    </div>
  );
}

function ComparisonTable({ services }: { services: CreditRepairService[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left py-3 px-4">Company</th>
            <th className="text-center py-3 px-4">Rating</th>
            <th className="text-center py-3 px-4">BBB</th>
            <th className="text-center py-3 px-4">Price</th>
            <th className="text-center py-3 px-4">Guarantee</th>
          </tr>
        </thead>
        <tbody>
          {services.map((s) => (
            <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4 font-medium">{s.name}</td>
              <td className="text-center py-3 px-4">⭐ {s.rating}</td>
              <td className="text-center py-3 px-4">{s.bbbRating}</td>
              <td className="text-center py-3 px-4">{s.priceRange}</td>
              <td className="text-center py-3 px-4">{s.guarantee}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ServicesPage() {
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [sortBy, setSortBy] = useState<'rating' | 'price' | 'reviews'>('rating');
  const [filterVerified, setFilterVerified] = useState(false);
  const [services, setServices] = useState<CreditRepairService[]>(mockServices);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch services from API
  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('category', 'credit_repair');
      if (filterVerified) {
        params.append('verified', 'true');
      }

      const response = await fetch(`/api/marketplace/providers?${params.toString()}`);
      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        setServices(result.data.map(mapProviderToService));
      } else {
        // Fallback to mock data
        setServices(mockServices);
        if (!result.success) {
          setError('Unable to load from server. Showing sample data.');
        }
      }
    } catch (err) {
      console.error('Failed to fetch services:', err);
      setServices(mockServices);
      setError('Unable to load from server. Showing sample data.');
    } finally {
      setLoading(false);
    }
  }, [filterVerified]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const filteredServices = services
    .filter((s) => !filterVerified || s.verified)
    .sort((a, b) =>
      sortBy === 'rating'
        ? b.rating - a.rating
        : sortBy === 'reviews'
          ? b.reviewCount - a.reviewCount
          : 0
    );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Credit Repair Services</h1>
        <p className="text-gray-600">Vetted credit repair companies to help improve your score</p>
        {error && (
          <p className="mt-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex items-center gap-4">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'rating' | 'price' | 'reviews')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="rating">Highest Rated</option>
            <option value="reviews">Most Reviews</option>
            <option value="price">Price</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={filterVerified} onChange={(e) => setFilterVerified(e.target.checked)} className="rounded" />
            Verified Only
          </label>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView('cards')} className={`px-3 py-2 rounded-lg text-sm ${view === 'cards' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>
            Cards
          </button>
          <button onClick={() => setView('table')} className={`px-3 py-2 rounded-lg text-sm ${view === 'table' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>
            Compare
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-gray-600">Loading services...</span>
        </div>
      ) : view === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredServices.map((s) => (
            <ServiceCard key={s.id} service={s} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <ComparisonTable services={filteredServices} />
        </div>
      )}
    </div>
  );
}

