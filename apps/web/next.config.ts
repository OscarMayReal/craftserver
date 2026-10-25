import type { NextConfig } from "next"
import path from "node:path"

const staticExport = process.env.CRAFTSERVER_STATIC_EXPORT === "1"

const nextConfig: NextConfig = {
  output: staticExport ? "export" : "standalone",
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
  transpilePackages: ["@workspace/ui"],
  ...(staticExport ? {} : {
    async rewrites() {
      return [
        {
          source: "/api/trpc/:path*",
          destination: `${process.env.TRPC_SERVER_URL ?? "http://localhost:3001/trpc"}/:path*`,
        },
        {
          source: "/api/files/archive",
          destination: `${(process.env.TRPC_SERVER_URL ?? "http://localhost:3001/trpc").replace(/\/trpc\/?$/, "")}/files/archive`,
        },
      ]
    },
  }),
}

export default nextConfig
