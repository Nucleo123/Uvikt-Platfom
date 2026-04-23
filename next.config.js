/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(self), microphone=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Keep CSP pragmatic: allow inline styles (tailwind-jit) + OSM tiles + Unsplash placeholders
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://unpkg.com https://*.unsplash.com https://staticmap.openstreetmap.de",
      "style-src 'self' 'unsafe-inline' https://unpkg.com https://maxcdn.bootstrapcdn.com",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://ajax.googleapis.com",
      "connect-src 'self' https://*.tile.openstreetmap.org https://nominatim.openstreetmap.org https://overpass-api.de https://sepomex.icalialabs.com https://gaia.inegi.org.mx https://www.inegi.org.mx",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["puppeteer", "pdf-parse"],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
    ];
  },
};

module.exports = nextConfig;
