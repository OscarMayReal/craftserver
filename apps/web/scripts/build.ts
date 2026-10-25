import { spawnSync } from "node:child_process"

process.env.CRAFTSERVER_STATIC_EXPORT = "1"

const result = spawnSync(
  "bun",
  ["node_modules/next/dist/bin/next", "build", "--webpack"],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  },
)

if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)
