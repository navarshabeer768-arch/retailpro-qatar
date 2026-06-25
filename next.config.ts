import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  // GitHub Pages serves the app at /retailpro-qatar
  basePath: isProd ? "/retailpro-qatar" : "",
  assetPrefix: isProd ? "/retailpro-qatar/" : "",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
