import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
  },
  // The pages and API routes read data/*.json at runtime with fs, from a path
  // built at runtime that Next's tracer can't follow. Include the files
  // explicitly so they ship inside the Vercel serverless functions — otherwise
  // /print and /evidence come up empty in production.
  outputFileTracingIncludes: {
    "/print": ["./data/**"],
    "/evidence": ["./data/**"],
    "/api/level": ["./data/**"],
    "/api/baseline": ["./data/**"],
  },
};

export default nextConfig;
