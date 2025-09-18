import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ChartBarIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { name: 'How It Works', href: '/how-it-works' },
      { name: 'Pricing', href: '/pricing' },
      { name: 'Features', href: '/#features' },
      { name: 'Success Stories', href: '/#testimonials' }
    ],
    company: [
      { name: 'About Us', href: '/about' },
      { name: 'Contact', href: '/contact' },
      { name: 'Blog', href: '/blog' },
      { name: 'Careers', href: '/careers' }
    ],
    legal: [
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/terms' },
      { name: 'FCRA Compliance', href: '/fcra-compliance' },
      { name: 'Disclaimer', href: '/disclaimer' }
    ],
    support: [
      { name: 'Help Center', href: '/help' },
      { name: 'Contact Support', href: '/support' },
      { name: 'System Status', href: '/status' },
      { name: 'API Documentation', href: '/api-docs' }
    ]
  };

  return (
    <footer className="bg-gray-900 text-white">
      {/* Main Footer Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center space-x-2 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <ChartBarIcon className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xl text-white">CreditMaster</span>
                <span className="text-xs text-blue-400 font-medium -mt-1">PRO</span>
              </div>
            </Link>
            
            <p className="text-gray-300 mb-6 leading-relaxed">
              AI-powered credit repair that actually works. Transform your credit score in 90 days 
              with our advanced strategies and machine learning technology.
            </p>

            {/* Trust Badges */}
            <div className="space-y-3">
              <div className="flex items-center text-sm text-gray-300">
                <ShieldCheckIcon className="w-5 h-5 text-green-400 mr-2" />
                <span>FCRA Compliant</span>
              </div>
              <div className="flex items-center text-sm text-gray-300">
                <ShieldCheckIcon className="w-5 h-5 text-green-400 mr-2" />
                <span>Bank-Level Security</span>
              </div>
              <div className="flex items-center text-sm text-gray-300">
                <ShieldCheckIcon className="w-5 h-5 text-green-400 mr-2" />
                <span>90-Day Money-Back Guarantee</span>
              </div>
            </div>
          </div>

          {/* Footer Links */}
          <div className="lg:col-span-3">
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <h3 className="font-semibold text-white mb-4">Product</h3>
                <ul className="space-y-3">
                  {footerLinks.product.map((link) => (
                    <li key={link.name}>
                      <Link 
                        to={link.href} 
                        className="text-gray-300 hover:text-blue-400 transition-colors text-sm"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-4">Company</h3>
                <ul className="space-y-3">
                  {footerLinks.company.map((link) => (
                    <li key={link.name}>
                      <Link 
                        to={link.href} 
                        className="text-gray-300 hover:text-blue-400 transition-colors text-sm"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-4">Legal</h3>
                <ul className="space-y-3">
                  {footerLinks.legal.map((link) => (
                    <li key={link.name}>
                      <Link 
                        to={link.href} 
                        className="text-gray-300 hover:text-blue-400 transition-colors text-sm"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-4">Support</h3>
                <ul className="space-y-3">
                  {footerLinks.support.map((link) => (
                    <li key={link.name}>
                      <Link 
                        to={link.href} 
                        className="text-gray-300 hover:text-blue-400 transition-colors text-sm"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-center">
              <EnvelopeIcon className="w-5 h-5 text-blue-400 mr-3" />
              <div>
                <div className="text-sm text-gray-400">Email Support</div>
                <div className="text-white font-medium">support@creditmaster.pro</div>
              </div>
            </div>
            
            <div className="flex items-center">
              <PhoneIcon className="w-5 h-5 text-blue-400 mr-3" />
              <div>
                <div className="text-sm text-gray-400">Phone Support</div>
                <div className="text-white font-medium">1-800-CREDIT-PRO</div>
              </div>
            </div>
            
            <div className="flex items-center">
              <MapPinIcon className="w-5 h-5 text-blue-400 mr-3" />
              <div>
                <div className="text-sm text-gray-400">Business Hours</div>
                <div className="text-white font-medium">Mon-Fri 9AM-6PM EST</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-400 mb-4 md:mb-0">
              © {currentYear} CreditMaster Pro. All rights reserved.
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <span>Made with ❤️ for your financial freedom</span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>All systems operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legal Disclaimer */}
      <div className="bg-gray-800 border-t border-gray-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-xs text-gray-400 text-center leading-relaxed">
            <strong>Important Disclaimer:</strong> CreditMaster Pro is not a credit repair organization as defined under federal or state law. 
            We provide educational information and tools to help you understand and improve your credit. Results may vary and are not guaranteed. 
            We comply with all applicable federal and state laws including the Fair Credit Reporting Act (FCRA) and Credit Repair Organizations Act (CROA). 
            You have the right to dispute inaccurate information in your credit report yourself, at no cost, by contacting the credit reporting agencies directly.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

