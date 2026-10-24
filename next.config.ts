import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Image optimisation needs a Cloudflare Images binding; guide images are already
  // re-encoded to WebP in the admin before upload, so serve them as-is.
  images: { unoptimized: true },
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();
