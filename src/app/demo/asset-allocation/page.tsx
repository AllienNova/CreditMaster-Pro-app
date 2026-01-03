'use client';

/**
 * Asset Allocation Analyzer Demo Page
 *
 * Demonstrates the Asset Allocation Analyzer with sample portfolio data
 */

import { useState } from 'react';
import AssetAllocationPanel from '@/components/investments/allocation/AssetAllocationPanel';
import { Portfolio } from '@/lib/investments/types/investment.types';

export default function AssetAllocationDemoPage() {
  // Sample portfolio data
  const [samplePortfolio] = useState<Portfolio>({
    id: 'demo-portfolio-1',
    userId: 'demo-user',
    name: 'Demo Investment Portfolio',
    holdings: [
      {
        id: 'holding-1',
        userId: 'demo-user',
        symbol: 'AAPL',
        assetClass: 'stock' as any,
        quantity: 50,
        avgCostBasis: 150,
        currentPrice: 180,
        marketValue: 9000,
        unrealizedGain: 1500,
        unrealizedGainPercent: 20,
        realizedGain: 0,
        weight: 0.3,
        sector: 'Technology',
        purchaseDate: new Date('2023-01-15'),
        lastUpdated: new Date(),
      },
      {
        id: 'holding-2',
        userId: 'demo-user',
        symbol: 'AGG',
        assetClass: 'bond' as any,
        quantity: 100,
        avgCostBasis: 105,
        currentPrice: 108,
        marketValue: 10800,
        unrealizedGain: 300,
        unrealizedGainPercent: 2.86,
        realizedGain: 0,
        weight: 0.36,
        sector: 'Fixed Income',
        purchaseDate: new Date('2023-02-01'),
        lastUpdated: new Date(),
      },
      {
        id: 'holding-3',
        userId: 'demo-user',
        symbol: 'VNQ',
        assetClass: 'reit' as any,
        quantity: 30,
        avgCostBasis: 90,
        currentPrice: 95,
        marketValue: 2850,
        unrealizedGain: 150,
        unrealizedGainPercent: 5.56,
        realizedGain: 0,
        weight: 0.095,
        sector: 'Real Estate',
        purchaseDate: new Date('2023-03-10'),
        lastUpdated: new Date(),
      },
      {
        id: 'holding-4',
        userId: 'demo-user',
        symbol: 'MSFT',
        assetClass: 'stock' as any,
        quantity: 25,
        avgCostBasis: 300,
        currentPrice: 350,
        marketValue: 8750,
        unrealizedGain: 1250,
        unrealizedGainPercent: 16.67,
        realizedGain: 0,
        weight: 0.292,
        sector: 'Technology',
        purchaseDate: new Date('2023-01-20'),
        lastUpdated: new Date(),
      },
      {
        id: 'holding-5',
        userId: 'demo-user',
        symbol: 'GLD',
        assetClass: 'commodity' as any,
        quantity: 10,
        avgCostBasis: 180,
        currentPrice: 185,
        marketValue: 1850,
        unrealizedGain: 50,
        unrealizedGainPercent: 2.78,
        realizedGain: 0,
        weight: 0.062,
        sector: 'Commodities',
        purchaseDate: new Date('2023-04-05'),
        lastUpdated: new Date(),
      },
    ],
    totalValue: 33250,
    totalCost: 30050,
    totalGain: 3200,
    totalGainPercent: 10.65,
    dayChange: 250,
    dayChangePercent: 0.76,
    cashBalance: 2750,
    assetAllocation: [
      { name: 'Stocks', value: 17750, percentage: 53.38 },
      { name: 'Bonds', value: 10800, percentage: 32.48 },
      { name: 'Real Estate', value: 2850, percentage: 8.57 },
      { name: 'Commodities', value: 1850, percentage: 5.56 },
    ],
    sectorAllocation: [
      { name: 'Technology', value: 17750, percentage: 53.38 },
      { name: 'Fixed Income', value: 10800, percentage: 32.48 },
      { name: 'Real Estate', value: 2850, percentage: 8.57 },
      { name: 'Commodities', value: 1850, percentage: 5.56 },
    ],
    performanceHistory: [
      { date: new Date('2024-01-01'), value: 28000, change: 0, changePercent: 0 },
      { date: new Date('2024-06-01'), value: 30500, change: 2500, changePercent: 8.93 },
      { date: new Date('2024-12-01'), value: 33250, change: 2750, changePercent: 9.02 },
    ],
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date(),
  });

  const handleRebalance = (recommendations: any[]) => {
    console.log('Rebalancing recommendations:', recommendations);
    alert(`Would execute ${recommendations.length} rebalancing trades. Check console for details.`);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Asset Allocation Analyzer</h1>
          <p className="text-gray-400 text-lg">
            Optimize your portfolio with Modern Portfolio Theory and intelligent rebalancing recommendations
          </p>
        </div>

        {/* Demo Notice */}
        <div className="mb-6 p-4 bg-blue-900/30 border border-blue-500 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-2xl">ℹ️</span>
            <div>
              <div className="font-semibold text-blue-400">Demo Mode</div>
              <div className="text-sm text-blue-300">
                This is a demonstration using sample portfolio data. Select a risk tolerance and click "Analyze" to see the allocation analysis.
              </div>
            </div>
          </div>
        </div>

        {/* Asset Allocation Panel */}
        <AssetAllocationPanel portfolio={samplePortfolio} onRebalance={handleRebalance} />
      </div>
    </div>
  );
}

