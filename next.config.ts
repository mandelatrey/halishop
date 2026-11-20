import type { NextConfig } from "next";
import { withDomEditor } from "domeditor/next/config";

const nextConfig: NextConfig = {
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

// withDomEditor: the dev-only visual CSS editor's route (app/api/dev/domeditor/route.dev.ts) exists
// only under `next dev`; see https://github.com/mandelatrey/domeditor
export default withDomEditor(nextConfig);
