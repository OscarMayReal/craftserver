import fs from "fs";
import { publicProcedure, router } from "./trpc";
import path from "path";
import { z } from "zod";
import { deflateRawSync } from "zlib";

function resolveDataPath(inputPath: string) {
    const dataDirectory = path.resolve("./data");
    const source = path.resolve(dataDirectory, inputPath);
    if (source === dataDirectory || !source.startsWith(`${dataDirectory}${path.sep}`)) {
        throw new Error("Invalid file path");
    }
    return source;
}

function crc32(buffer: Buffer): number {
    let crc = 0xffffffff;
    for (const byte of buffer) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function zipDirectory(directory: string, archiveRoot: string): Buffer {
    const localEntries: Buffer[] = [];
    const centralEntries: Buffer[] = [];
    let offset = 0;
    const addFile = (filePath: string) => {
        const data = fs.readFileSync(filePath);
        const compressed = deflateRawSync(data);
        const name = Buffer.from(path.posix.join(archiveRoot, path.relative(directory, filePath).split(path.sep).join("/")), "utf8");
        const checksum = crc32(data);
        const local = Buffer.alloc(30 + name.length);
        local.writeUInt32LE(0x04034b50, 0);
        local.writeUInt16LE(20, 4);
        local.writeUInt16LE(0x0800, 6);
        local.writeUInt16LE(8, 8);
        local.writeUInt32LE(checksum, 14);
        local.writeUInt32LE(compressed.length, 18);
        local.writeUInt32LE(data.length, 22);
        local.writeUInt16LE(name.length, 26);
        name.copy(local, 30);
        localEntries.push(local, compressed);

        const central = Buffer.alloc(46 + name.length);
        central.writeUInt32LE(0x02014b50, 0);
        central.writeUInt16LE(20, 4);
        central.writeUInt16LE(20, 6);
        central.writeUInt16LE(0x0800, 8);
        central.writeUInt16LE(8, 10);
        central.writeUInt32LE(checksum, 16);
        central.writeUInt32LE(compressed.length, 20);
        central.writeUInt32LE(data.length, 24);
        central.writeUInt16LE(name.length, 28);
        central.writeUInt32LE(offset, 42);
        name.copy(central, 46);
        centralEntries.push(central);
        offset += local.length + compressed.length;
    };
    const walk = (current: string) => {
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
            const fullPath = path.join(current, entry.name);
            if (entry.isDirectory()) walk(fullPath);
            else if (entry.isFile()) addFile(fullPath);
        }
    };
    walk(directory);
    const centralDirectory = Buffer.concat(centralEntries);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(centralEntries.length, 8);
    end.writeUInt16LE(centralEntries.length, 10);
    end.writeUInt32LE(centralDirectory.length, 12);
    end.writeUInt32LE(offset, 16);
    return Buffer.concat([...localEntries, centralDirectory, end]);
}

export function createFolderArchive(inputPath: string): { name: string; data: Buffer } {
    const source = resolveDataPath(inputPath);
    if (!fs.statSync(source).isDirectory()) throw new Error("The requested path is not a folder");
    const name = path.basename(source);
    return { name, data: zipDirectory(source, name) };
}

const serverFilesRouter = router({
    list: publicProcedure
    .input(z.object({
        path: z.string().optional(),
    }))
    .query(({ input }) => {
        return fs.readdirSync(path.join("./data", input.path || "")).map(file => {
            const stats = fs.statSync(path.join("./data", input.path || "", file))
            return {
                name: file,
                isDirectory: stats.isDirectory(),
                size: stats.size,
                modified: stats.mtime,
            }
        });
    }),
    getContent: publicProcedure
    .input(z.object({
        path: z.string(),
    }))
    .query(({ input }) => {
        return fs.readFileSync(path.join("./data", input.path), "utf-8");
    }),
    download: publicProcedure
    .input(z.object({
        path: z.string(),
    }))
    .query(({ input }) => {
        const source = resolveDataPath(input.path);
        if (!fs.statSync(source).isFile()) throw new Error("The requested path is not a file");
        return fs.readFileSync(source).toString("base64");
    }),
    delete: publicProcedure
    .input(z.object({
        path: z.string(),
    }))
    .mutation(({ input }) => {
        fs.rmSync(path.join("./data", input.path));
        return true;
    }),
    upload: publicProcedure
    .input(z.object({
        path: z.string(),
        contentBase64: z.string(),
    }))
    .mutation(({ input }) => {
        const dataDirectory = path.resolve("./data");
        const destination = path.resolve(dataDirectory, input.path);
        if (destination === dataDirectory || !destination.startsWith(`${dataDirectory}${path.sep}`)) {
            throw new Error("Invalid file path");
        }
        fs.writeFileSync(destination, Buffer.from(input.contentBase64, "base64"));
        return true;
    }),
    createDirectory: publicProcedure
    .input(z.object({
        path: z.string()
    }))
    .mutation(({input}) => {
        fs.mkdirSync(path.join("./data", input.path))
        return true;
    })
});

export default serverFilesRouter;
