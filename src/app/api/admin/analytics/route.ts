/**
 * Admin Analytics API
 *
 * Returns analytics data for the admin dashboard.
 * SECURITY: Requires admin authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, createAuthResponse } from '@/lib/security/auth-middleware';

export async function GET(request: NextRequest) {
  // SECURITY: Require admin role for analytics data
  const authResult = await requireRole(request, 'admin');
  if (!authResult.authenticated || !authResult.user) {
    return createAuthResponse(authResult);
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || '30d';

    // Generate mock data based on time range
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
    
    // User growth data
    const userGrowth = [];
    for (let i = Math.min(days, 12); i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i * (days / 12));
      userGrowth.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: Math.floor(Math.random() * 100) + 50 + (12 - i) * 10,
      });
    }

    // Revenue by month
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const revenueByMonth = [];
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      revenueByMonth.push({
        month: months[monthIndex],
        revenue: Math.floor(Math.random() * 20000) + 30000 + (5 - i) * 5000,
      });
    }

    // Disputes by status
    const disputesByStatus = [
      { status: 'draft', count: Math.floor(Math.random() * 50) + 20 },
      { status: 'sent', count: Math.floor(Math.random() * 100) + 80 },
      { status: 'under_review', count: Math.floor(Math.random() * 80) + 60 },
      { status: 'resolved', count: Math.floor(Math.random() * 200) + 150 },
      { status: 'rejected', count: Math.floor(Math.random() * 30) + 10 },
    ];

    // Subscriptions by tier
    const subscriptionsByTier = [
      { tier: 'free', count: Math.floor(Math.random() * 500) + 300 },
      { tier: 'basic', count: Math.floor(Math.random() * 300) + 200 },
      { tier: 'premium', count: Math.floor(Math.random() * 200) + 100 },
      { tier: 'enterprise', count: Math.floor(Math.random() * 50) + 20 },
    ];

    // Top features
    const topFeatures = [
      { feature: 'AI Chat', usage: Math.floor(Math.random() * 5000) + 8000 },
      { feature: 'Dispute Letters', usage: Math.floor(Math.random() * 3000) + 5000 },
      { feature: 'Credit Analysis', usage: Math.floor(Math.random() * 2000) + 4000 },
      { feature: 'Student Loans', usage: Math.floor(Math.random() * 1500) + 2500 },
      { feature: 'Marketplace', usage: Math.floor(Math.random() * 1000) + 1500 },
    ];

    return NextResponse.json({
      userGrowth,
      revenueByMonth,
      disputesByStatus,
      subscriptionsByTier,
      topFeatures,
      timeRange: range,
    });
  } catch (_error) {
    // Error silently caught
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

