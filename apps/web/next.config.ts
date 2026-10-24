import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
  async rewrites() {
    return [
      {
        source: "/api/trpc/:path*",
        destination: `${process.env.TRPC_SERVER_URL ?? "http://localhost:3001/trpc"}/:path*`,
      },
      {
        source: "/api/version_manifest.json",
        destination: "https://launchermeta.mojang.com/mc/game/version_manifest.json",
      }
    ]
  },
}

export default nextConfig
