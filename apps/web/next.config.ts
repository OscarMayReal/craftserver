import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
  async rewrites() {
    return [
      {
        source: "/api/trpc/:path*",
        destination: `${process.env.TRPC_SERVER_URL ?? "http://localhost:3001/trpc"}/:path*`,
      },
    ]
  },
}

export default nextConfig
