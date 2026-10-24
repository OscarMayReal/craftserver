import fs from "node:fs";
import { execFile, spawn, type ChildProcess } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { promisify } from "node:util";

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
const { download } = require("minecraft-wrap");

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

type ServerCallback = (error: Error | null) => void;
let mcServer: ChildProcess | null = null;
const execFileAsync = promisify(execFile);
const pidPath = path.resolve(serverPath, 'mcserver.pid');

async function findMinecraftPid(port?: number): Promise<number | null> {
    try {
        const args = port === undefined ? ['-t', '-c', 'java'] : [`-tiTCP:${port}`, '-sTCP:LISTEN'];
        const { stdout } = await execFileAsync('lsof', args);
        for (const value of stdout.trim().split(/\s+/)) {
            const pid = Number(value);
            if (!Number.isInteger(pid) || pid <= 0) continue;
            const { stdout: command } = await execFileAsync('ps', ['-p', String(pid), '-o', 'command=']);
            if (command.includes(jarPath) || command.includes(serverPath)) return pid;
        }
    } catch {
        // lsof is not available on every platform; managed child processes
        // can still be stopped directly below.
    }
    return null;
}

function isProcessAlive(pid: number): boolean {
    try { process.kill(pid, 0); return true; } catch { return false; }
}

// minecraft-wrap 1.10.0 puts -Xms/-Xmx after `-jar`, where Java interprets
// them as the jar filename. Keep its downloader, but launch the server with
// JVM options in the correct position.
export const server = {
    runCommand(command: string) {
        if (!mcServer || !mcServer.stdin || mcServer.stdin.destroyed) {
            throw new Error('Minecraft server process is not available for commands');
        }
        mcServer.stdin.write(`${command}\n`);
    },
    startServer(properties: Record<string, string | number | boolean>, done: ServerCallback) {
        if (mcServer) return done(new Error("Minecraft server is already running"));

        fs.mkdirSync(serverPath, { recursive: true });
        const defaults: Record<string, string | number | boolean> = {
            'generator-settings': '', 'op-permission-level': '4', 'allow-nether': 'true',
            'level-name': 'world', 'enable-query': 'false', 'allow-flight': 'false',
            'announce-player-achievements': true, 'server-port': '25565', 'level-type': 'DEFAULT',
            'enable-rcon': 'false', 'force-gamemode': 'false', 'level-seed': '', 'server-ip': '',
            'max-build-height': '256', 'spawn-npcs': 'true', 'white-list': 'false',
            'spawn-animals': 'true', hardcore: 'false', 'snooper-enabled': 'true',
            'online-mode': 'true', 'resource-pack': '', pvp: 'true', difficulty: '1',
            'enable-command-block': 'false', gamemode: '0', 'player-idle-timeout': '0',
            'max-players': '20', 'spawn-monsters': 'true', 'generate-structures': 'true',
            'view-distance': '10', 'spawn-protection': '16', motd: 'A Minecraft Server',
            'use-native-transport': 'false',
        };
        const merged = { ...defaults, ...properties };
        const port = Number(merged['server-port'] ?? 25565);
        void findMinecraftPid(port).then((existingPid) => {
            if (existingPid && isProcessAlive(existingPid)) {
                fs.writeFileSync(pidPath, String(existingPid));
                return done(null);
            }
            launchServer(merged, done);
        }).catch(done);
    },
    stopServer(done: ServerCallback) {
        const child = mcServer;
        if (!child) {
            let pid: number | null = null;
            try {
                const persistedPid = Number(fs.readFileSync(pidPath, 'utf8'));
                if (Number.isInteger(persistedPid) && persistedPid > 0) pid = persistedPid;
            } catch { /* no persisted process */ }
            void (async () => {
                if (!pid) pid = await findMinecraftPid();
                if (!pid || !isProcessAlive(pid)) {
                    try { fs.rmSync(pidPath, { force: true }); } catch { /* ignore */ }
                    return done(null);
                }
                const processId = pid;
                const { stdout: command } = await execFileAsync('ps', ['-p', String(processId), '-o', 'command=']);
                if (!command.includes(jarPath) && !command.includes(serverPath)) {
                    fs.rmSync(pidPath, { force: true });
                    return done(new Error('Refusing to stop a process that is not this Minecraft server'));
                }
                process.kill(processId, 'SIGTERM');
                const deadline = Date.now() + 15_000;
                const poll = () => {
                    if (!isProcessAlive(processId)) {
                        fs.rmSync(pidPath, { force: true });
                        return done(null);
                    }
                    if (Date.now() >= deadline) {
                        try { process.kill(processId, 'SIGKILL'); } catch { /* process exited */ }
                        fs.rmSync(pidPath, { force: true });
                        return done(null);
                    }
                    setTimeout(poll, 250);
                };
                poll();
            })().catch(done);
            return;
        }
        if (!child.stdin || child.stdin.destroyed) {
            child.kill();
        } else {
            child.stdin.write('stop\n');
        }
        const timeout = setTimeout(() => child.kill(), 10_000);
        child.once('close', () => {
            clearTimeout(timeout);
            if (mcServer === child) mcServer = null;
            fs.rmSync(pidPath, { force: true });
            done(null);
        });
        child.once('error', (error) => {
            clearTimeout(timeout);
            done(error);
        });
    },
};

function launchServer(merged: Record<string, string | number | boolean>, done: ServerCallback) {
        fs.writeFileSync(path.join(serverPath, 'server.properties'), Object.entries(merged).map(([key, value]) => `${key}=${value}\n`).join(''));
        fs.writeFileSync(path.join(serverPath, 'eula.txt'), 'eula=true');
        for (const filename of ['banned-players.json', 'banned-ips.json', 'ops.json', 'whitelist.json']) {
            if (!fs.existsSync(path.join(serverPath, filename))) fs.writeFileSync(path.join(serverPath, filename), '[]');
        }

        const child = spawn('java', ['-Xms1024M', '-Xmx1024M', '-jar', jarPath, 'nogui'], {
            cwd: serverPath, stdio: 'pipe',
        });
        mcServer = child;
        let output = '';
        let settled = false;
        const finish = (error: Error | null) => {
            if (settled) return;
            settled = true;
            done(error);
        };
        const onOutput = (chunk: Buffer | string) => {
            output += chunk.toString();
            if (/\[.+\]: Done/.test(output)) finish(null);
            if (/FAILED TO BIND TO PORT/.test(output)) finish(new Error('failed to bind to port'));
            if (output.length > 16_384) output = output.slice(-8_192);
        };
        child.stdout?.on('data', onOutput);
        child.stderr?.on('data', onOutput);
        child.on('error', (error) => { mcServer = null; finish(error); });
        child.on('close', (code) => {
            mcServer = null;
            if (!settled) finish(new Error(`Minecraft server exited before becoming ready (code ${code})${output ? `: ${output.slice(-2000)}` : ''}`));
        });
        child.once('spawn', () => fs.writeFileSync(pidPath, String(child.pid)));
}

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
