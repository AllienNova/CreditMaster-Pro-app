"use client";

import { useState } from "react";
import Link from "next/link";

const achievements = [
  { icon: "🏆", title: "First Dispute", description: "Filed your first dispute", earned: true, date: "Nov 15, 2024" },
  { icon: "⭐", title: "Score Booster", description: "Increased score by 50+ points", earned: true, date: "Nov 28, 2024" },
  { icon: "🎯", title: "Quick Win", description: "Got an item removed in under 30 days", earned: true, date: "Dec 1, 2024" },
  { icon: "🔥", title: "On Fire", description: "5 successful disputes in a row", earned: false, date: null },
  { icon: "💎", title: "Credit Master", description: "Reach a 750+ credit score", earned: false, date: null },
];

const activityHistory = [
  { action: "Dispute resolved", details: "Late payment removed from Experian", date: "2 hours ago", type: "success" },
  { action: "Score updated", details: "Credit score increased to 720", date: "1 day ago", type: "info" },
  { action: "Dispute sent", details: "Collection dispute sent to Equifax", date: "3 days ago", type: "pending" },
  { action: "Report pulled", details: "Credit reports refreshed", date: "5 days ago", type: "info" },
];

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: "John Doe",
    email: "john@example.com",
    phone: "(555) 123-4567",
    memberSince: "January 2024",
    plan: "Premium",
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Link href="/dashboard" className="text-emerald-100 hover:text-white text-sm mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-4xl font-bold">
              JD
            </div>
            <div>
              <h1 className="text-3xl font-bold">{profile.name}</h1>
              <p className="text-emerald-100">{profile.email}</p>
              <div className="flex items-center gap-4 mt-2">
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm">{profile.plan} Member</span>
                <span className="text-sm text-emerald-100">Member since {profile.memberSince}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
                <p className="text-3xl font-bold text-emerald-500">720</p>
                <p className="text-gray-500 text-sm">Credit Score</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
                <p className="text-3xl font-bold text-blue-500">12</p>
                <p className="text-gray-500 text-sm">Items Removed</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
                <p className="text-3xl font-bold text-purple-500">78%</p>
                <p className="text-gray-500 text-sm">Success Rate</p>
              </div>
            </div>

            {/* Personal Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
                <button onClick={() => setIsEditing(!isEditing)} className="text-emerald-500 hover:text-emerald-600 text-sm font-medium">
                  {isEditing ? "Save" : "Edit"}
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Full Name</label>
                    {isEditing ? (
                      <input type="text" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    ) : (
                      <p className="text-gray-900">{profile.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Email</label>
                    <p className="text-gray-900">{profile.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Phone</label>
                    {isEditing ? (
                      <input type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    ) : (
                      <p className="text-gray-900">{profile.phone}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Plan</label>
                    <p className="text-gray-900">{profile.plan}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity History */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {activityHistory.map((activity, i) => (
                  <div key={i} className="p-4 flex items-center gap-4">
                    <span className={`w-2 h-2 rounded-full ${activity.type === "success" ? "bg-emerald-500" : activity.type === "pending" ? "bg-yellow-500" : "bg-blue-500"}`} />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{activity.action}</p>
                      <p className="text-sm text-gray-500">{activity.details}</p>
                    </div>
                    <span className="text-sm text-gray-400">{activity.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Achievements */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-fit">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Achievements</h2>
            </div>
            <div className="p-4 space-y-3">
              {achievements.map((achievement, i) => (
                <div key={i} className={`p-3 rounded-lg ${achievement.earned ? "bg-emerald-50" : "bg-gray-50 opacity-50"}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{achievement.icon}</span>
                    <div>
                      <p className="font-medium text-gray-900">{achievement.title}</p>
                      <p className="text-xs text-gray-500">{achievement.description}</p>
                      {achievement.earned && <p className="text-xs text-emerald-500 mt-1">Earned {achievement.date}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

