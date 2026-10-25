import { cpSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { gzipSync } from "node:zlib"

const root = process.cwd()
const staticWebSource = path.join(root, "apps/web/out")
const staticWebDestination = path.join(root, "dist/web")

function writeString(header: Buffer, value: string, start: number, length: number) {
  header.write(value, start, length, "utf8")
}

function writeOctal(header: Buffer, value: number, start: number, length: number) {
  writeString(header, `${value.toString(8).padStart(length - 1, "0")}\0`, start, length)
}

function tarHeader(name: string, size: number, mode: number, type: "0" | "5") {
  const header = Buffer.alloc(512)
  const parts = name.split("/")
  let baseName = name
  let prefix = ""
  if (Buffer.byteLength(name) > 100) {
    for (let index = 1; index < parts.length; index++) {
      const candidatePrefix = parts.slice(0, index).join("/")
      const candidateName = parts.slice(index).join("/")
      if (Buffer.byteLength(candidatePrefix) <= 155 && Buffer.byteLength(candidateName) <= 100) {
        prefix = candidatePrefix
        baseName = candidateName
        break
      }
    }
    if (!prefix) throw new Error(`Cannot represent long path in executable archive: ${name}`)
  }
  writeString(header, baseName, 0, 100)
  writeOctal(header, mode & 0o777, 100, 8)
  writeOctal(header, 0, 108, 8)
  writeOctal(header, 0, 116, 8)
  writeOctal(header, size, 124, 12)
  writeOctal(header, Math.floor(Date.now() / 1000), 136, 12)
  header.fill(32, 148, 156)
  writeString(header, type, 156, 1)
  writeString(header, "ustar\0", 257, 6)
  writeString(header, "00", 263, 2)
  writeString(header, prefix, 345, 155)
  const checksum = header.reduce((sum, byte) => sum + byte, 0)
  writeString(header, `${checksum.toString(8).padStart(6, "0")}\0 `, 148, 8)
  return header
}

function tarEntry(relativePath: string, absolutePath: string, ancestors = new Set<string>()): Buffer[] {
  const stats = lstatSync(absolutePath)
  if (stats.isSymbolicLink()) {
    const target = realpathSync(absolutePath)
    if (ancestors.has(target)) return []
    return tarEntry(relativePath, target, ancestors)
  }
  if (stats.isDirectory()) {
    const physicalDirectory = realpathSync(absolutePath)
    if (ancestors.has(physicalDirectory)) return []
    const descendants = new Set([...ancestors, physicalDirectory])
    return readdirSync(absolutePath).flatMap((entry) =>
      tarEntry(path.posix.join(relativePath, entry), path.join(absolutePath, entry), descendants),
    )
  }
  if (!stats.isFile()) return []

  const contents = readFileSync(absolutePath)
  const padding = Buffer.alloc((512 - (contents.length % 512)) % 512)
  return [tarHeader(relativePath, contents.length, stats.mode, "0"), contents, padding]
}

rmSync(path.join(root, "dist"), { recursive: true, force: true })
mkdirSync(path.dirname(staticWebDestination), { recursive: true })
cpSync(staticWebSource, staticWebDestination, { recursive: true })

const archiveParts = [tarHeader("web", 0, 0o755, "5")]
archiveParts.push(...readdirSync(staticWebDestination).flatMap((entry) =>
  tarEntry(path.posix.join("web", entry), path.join(staticWebDestination, entry)),
))
archiveParts.push(Buffer.alloc(1024))
const archivePath = path.join(root, "dist/web.tar.gz")
writeFileSync(archivePath, gzipSync(Buffer.concat(archiveParts), { level: 9 }))

const result = await Bun.build({
  entrypoints: ["tools/launcher.ts"],
  compile: {
    outfile: "dist/craftserver",
  },
})

if (!result.success) {
  for (const log of result.logs) console.error(log)
  process.exit(1)
}

rmSync(staticWebDestination, { recursive: true, force: true })
rmSync(archivePath, { force: true })
