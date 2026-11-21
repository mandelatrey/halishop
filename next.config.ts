import type { NextConfig } from "next";
import { withDomEditor } from "domeditor/next/config";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mongodb"],
  experimental: {
    serverActions: {
      // Images travel to Mongo as data URLs inside Server Action payloads.
      // The 1 MB default is too small for a storefront save carrying several
      // banner slides (each ~150–400 KB after lib/image-prep.ts downscales it).
      bodySizeLimit: "12mb",
    },
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

// withDomEditor: the dev-only visual CSS editor's route (app/api/dev/domeditor/route.dev.ts) exists
// only under `next dev`; see https://github.com/mandelatrey/domeditor
export default withDomEditor(nextConfig);
