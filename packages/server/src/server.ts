import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

// Bun's child_process shim returns a writable stdin stream without Node's
// setEncoding() method. minecraft-wrap calls it unconditionally, although it
// only writes strings to stdin, so provide the no-op compatibility method
// before loading the package.
if (typeof Bun !== "undefined" && typeof fs.WriteStream.prototype.setEncoding !== "function") {
    Object.defineProperty(fs.WriteStream.prototype, "setEncoding", {
        configurable: true,
        value() {
            return this;
        },
    });
}

const require = createRequire(import.meta.url);
const { download, WrapServer } = require("minecraft-wrap");

export const jarPath = path.resolve("./data/mcserver.jar");
export const serverPath = path.resolve("./data/mcserver");

const downloadPromise = (version: string, name: string) => new Promise<void>((resolve, reject) => {
    download(version, name, (error: Error | null) => {
        if (error) reject(error);
        else resolve();
    });
});

export function downloadServer(version: string): Promise<void> {
    return downloadPromise(version, jarPath);
}

export const server = new WrapServer(jarPath, serverPath);

const startedAtPath = path.resolve('./data/server-started-at');
let serverStartedAt: number | null = null;

export function getServerUptimeMs(): number | null {
    if (serverStartedAt === null) {
        try {
            const persistedStartedAt = Number(fs.readFileSync(startedAtPath, 'utf-8'));
            if (Number.isFinite(persistedStartedAt) && persistedStartedAt > 0) {
                serverStartedAt = persistedStartedAt;
            }
        } catch {
            try {
                // minecraft-wrap writes server.properties immediately before
                // launching Java, so its modification time is a useful
                // fallback when the API process restarted around the server.
                serverStartedAt = fs.statSync(path.resolve(serverPath, 'server.properties')).mtimeMs;
            } catch {
                return null;
            }
        }
    }

    return serverStartedAt === null ? null : Date.now() - serverStartedAt;
}

export function markServerStarted(): void {
    serverStartedAt = Date.now();
    fs.mkdirSync(path.dirname(startedAtPath), { recursive: true });
    fs.writeFileSync(startedAtPath, String(serverStartedAt));
}

export function markServerStopped(): void {
    serverStartedAt = null;
    fs.rmSync(startedAtPath, { force: true });
}
