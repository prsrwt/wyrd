import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root — a stray lockfile in the home directory otherwise
  // makes Next infer the wrong root. Built from process.cwd() rather than
  // fileURLToPath(import.meta.url): on Windows the latter can normalize the
  // drive letter to a different case (C:\ vs c:\) than Turbopack's internal
  // cwd-based path, which breaks root-matching and 404s every route.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
