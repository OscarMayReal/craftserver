import fs from 'node:fs';
import { z } from 'zod';
import { publicProcedure, router } from './trpc.js';
import { downloadServer, downloadSelectedMods, getLatestMinecraftRelease, getServerUptimeMs, installFabricServer, jarPath, markServerStarted, markServerStopped, server, serverPath } from './server.js';

export type Config = {
  serverName: string;
  serverMOTD: string;
  serverPort: number;
  maxPlayers: number;
  minecraftVersion: string;
  serverType: string;
  worldSeed: string;
  gameMode: string;
  difficulty: string;
  offlineMode: boolean;
  openRouterApiKey: string;
  openRouterBaseUrl: string;
  openRouterModel: string;
  accessMode: 'public' | 'private';
  allowedPlayers: string[];
  selectedMods: string[];
};

const serverConfigSchema = z.object({
  serverName: z.string(),
  serverMOTD: z.string(),
  serverPort: z.number(),
  maxPlayers: z.number().int().min(1).max(1000).default(20),
  minecraftVersion: z.string(),
  serverType: z.string(),
  worldSeed: z.string(),
  gameMode: z.string(),
  difficulty: z.string(),
  offlineMode: z.boolean().default(false),
  openRouterApiKey: z.string().default(''),
  openRouterBaseUrl: z.string().default('https://openrouter.ai/api/v1'),
  openRouterModel: z.string().default(''),
  accessMode: z.enum(['public', 'private']),
  allowedPlayers: z.array(z.string().regex(/^[A-Za-z0-9_]{1,16}$/)).default([]),
  selectedMods: z.array(z.string()),
});

export function readServerConfig(): Config {
  return serverConfigSchema.parse(JSON.parse(fs.readFileSync('./data/serverconfig.json', 'utf-8')));
}

function serverProperties(config: Config) {
  return {
    difficulty: config.difficulty.toLowerCase(),
    'enforce-whitelist': config.accessMode === 'public' ? 'false' : 'true',
    'force-gamemode': 'true',
    gamemode: config.gameMode.toLowerCase(),
    'level-seed': config.worldSeed,
    'max-players': config.maxPlayers,
    motd: config.serverMOTD,
    'online-mode': config.offlineMode ? 'false' : 'true',
    'query.port': config.serverPort,
    'server-port': config.serverPort,
    'white-list': config.accessMode === 'public' ? 'false' : 'true',
  };
}

const managedWhitelistPath = './data/managed-whitelist.json';

function readManagedWhitelist(): string[] {
  try {
    const entries: unknown = JSON.parse(fs.readFileSync(managedWhitelistPath, 'utf-8'));
    return Array.isArray(entries) ? entries.filter((entry): entry is string => typeof entry === 'string' && /^[A-Za-z0-9_]{1,16}$/.test(entry)) : [];
  } catch {
    return [];
  }
}

async function prepareConfiguredServer(config: Config): Promise<boolean> {
  const isFabric = config.serverType.toLowerCase() === 'fabric';
  if (isFabric) {
    await installFabricServer(config.minecraftVersion);
    await downloadSelectedMods(config.minecraftVersion, config.selectedMods);
  } else {
    await downloadServer(config.minecraftVersion);
  }
  return isFabric;
}

async function startConfiguredServer(config: Config): Promise<void> {
  const isFabric = await prepareConfiguredServer(config);
  return new Promise((resolve, reject) => {
    server.startServer(serverProperties(config), (error) => {
      if (error) reject(error);
      else {
        markServerStarted();
        void (async () => {
          const previouslyManaged = readManagedWhitelist();
          for (const username of previouslyManaged) await server.runCommand(`whitelist remove ${username}`);
          await server.runCommand(config.accessMode === 'private' ? 'whitelist on' : 'whitelist off');
          const managed = config.accessMode === 'private' ? [...new Set(config.allowedPlayers)] : [];
          if (config.accessMode === 'private') {
            for (const username of managed) await server.runCommand(`whitelist add ${username}`);
          }
          fs.mkdirSync('./data', { recursive: true });
          fs.writeFileSync(managedWhitelistPath, JSON.stringify(managed, null, 2));
          resolve();
        })().catch(reject);
      }
    }, isFabric);
  });
}

export async function startInstalledServer(): Promise<boolean> {
  const configPath = './data/serverconfig.json';
  if (!fs.existsSync(configPath)) return false;
  const config = readServerConfig();
  if (config.serverType.toLowerCase() === 'fabric'
    ? !fs.existsSync(`${serverPath}/fabric-server-launch.jar`)
    : !fs.existsSync(jarPath)) return false;

  await startConfiguredServer(config);
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
  })).mutation(async ({ input }) => {
    const reason = input.reason?.replace(/[\r\n]+/g, ' ').trim();
    await server.runCommand(`kick ${input.username}${reason ? ` ${reason}` : ''}`);
    return true;
  }),
  banPlayer: publicProcedure.input(z.object({
    username: z.string().regex(/^[A-Za-z0-9_]{1,16}$/),
    reason: z.string().max(200).optional(),
  })).mutation(async ({ input }) => {
    const reason = input.reason?.replace(/[\r\n]+/g, ' ').trim();
    await server.runCommand(`ban ${input.username}${reason ? ` ${reason}` : ''}`);
    return true;
  }),
  runCommand: publicProcedure.input(z.object({
    command: z.string().trim().min(1).max(256).refine((command) => !/[\r\n\0]/.test(command), 'Enter one command at a time'),
  })).mutation(async ({ input }) => {
    await server.runCommand(input.command);
    return true;
  }),
  opPlayer: publicProcedure.input(z.object({
    username: z.string().regex(/^[A-Za-z0-9_]{1,16}$/),
  })).mutation(async ({ input }) => {
    await server.runCommand(`op ${input.username}`);
    return true;
  }),
  initializeServer: publicProcedure.mutation(async () => {
    const config = readServerConfig();
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
  updateServer: publicProcedure.mutation(async () => {
    const config = readServerConfig();
    await new Promise<void>((resolve, reject) => {
      server.stopServer((error) => {
        if (error) reject(error);
        else {
          markServerStopped();
          resolve();
        }
      });
    });

    let configWasUpdated = false;
    try {
      const minecraftVersion = await getLatestMinecraftRelease();
      const updatedConfig = { ...config, minecraftVersion };
      await prepareConfiguredServer(updatedConfig);
      fs.writeFileSync('./data/serverconfig.json', JSON.stringify(updatedConfig, null, 2));
      configWasUpdated = true;
      await startConfiguredServer(updatedConfig);
      return { minecraftVersion };
    } catch (error) {
      if (!configWasUpdated) {
        try {
          await startConfiguredServer(config);
        } catch (restartError) {
          throw new Error(`Server update failed: ${error instanceof Error ? error.message : String(error)}. The previous server could not be restarted: ${restartError instanceof Error ? restartError.message : String(restartError)}`);
        }
      }
      throw error;
    }
  }),
  isServerConfigured: publicProcedure.query(() => {
    return fs.existsSync('./data/serverconfig.json');
  })
});

export default serverConfigRouter;
