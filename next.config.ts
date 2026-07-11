import type { NextConfig } from "next";

/**
 * Content-Security-Policy tuned for Joink's real dependencies:
 *  - Razorpay Standard Checkout loads a script from checkout.razorpay.com and
 *    opens frames on *.razorpay.com; its telemetry posts to *.razorpay.com.
 *  - The browser Supabase client calls the project's *.supabase.co over HTTPS
 *    (and WebSocket for realtime).
 *  - 'unsafe-inline' is required for scripts because Next.js injects inline
 *    bootstrap scripts and we set the theme before first paint via an inline
 *    <script>; production Next does NOT need 'unsafe-eval'.
 *  - form-action is intentionally left unrestricted: real Razorpay payments
 *    redirect to arbitrary bank / 3-D Secure domains, and pinning it would
 *    break those flows.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.razorpay.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.razorpay.com https://lumberjack.razorpay.com",
  "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://*.razorpay.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Force HTTPS for two years, including subdomains (safe once on a custom domain).
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Allow the mic for voice questions on our own origin; deny the rest.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=(), browsing-topics=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["jsdom"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
