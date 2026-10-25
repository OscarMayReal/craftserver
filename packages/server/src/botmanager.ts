import { createBot } from '@workspace/bot';
import { readServerConfig } from './serverconfig.js';
import { server } from './server.js';

server.onChat(({ player, message }) => {
  if (message.trim() !== ':spawnbot' || player.toLowerCase().endsWith('_bot')) return;
  console.log(`Received :spawnbot from ${player}.`);

  try {
    const config = readServerConfig();
    if (!config.offlineMode) {
      console.warn(`Cannot spawn a bot for ${player}: player-named bots require offline mode.`);
      return;
    }

    const username = `${player.slice(0, 12)}_bot`;
    const spawn = () => createBot({
      PlayerName: player,
      serverPort: config.serverPort,
      openRouterApiKey: config.openRouterApiKey,
      openRouterBaseUrl: config.openRouterBaseUrl,
      openRouterModel: config.openRouterModel,
    });

    if (config.accessMode === 'private') {
      void server.runCommand(`whitelist add ${username}`)
        .then(spawn)
        .catch((error: unknown) => console.error(`Could not whitelist ${username}:`, error));
    } else {
      spawn();
    }
  } catch (error) {
    console.error(`Could not spawn a bot for ${player}:`, error);
  }
});
