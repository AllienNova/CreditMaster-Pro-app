"use client";

import Link from "next/link";

const categories = [
  { icon: "🚀", title: "Getting Started", description: "Learn the basics of CreditMaster Pro", articles: 8, href: "/help/guides" },
  { icon: "📝", title: "Disputes", description: "How to create and manage disputes", articles: 12, href: "/help/guides" },
  { icon: "📊", title: "Credit Reports", description: "Understanding your credit reports", articles: 10, href: "/help/guides" },
  { icon: "💳", title: "Billing & Plans", description: "Manage your subscription", articles: 6, href: "/help/guides" },
  { icon: "🔒", title: "Account & Security", description: "Protect your account", articles: 5, href: "/help/guides" },
  { icon: "🔗", title: "Integrations", description: "Connect banks and bureaus", articles: 7, href: "/help/guides" },
];

const popularArticles = [
  { title: "How to dispute a late payment", views: "12.5k", category: "Disputes" },
  { title: "Understanding your credit score factors", views: "10.2k", category: "Credit Reports" },
  { title: "How to connect your credit bureaus", views: "8.7k", category: "Getting Started" },
  { title: "Writing an effective goodwill letter", views: "7.3k", category: "Disputes" },
  { title: "How to cancel your subscription", views: "5.1k", category: "Billing" },
];

const quickLinks = [
  { icon: "📧", title: "Email Support", description: "Get help via email", action: "support@creditmasterpro.com" },
  { icon: "💬", title: "Live Chat", description: "Chat with our team", action: "Start Chat" },
  { icon: "📞", title: "Phone Support", description: "Premium members only", action: "1-800-CREDIT" },
];

export default function HelpCenterPage() {
  return (
    <div>
      {/* Categories */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Browse by Category</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Link
              key={category.title}
              href={category.href}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:border-emerald-300 hover:shadow-md transition"
            >
              <span className="text-3xl mb-4 block">{category.icon}</span>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{category.title}</h3>
              <p className="text-gray-500 text-sm mb-3">{category.description}</p>
              <p className="text-emerald-500 text-sm">{category.articles} articles →</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Popular Articles */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Popular Articles</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="divide-y divide-gray-100">
              {popularArticles.map((article, i) => (
                <Link
                  key={i}
                  href="/help/guides"
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition"
                >
                  <div>
                    <h3 className="font-medium text-gray-900">{article.title}</h3>
                    <p className="text-sm text-gray-500">{article.category}</p>
                  </div>
                  <span className="text-sm text-gray-400">{article.views} views</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Need More Help?</h2>
          <div className="space-y-4">
            {quickLinks.map((link) => (
              <div key={link.title} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{link.icon}</span>
                  <div>
                    <h3 className="font-medium text-gray-900">{link.title}</h3>
                    <p className="text-sm text-gray-500">{link.description}</p>
                    <p className="text-sm text-emerald-500 mt-1">{link.action}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Video Tutorials */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Video Tutorials</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {["Getting Started Guide", "How to File a Dispute", "Understanding Credit Scores"].map((title, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="aspect-video bg-gray-100 flex items-center justify-center">
                <span className="text-4xl">▶️</span>
              </div>
              <div className="p-4">
                <h3 className="font-medium text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500">5 min watch</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

