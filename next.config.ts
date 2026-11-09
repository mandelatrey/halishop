import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mongodb"],
  experimental: {
    // Product photos, logos and template backgrounds are saved as data URLs
    // through Server Actions. Photos are shrunk to <1 MB on upload
    // (lib/image-prep.ts); this leaves headroom for a product + logo/template.
    serverActions: { bodySizeLimit: "4mb" },
  },
  webpack: (config, { isServer }) => {
    // `serverExternalPackages` covers Server Components + Server Actions but
    // not the `instrumentation` entry. Without this, webpack tries to bundle
    // the `mongodb` driver into the boot hook and complains about Node's
    // built-in `net` module. Mark it external for every server-side build so
    // the driver is `require()`d at runtime instead of walked statically.
    if (isServer) {
      const externals = Array.isArray(config.externals)
        ? config.externals
        : config.externals
        ? [config.externals]
        : [];
      config.externals = [...externals, "mongodb"];
    }
    return config;
  },
};

export default nextConfig;
