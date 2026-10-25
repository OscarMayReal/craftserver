import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { publicProcedure, router } from './trpc.js';
import { readServerConfig } from './serverconfig.js';
import { serverPath } from './server.js';

const modsPath = path.join(serverPath, 'mods');
const modFilename = z.string().min(5).max(255).regex(/^[A-Za-z0-9._ -]+\.jar$/i, 'Mod files must be .jar files');

function ensureModdedServer() {
  if (readServerConfig().serverType.toLowerCase() !== 'fabric') {
    throw new Error('Mod management is only available for Fabric servers');
  }
}

const modsRouter = router({
  list: publicProcedure.query(() => {
    ensureModdedServer();
    if (!fs.existsSync(modsPath)) return [];
    return fs.readdirSync(modsPath, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.jar'))
      .map((entry) => {
        const stats = fs.statSync(path.join(modsPath, entry.name));
        return { name: entry.name, size: stats.size, modified: stats.mtime };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }),
  upload: publicProcedure.input(z.object({
    filename: modFilename,
    contentBase64: z.string().min(1).max(90_000_000),
  })).mutation(({ input }) => {
    ensureModdedServer();
    fs.mkdirSync(modsPath, { recursive: true });
    fs.writeFileSync(path.join(modsPath, input.filename), Buffer.from(input.contentBase64, 'base64'), { flag: 'w' });
    return true;
  }),
  delete: publicProcedure.input(z.object({ filename: modFilename })).mutation(({ input }) => {
    ensureModdedServer();
    const target = path.join(modsPath, input.filename);
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) throw new Error('Mod file not found');
    fs.rmSync(target);
    return true;
  }),
});

export default modsRouter;
