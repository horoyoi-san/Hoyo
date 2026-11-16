import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  reactStrictMode: false,
  poweredByHeader: false,
  compress: true,
  output: "standalone",
  outputFileTracingIncludes: {
    "/api/data/[name]": ["./data/**/*"],
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "localhost",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "cdn.punklorde.org",
        pathname: "**",
      }
    ],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  env: {
    CDN_URL: "https://cdn.punklorde.org/asbres",
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
