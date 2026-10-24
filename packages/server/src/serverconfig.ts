import fs from 'node:fs';
import { z } from 'zod';
import { publicProcedure, router } from './trpc.js';
import { downloadServer, getServerUptimeMs, jarPath, markServerStarted, markServerStopped, server } from './server.js';

type Config = {
  serverName: string;
  serverMOTD: string;
  serverPort: number;
  minecraftVersion: string;
  serverType: string;
  worldSeed: string;
  gameMode: string;
  difficulty: string;
  accessMode: 'public' | 'private';
  allowedPlayers: string[];
  selectedMods: string[];
};

const serverConfigSchema = z.object({
  serverName: z.string(),
  serverMOTD: z.string(),
  serverPort: z.number(),
  minecraftVersion: z.string(),
  serverType: z.string(),
  worldSeed: z.string(),
  gameMode: z.string(),
  difficulty: z.string(),
  accessMode: z.enum(['public', 'private']),
  allowedPlayers: z.array(z.string()),
  selectedMods: z.array(z.string()),
});

function readServerConfig(): Config {
  return serverConfigSchema.parse(JSON.parse(fs.readFileSync('./data/serverconfig.json', 'utf-8')));
}

function serverProperties(config: Config) {
  return {
    difficulty: config.difficulty.toLowerCase(),
    'enforce-whitelist': config.accessMode === 'public' ? 'false' : 'true',
    'force-gamemode': 'true',
    gamemode: config.gameMode.toLowerCase(),
    'level-seed': config.worldSeed,
    motd: config.serverMOTD,
    'query.port': config.serverPort,
    'server-port': config.serverPort,
    'white-list': config.accessMode === 'public' ? 'false' : 'true',
  };
}

function startConfiguredServer(config: Config): Promise<void> {
  return new Promise((resolve, reject) => {
    server.startServer(serverProperties(config), (error) => {
      if (error) reject(error);
      else {
        markServerStarted();
        resolve();
      }
    });
  });
}

export async function startInstalledServer(): Promise<boolean> {
  const configPath = './data/serverconfig.json';
  if (!fs.existsSync(configPath) || !fs.existsSync(jarPath)) return false;

  await startConfiguredServer(readServerConfig());
  return true;
}

const serverConfigRouter = router({
  get: publicProcedure.query(() => readServerConfig()),
  set: publicProcedure.input(serverConfigSchema).mutation(({ input }) => {
    fs.mkdirSync('./data', { recursive: true });
    fs.writeFileSync('./data/serverconfig.json', JSON.stringify(input, null, 2));
    return true;
  }),
  updateConfig: publicProcedure.input(serverConfigSchema.partial()).mutation(({ input }) => {
    const config = { ...readServerConfig(), ...input };
    fs.writeFileSync('./data/serverconfig.json', JSON.stringify(config, null, 2));
    return config;
  }),
  kickPlayer: publicProcedure.input(z.object({
    username: z.string().regex(/^[A-Za-z0-9_]{1,16}$/),
    reason: z.string().max(200).optional(),
  })).mutation(({ input }) => {
    const reason = input.reason?.replace(/[\r\n]+/g, ' ').trim();
    server.runCommand(`/kick ${input.username}${reason ? ` ${reason}` : ''}`);
    return true;
  }),
  initializeServer: publicProcedure.mutation(async () => {
    const config = readServerConfig();
    await downloadServer(config.minecraftVersion);
    await startConfiguredServer(config);
    return true;
  }),
  stopServer: publicProcedure.mutation(async () => {
    await new Promise<void>((resolve, reject) => {
      server.stopServer((error) => {
        if (error) reject(error);
        else {
          markServerStopped();
          resolve();
        }
      });
    });
    return true;
  }),
  startServer: publicProcedure.mutation(async () => {
    await startConfiguredServer(readServerConfig());
    return true;
  }),
  restartServer: publicProcedure.mutation(async () => {
    await new Promise<void>((resolve, reject) => {
      server.stopServer((error: Error | null) => {
        if (error) reject(error);
        else {
          markServerStopped();
          resolve();
        }
      });
    });
    await startConfiguredServer(readServerConfig());
    return true;
  }),
  isServerConfigured: publicProcedure.query(() => {
    return fs.existsSync('./data/serverconfig.json');
  })
});

export default serverConfigRouter;
