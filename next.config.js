/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Ensure images from specified domains are allowed
  images: {
    domains: [],
  },
  
  // Security headers configuration
  headers: async () => {
    return [
      {
        // Apply these headers to all routes
        source: '/:path*',
        headers: [
          // Content Security Policy (CSP)
          // Restricts the sources from which resources can be loaded
          {
            key: 'Content-Security-Policy',
            value: [
              // Default policy for most resources - default to self
              "default-src 'self';",
              // Scripts - allow self and specific Chart.js CDN if used
              "script-src 'self' 'unsafe-inline' 'unsafe-eval';", // Unsafe-inline needed for Next.js functionality
              // Styles - allow self and unsafe-inline for Next.js styling
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",
              // Images - allow self, data URLs and HTTPS sources
              "img-src 'self' data: https:;",
              // Fonts - allow self and Google Fonts
              "font-src 'self' https://fonts.gstatic.com;",
              // Connect - restrict to self and necessary APIs
              "connect-src 'self';",
              // Media - restrict to self
              "media-src 'self';",
              // Object - disallow by default
              "object-src 'none';",
              // Frame - restrict to self
              "frame-src 'self';",
              // Base URI - restrict to self
              "base-uri 'self';",
              // Form action - restrict to self
              "form-action 'self';",
              // Frame ancestors - prevent embedding in iframes (anti-clickjacking)
              "frame-ancestors 'self';",
              // Upgrade insecure requests
              "upgrade-insecure-requests;"
            ].join(' ')
          },
          
          // X-Content-Type-Options
          // Prevents browsers from MIME-sniffing a response from the declared content-type
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          
          // X-Frame-Options
          // Prevents clickjacking by restricting who can put your site in a frame
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          
          // X-XSS-Protection
          // Sets the configuration for the cross-site scripting filter in legacy browsers
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          
          // Referrer-Policy
          // Controls how much referrer information is included with requests
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          
          // Permissions-Policy
          // Controls which browser features and APIs can be used
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          
          // Strict-Transport-Security
          // Forces browsers to use HTTPS for the specified domain
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
