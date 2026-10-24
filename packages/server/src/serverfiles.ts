import fs from "fs";
import { publicProcedure, router } from "./trpc";
import path from "path";
import { z } from "zod";

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
        const dataDirectory = path.resolve("./data");
        const source = path.resolve(dataDirectory, input.path);
        if (source === dataDirectory || !source.startsWith(`${dataDirectory}${path.sep}`)) {
            throw new Error("Invalid file path");
        }
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
