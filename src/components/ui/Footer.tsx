import Link from "next/link";

const footerColumns = [
  {
    title: "Product",
    links: [
      { href: "/credit", label: "Credit Health" },
      { href: "/financial-hub", label: "Financial Wellness" },
      { href: "/invest", label: "Investments" },
      { href: "/tax", label: "Tax Optimization" },
      { href: "/loans", label: "Student Loans" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/features", label: "Features" },
      { href: "/help", label: "Help Center" },
      { href: "/pricing", label: "Pricing" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy-policy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
    ],
  },
  {
    title: "Connect",
    links: [
      { href: "https://twitter.com", label: "Twitter", external: true },
      { href: "https://linkedin.com", label: "LinkedIn", external: true },
      { href: "https://github.com", label: "GitHub", external: true },
    ],
  },
] as const;

export default function Footer() {
  return (
    <footer className="py-8 px-6 bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800">
      <div className="max-w-[980px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-8">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <p className="text-xs font-semibold text-gray-900 dark:text-white mb-3">
                {column.title}
              </p>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    {"external" in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-xs text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-gray-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-500 dark:text-slate-400">
            &copy; {new Date().getFullYear()} Fynvita. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs text-gray-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <svg
                className="w-3 h-3 text-emerald-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              256-bit Encryption
            </span>
            <span className="flex items-center gap-1">
              <svg
                className="w-3 h-3 text-blue-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              SOC 2 Certified
            </span>
            <span className="flex items-center gap-1">
              <svg
                className="w-3 h-3 text-emerald-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              GDPR Compliant
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
