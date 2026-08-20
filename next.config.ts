import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (via pdfjs-dist) needs native Node.js require rather than
  // Next's Server Components bundling, or it can't locate its worker
  // module at runtime — see src/lib/parsers/pdf.ts.
  serverExternalPackages: ["pdf-parse"],
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
