'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';

const contactMethods = [
  {
    icon: "envelope",
    title: 'Email Support',
    description: 'Get a response within 24 hours',
    action: 'support@fynvita.com',
    available: '24/7',
  },
  {
    icon: "envelope",
    title: 'Live Fynvita Chat',
    description: 'Fynvita Chat with our support team',
    action: 'Start Fynvita Chat',
    available: 'Mon-Fri 9am-6pm EST',
  },
  {
    icon: "chat",
    title: 'Phone Support',
    description: 'Premium & Enterprise only',
    action: '1-800-FynvitaREDIT',
    available: 'Mon-Fri 9am-6pm EST',
  },
];

const topics = [
  'General Question',
  'Technical Issue',
  'Billing Question',
  'Dispute Help',
  'Account Access',
  'Feature Request',
  'Other',
];

export default function FynvitaContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    topic: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
          <span className="text-4xl"></span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Message Sent!</h1>
        <p className="text-gray-600 dark:text-slate-300 mb-8">
          Thank you for contacting us. We&apos;ll get back to you within 24
          hours.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition"
        >
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Fynvita Contact Us
      </h1>

      {/* Fynvita Contact Methods */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {contactMethods.map((method) => (
          <div
            key={method.title}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 text-center"
          >
            <Icon name={method.icon} className="text-4xl mb-4 inline-block" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {method.title}
            </h3>
            <p className="text-gray-500 dark:text-slate-400 text-sm mb-2">{method.description}</p>
            <p className="text-emerald-500 font-medium">{method.action}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">{method.available}</p>
          </div>
        ))}
      </div>

      {/* Fynvita Contact Form */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Send us a Message
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                Topic
              </label>
              <select
                value={formData.topic}
                onChange={(e) =>
                  setFormData({ ...formData, topic: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500"
                required
              >
                <option value="">Select a topic</option>
                {topics.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                Message
              </label>
              <textarea
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500"
                placeholder="How can we help you?"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold rounded-lg hover:shadow-lg transition"
            >
              Send Message
            </button>
          </form>
        </div>

        {/* FAQ Link */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 dark:text-slate-400">
            Looking for quick answers? Check out our{' '}
            <a
              href="/help/faq"
              className="text-emerald-500 hover:text-emerald-600"
            >
              FAQ
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
