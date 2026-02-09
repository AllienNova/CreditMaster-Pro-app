'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Home,
  Building2,
  TrendingUp,
  DollarSign,
  Plus,
  MapPin,
  Calendar,
  Percent,
  ChevronRight,
  PiggyBank,
  Calculator,
} from 'lucide-react';

type PropertyType = 'primary_residence' | 'rental' | 'vacation' | 'investment';

interface Property {
  id: string;
  name: string;
  type: PropertyType;
  address: string;
  currentValue: number;
  purchasePrice: number;
  purchaseDate: Date;
  mortgageBalance: number;
  monthlyPayment: number;
  monthlyRent?: number;
  equity: number;
  appreciation: number;
  appreciationPercent: number;
}

interface PortfolioSummary {
  totalValue: number;
  totalEquity: number;
  totalDebt: number;
  totalAppreciation: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netCashFlow: number;
}

const MOCK_PROPERTIES: Property[] = [
  {
    id: '1',
    name: 'Primary Residence',
    type: 'primary_residence',
    address: '123 Main St, Austin, TX 78701',
    currentValue: 485000,
    purchasePrice: 420000,
    purchaseDate: new Date('2021-06-15'),
    mortgageBalance: 340000,
    monthlyPayment: 2150,
    equity: 145000,
    appreciation: 65000,
    appreciationPercent: 15.5,
  },
  {
    id: '2',
    name: 'Rental Property #1',
    type: 'rental',
    address: '456 Oak Ave, Austin, TX 78702',
    currentValue: 325000,
    purchasePrice: 280000,
    purchaseDate: new Date('2022-03-20'),
    mortgageBalance: 225000,
    monthlyPayment: 1680,
    monthlyRent: 2400,
    equity: 100000,
    appreciation: 45000,
    appreciationPercent: 16.1,
  },
  {
    id: '3',
    name: 'Vacation Condo',
    type: 'vacation',
    address: '789 Beach Blvd, Galveston, TX 77550',
    currentValue: 195000,
    purchasePrice: 175000,
    purchaseDate: new Date('2023-08-10'),
    mortgageBalance: 140000,
    monthlyPayment: 1050,
    monthlyRent: 1800,
    equity: 55000,
    appreciation: 20000,
    appreciationPercent: 11.4,
  },
];

const MOCK_SUMMARY: PortfolioSummary = {
  totalValue: 1005000,
  totalEquity: 300000,
  totalDebt: 705000,
  totalAppreciation: 130000,
  monthlyIncome: 4200,
  monthlyExpenses: 4880,
  netCashFlow: -680,
};

const getPropertyIcon = (type: PropertyType) => {
  switch (type) {
    case 'primary_residence':
      return Home;
    case 'rental':
      return Building2;
    case 'vacation':
      return Home;
    case 'investment':
      return Building2;
    default:
      return Home;
  }
};

const getPropertyColor = (type: PropertyType) => {
  switch (type) {
    case 'primary_residence':
      return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
    case 'rental':
      return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
    case 'vacation':
      return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
    case 'investment':
      return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
    default:
      return 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300';
  }
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
};

export default function RealEstatePage() {
  const [properties] = useState<Property[]>(MOCK_PROPERTIES);
  const [summary] = useState<PortfolioSummary>(MOCK_SUMMARY);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Real Estate Portfolio
              </h1>
            </div>
            <p className="text-gray-600 dark:text-slate-400">
              Track your properties, mortgages, and rental income
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />
            Add Property
          </button>
        </div>

        {/* Portfolio Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-gray-500 dark:text-slate-400">
                Total Value
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(summary.totalValue)}
            </p>
            <p className="text-sm text-green-600 mt-1">
              +{formatCurrency(summary.totalAppreciation)} appreciation
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <PiggyBank className="w-5 h-5 text-green-500" />
              <span className="text-sm text-gray-500 dark:text-slate-400">
                Total Equity
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(summary.totalEquity)}
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              {((summary.totalEquity / summary.totalValue) * 100).toFixed(1)}%
              ownership
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="w-5 h-5 text-red-500" />
              <span className="text-sm text-gray-500 dark:text-slate-400">
                Total Debt
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(summary.totalDebt)}
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              {((summary.totalDebt / summary.totalValue) * 100).toFixed(1)}% LTV
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-gray-500 dark:text-slate-400">
                Monthly Cash Flow
              </span>
            </div>
            <p
              className={`text-2xl font-bold ${summary.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {formatCurrency(summary.netCashFlow)}
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              {formatCurrency(summary.monthlyIncome)} income /{' '}
              {formatCurrency(summary.monthlyExpenses)} expenses
            </p>
          </motion.div>
        </div>

        {/* Properties List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm">
          <div className="p-5 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Your Properties ({properties.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {properties.map((property, index) => {
              const Icon = getPropertyIcon(property.type);
              return (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-5 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-3 rounded-lg ${getPropertyColor(property.type)}`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {property.name}
                        </h3>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 capitalize">
                          {property.type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-slate-400 mt-1">
                        <MapPin className="w-3 h-3" />
                        {property.address}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(property.currentValue)}
                      </p>
                      <p className="text-sm text-green-600">
                        +{property.appreciationPercent.toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500 dark:text-slate-400">Equity</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(property.equity)}
                      </p>
                    </div>
                    {property.monthlyRent && (
                      <div className="text-right">
                        <p className="text-sm text-gray-500 dark:text-slate-400">Rent</p>
                        <p className="font-semibold text-green-600">
                          {formatCurrency(property.monthlyRent)}/mo
                        </p>
                      </div>
                    )}
                    <div className="text-right">
                      <p className="text-sm text-gray-500 dark:text-slate-400">Mortgage</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(property.monthlyPayment)}/mo
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 dark:text-slate-500" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-5 text-white">
            <h3 className="font-semibold mb-2">Properties</h3>
            <p className="text-3xl font-bold">{properties.length}</p>
            <p className="text-blue-100 text-sm mt-1">
              Total properties tracked
            </p>
          </div>
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-5 text-white">
            <h3 className="font-semibold mb-2">Avg. Appreciation</h3>
            <p className="text-3xl font-bold">
              {(
                properties.reduce((sum, p) => sum + p.appreciationPercent, 0) /
                properties.length
              ).toFixed(1)}
              %
            </p>
            <p className="text-green-100 text-sm mt-1">Across all properties</p>
          </div>
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-5 text-white">
            <h3 className="font-semibold mb-2">Rental Yield</h3>
            <p className="text-3xl font-bold">
              {(
                ((summary.monthlyIncome * 12) / summary.totalValue) *
                100
              ).toFixed(1)}
              %
            </p>
            <p className="text-blue-100 text-sm mt-1">
              Annual rental income / value
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
