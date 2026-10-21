import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Catalogue validation needs the original query before Next drops special keys.
  skipProxyUrlNormalize: true,
};

export default nextConfig;
