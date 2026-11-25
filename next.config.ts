import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fotos e PDFs de evidência sobem por server action.
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
};

export default nextConfig;
