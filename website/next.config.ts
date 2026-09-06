import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // This site lives in a subfolder of the main SpendTr repo, which has its
  // own lockfile — pin the tracing root to this folder so Next doesn't try
  // to infer (and warn about) the monorepo-style root.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
