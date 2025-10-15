import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    "cedar-rational-middle-thanks.trycloudflare.com",
    "localhost",
    "127.0.0.1",
  ],
};

export default nextConfig;
