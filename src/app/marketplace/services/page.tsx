/**
 * Credit Repair Services Directory
 *
 * Vetted credit repair companies directory with provider listing,
 * comparison table, reviews, and filtering.
 */

"use client";

import { useState, useEffect, useCallback } from "react";

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

// Map API provider to CreditRepairService format
function mapProviderToService(
  provider: Record<string, unknown>,
): CreditRepairService {
  return {
    id: String(provider.id || ""),
    name: String(provider.name || ""),
    rating: Number(provider.rating || 0),
    reviewCount: Number(provider.reviewCount || 0),
    bbbRating: String(provider.bbbRating || "N/A"),
    yearsInBusiness: Number(provider.yearsInBusiness || 0),
    priceRange: String(provider.priceRange || "Contact for pricing"),
    services: Array.isArray(provider.services)
      ? provider.services.map(String)
      : [],
    guarantee: String(provider.guarantee || "Contact for details"),
    verified: Boolean(provider.verified),
  };
}

function ServiceCard({ service }: { service: CreditRepairService }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {service.name}
            </h3>
            {service.verified && <span className="text-blue-500"></span>}
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {service.yearsInBusiness} years in business
          </p>
        </div>
        <span className="px-2 py-1 text-sm font-medium bg-green-100 text-green-800 rounded">
          BBB: {service.bbbRating}
        </span>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center">
          <span className="text-yellow-400"></span>
          <span className="ml-1 font-medium">{service.rating}</span>
          <span className="ml-1 text-sm text-gray-500 dark:text-slate-400">
            ({service.reviewCount.toLocaleString()})
          </span>
        </div>
        <span className="text-blue-600 font-medium">{service.priceRange}</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {service.services.map((s) => (
          <span
            key={s}
            className="px-2 py-1 text-xs bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 rounded"
          >
            {s}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-700">
        <span className="text-sm text-gray-500 dark:text-slate-400">
          {service.guarantee}
        </span>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
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
          <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
            <th className="text-left py-3 px-4">Company</th>
            <th className="text-center py-3 px-4">Rating</th>
            <th className="text-center py-3 px-4">BBB</th>
            <th className="text-center py-3 px-4">Price</th>
            <th className="text-center py-3 px-4">Guarantee</th>
          </tr>
        </thead>
        <tbody>
          {services.map((s) => (
            <tr
              key={s.id}
              className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900"
            >
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
  const [view, setView] = useState<"cards" | "table">("cards");
  const [sortBy, setSortBy] = useState<"rating" | "price" | "reviews">(
    "rating",
  );
  const [filterVerified, setFilterVerified] = useState(false);
  const [services, setServices] = useState<CreditRepairService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch services from API
  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append("category", "credit_repair");
      if (filterVerified) {
        params.append("verified", "true");
      }

      const response = await fetch(
        `/api/marketplace/providers?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch providers");
      }

      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        setServices(result.data.map(mapProviderToService));
      } else {
        setServices([]);
        setError("Couldn't load providers. Try again.");
      }
    } catch (err) {
      console.error("Failed to fetch services:", err);
      setServices([]);
      setError("Couldn't load providers. Try again.");
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
      sortBy === "rating"
        ? b.rating - a.rating
        : sortBy === "reviews"
          ? b.reviewCount - a.reviewCount
          : 0,
    );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Credit Repair Services
        </h1>
        <p className="text-gray-600 dark:text-slate-300">
          Vetted credit repair companies to help improve your score
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-4">
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as "rating" | "price" | "reviews")
            }
            className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm"
          >
            <option value="rating">Highest Rated</option>
            <option value="reviews">Most Reviews</option>
            <option value="price">Price</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filterVerified}
              onChange={(e) => setFilterVerified(e.target.checked)}
              className="rounded"
            />
            Verified Only
          </label>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView("cards")}
            className={`px-3 py-2 rounded-lg text-sm ${view === "cards" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-slate-800"}`}
          >
            Cards
          </button>
          <button
            onClick={() => setView("table")}
            className={`px-3 py-2 rounded-lg text-sm ${view === "table" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-slate-800"}`}
          >
            Compare
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-slate-300">
            Loading services...
          </span>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-gray-200 dark:border-slate-700">
          <p className="text-gray-600 dark:text-slate-300 mb-4">
            {error
              ? "Couldn't load providers. Try again."
              : "No credit repair services available right now."}
          </p>
          {error && (
            <button
              onClick={fetchServices}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Retry
            </button>
          )}
        </div>
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredServices.map((s) => (
            <ServiceCard key={s.id} service={s} />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
          <ComparisonTable services={filteredServices} />
        </div>
      )}
    </div>
  );
}
