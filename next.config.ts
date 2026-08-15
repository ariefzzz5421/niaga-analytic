import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.shopee.co.id" },
      { protocol: "https", hostname: "**.susercontent.com" },
      { protocol: "https", hostname: "**.tiktokcdn.com" },
      { protocol: "https", hostname: "**.tiktokcdn-us.com" },
      { protocol: "https", hostname: "**.tokopedia.net" },
      { protocol: "https", hostname: "**.blibli.com" },
    ],
  },
};

export default nextConfig;
