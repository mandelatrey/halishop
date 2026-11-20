import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // Files named `*.dev.ts(x)` are routes only under `next dev`: the style editor's endpoint
  // (app/api/dev/style-editor/route.dev.ts), which writes CSS edits back into app/, never ships.
  pageExtensions: isDev ? ["dev.tsx", "dev.ts", "tsx", "ts", "jsx", "js"] : ["tsx", "ts", "jsx", "js"],
  serverExternalPackages: ["mongodb"],
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
