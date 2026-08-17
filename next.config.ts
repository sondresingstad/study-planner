import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Course documents can be several MB (PDFs/xlsx); the default 1mb limit
      // only applies to Server Action form submissions, but we set it
      // generously anyway since small metadata forms also go through actions.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
