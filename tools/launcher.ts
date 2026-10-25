import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { gunzipSync } from "node:zlib"
import path from "node:path"
import embeddedArchive from "../dist/web.tar.gz" with { type: "file" }

if (Bun.isStandaloneExecutable) {
  process.chdir(path.dirname(path.resolve(process.execPath)))
}

const runtimeDirectory = path.resolve(process.env.CRAFTSERVER_RUNTIME_DIR ?? ".craftserver-runtime")
const webDirectory = path.join(runtimeDirectory, "web")

function readTarString(header: Buffer, start: number, length: number) {
  return header.subarray(start, start + length).toString("utf8").replace(/\0.*$/s, "")
}

function readTarNumber(header: Buffer, start: number, length: number) {
  return Number.parseInt(readTarString(header, start, length).trim() || "0", 8)
}

function extractWebFiles() {
  rmSync(webDirectory, { recursive: true, force: true })
  mkdirSync(runtimeDirectory, { recursive: true })

  const archive = gunzipSync(readFileSync(embeddedArchive))
  let offset = 0
  let extendedPath = ""
  while (offset + 512 <= archive.length) {
    const header = archive.subarray(offset, offset + 512)
    if (header.every((byte) => byte === 0)) break

    const size = readTarNumber(header, 124, 12)
    const type = readTarString(header, 156, 1)
    const name = [readTarString(header, 345, 155), readTarString(header, 0, 100)]
      .filter(Boolean)
      .join("/")
    const entryPath = extendedPath || name
    extendedPath = ""
    const targetPath = path.resolve(runtimeDirectory, entryPath)
    if (targetPath !== runtimeDirectory && !targetPath.startsWith(`${runtimeDirectory}${path.sep}`)) {
      throw new Error(`Invalid path in embedded web runtime: ${entryPath}`)
    }

    const dataStart = offset + 512
    const data = archive.subarray(dataStart, dataStart + size)
    if (type === "x") {
      let cursor = 0
      while (cursor < data.length) {
        const space = data.indexOf(32, cursor)
        const recordLength = Number.parseInt(data.subarray(cursor, space).toString("ascii"), 10)
        const record = data.subarray(space + 1, cursor + recordLength - 1).toString("utf8")
        if (record.startsWith("path=")) extendedPath = record.slice(5)
        cursor += recordLength
      }
    } else if (type !== "5") {
      mkdirSync(path.dirname(targetPath), { recursive: true })
      writeFileSync(targetPath, data, { mode: readTarNumber(header, 100, 8) || 0o644 })
    }

    offset = dataStart + Math.ceil(size / 512) * 512
  }
}

async function proxyRequest(request: Request, target: URL) {
  return fetch(new Request(target, request))
}

function serveStaticFile(pathname: string) {
  const relativePath = decodeURIComponent(pathname).replace(/^\/+|\/+$/g, "")
  const directPath = path.resolve(webDirectory, relativePath)
  if (directPath !== webDirectory && !directPath.startsWith(`${webDirectory}${path.sep}`)) {
    return new Response("Not found", { status: 404 })
  }

  const candidates = [
    directPath,
    `${directPath}.html`,
    path.join(directPath, "index.html"),
    path.join(webDirectory, "404.html"),
  ]
  const filePath = candidates.find((candidate) => {
    try { return statSync(candidate).isFile() } catch { return false }
  })
  if (!filePath) return new Response("Not found", { status: 404 })
  return new Response(Bun.file(filePath), { status: filePath.endsWith("404.html") ? 404 : 200 })
}

extractWebFiles()
const { startServerApp } = await import("../packages/server/src/app.ts")
startServerApp()

const backendUrl = new URL(process.env.TRPC_SERVER_URL ?? `http://localhost:${process.env.TRPC_PORT ?? "3001"}/trpc`)
const webPort = Number(process.env.WEB_PORT ?? 3000)
Bun.serve({
  port: webPort,
  hostname: process.env.WEB_HOST ?? "0.0.0.0",
  async fetch(request) {
    const url = new URL(request.url)
    if (url.pathname.startsWith("/api/trpc/")) {
      const target = new URL(backendUrl)
      target.pathname = `${backendUrl.pathname.replace(/\/$/, "")}${url.pathname.slice("/api/trpc".length)}`
      target.search = url.search
      return proxyRequest(request, target)
    }
    if (url.pathname === "/api/files/archive") {
      const target = new URL(backendUrl)
      target.pathname = `${backendUrl.pathname.replace(/\/trpc\/?$/, "")}/files/archive`
      target.search = url.search
      return proxyRequest(request, target)
    }
    return serveStaticFile(url.pathname)
  },
})

console.log(`CraftServer web app listening on http://${process.env.WEB_HOST ?? "0.0.0.0"}:${webPort}`)
