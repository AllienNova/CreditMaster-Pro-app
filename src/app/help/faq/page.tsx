"use client";

import { useState } from "react";

const faqCategories = [
  { id: "general", label: "General" },
  { id: "disputes", label: "Disputes" },
  { id: "billing", label: "Billing" },
  { id: "account", label: "Account" },
];

const faqs = [
  { category: "general", question: "What is CreditMaster Pro?", answer: "CreditMaster Pro is an AI-powered credit repair platform that helps you identify errors on your credit reports, generate dispute letters, and track your credit score improvement over time." },
  { category: "general", question: "How does the credit repair process work?", answer: "Our AI analyzes your credit reports from all three bureaus, identifies negative items that may be inaccurate or outdated, generates professional dispute letters, and tracks the progress of your disputes until resolution." },
  { category: "general", question: "How long does it take to see results?", answer: "Most users see their first results within 30-45 days, which is the time credit bureaus have to respond to disputes. Significant score improvements typically occur within 3-6 months of consistent effort." },
  { category: "disputes", question: "How do I file a dispute?", answer: "Simply navigate to the Disputes section, select the negative item you want to dispute, and our AI will generate a professional dispute letter. You can review, edit, and send it directly to the credit bureau." },
  { category: "disputes", question: "What types of items can be disputed?", answer: "You can dispute late payments, collections, charge-offs, bankruptcies, inquiries, and any inaccurate information on your credit report. Our AI helps identify which items have the best chance of removal." },
  { category: "disputes", question: "How many disputes can I file at once?", answer: "We recommend filing 3-5 disputes per bureau at a time for optimal results. Filing too many at once may result in bureaus dismissing them as frivolous." },
  { category: "billing", question: "What plans do you offer?", answer: "We offer three plans: Basic ($29/month) for essential features, Premium ($79/month) for advanced AI tools and priority support, and Enterprise ($199/month) for unlimited disputes and dedicated account management." },
  { category: "billing", question: "Can I cancel my subscription anytime?", answer: "Yes, you can cancel your subscription at any time from your account settings. Your access will continue until the end of your current billing period." },
  { category: "billing", question: "Do you offer refunds?", answer: "We offer a 30-day money-back guarantee for new subscribers. If you're not satisfied with our service, contact support within 30 days for a full refund." },
  { category: "account", question: "Is my personal information secure?", answer: "Yes, we use bank-level 256-bit encryption to protect your data. Your SSN and personal information are encrypted and never stored in plain text. We are SOC 2 Type II certified." },
  { category: "account", question: "How do I connect my credit bureaus?", answer: "Go to Settings > Connected Accounts and follow the prompts to securely connect to Experian, Equifax, and TransUnion. You'll need to verify your identity to access your reports." },
  { category: "account", question: "Can I use CreditMaster Pro on mobile?", answer: "Yes! Our platform is fully responsive and works on any device. We also have native iOS and Android apps available for download." },
];

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState("general");
  const [openQuestion, setOpenQuestion] = useState<number | null>(null);

  const filteredFaqs = faqs.filter((faq) => faq.category === activeCategory);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h1>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {faqCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => { setActiveCategory(cat.id); setOpenQuestion(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeCategory === cat.id
                ? "bg-emerald-500 text-white"
                : "bg-white text-gray-700 border border-gray-200 hover:border-emerald-300"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* FAQ Accordion */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="divide-y divide-gray-100">
          {filteredFaqs.map((faq, i) => (
            <div key={i}>
              <button
                onClick={() => setOpenQuestion(openQuestion === i ? null : i)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition"
              >
                <span className="font-medium text-gray-900">{faq.question}</span>
                <span className={`text-gray-400 transition-transform ${openQuestion === i ? "rotate-180" : ""}`}>
                  ▼
                </span>
              </button>
              {openQuestion === i && (
                <div className="px-6 pb-4">
                  <p className="text-gray-600">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Still Need Help */}
      <div className="mt-8 bg-emerald-50 rounded-xl p-6 text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Still have questions?</h2>
        <p className="text-gray-600 mb-4">Our support team is here to help you 24/7</p>
        <a href="/help/contact" className="inline-block px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition">
          Contact Support
        </a>
      </div>
    </div>
  );
}

