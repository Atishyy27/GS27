import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // the 2023 GS27 site lives in public/2023 as plain files
  async redirects() {
    return [{ source: "/2023", destination: "/2023/index.html", permanent: false }];
  },
  /* config options here */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
