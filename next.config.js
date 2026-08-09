/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== "production";

// Security headers
const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.aimlapi.com https://*.alpaca.markets https://*.drivewealth.io https://*.plaid.com",
      "frame-src 'self' https://js.stripe.com https://cdn.plaid.com",
      "object-src 'none'",
      "base-uri 'self'",
    ].join("; "),
  },
];

// Add HSTS only in production
if (!isDev) {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  });
}

const nextConfig = {
  // Enable React strict mode
  reactStrictMode: true,

  // Skip ESLint during builds (run separately via `npm run lint`)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Enable standalone output for Docker
  output: "standalone",

  // Powered by header
  poweredByHeader: false,

  // Compression
  compress: true,

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },

  // Experimental features
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      // Cache static assets
      {
        source: "/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Cache images
      {
        source: "/_next/image/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [
      // Redirect www to non-www
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.fynvita.com" }],
        destination: "https://fynvita.com/:path*",
        permanent: true,
      },
    ];
  },

  // Webpack configuration
  webpack: (config, { isServer, webpack }) => {
    // Optimize bundle size
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };

      // Split chunks for better caching
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: "all",
          cacheGroups: {
            // Vendor chunk for node_modules
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendors",
              priority: 10,
              reuseExistingChunk: true,
            },
            // React and React DOM in separate chunk
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: "react",
              priority: 20,
              reuseExistingChunk: true,
            },
            // Chart libraries in separate chunk
            charts: {
              test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2|recharts)[\\/]/,
              name: "charts",
              priority: 15,
              reuseExistingChunk: true,
            },
            // AI/ML libraries in separate chunk
            aiml: {
              test: /[\\/]node_modules[\\/](@anthropic-ai|openai)[\\/]/,
              name: "aiml",
              priority: 15,
              reuseExistingChunk: true,
            },
            // Common shared code
            common: {
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    // Minimize bundle size with compression
    config.plugins.push(
      new webpack.DefinePlugin({
        "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
      }),
    );

    return config;
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || "1.0.0",
  },
};

module.exports = nextConfig;
