import mineflayer, { type Bot } from 'mineflayer';
import { pathfinder } from 'mineflayer-pathfinder';
import { Movements } from 'mineflayer-pathfinder';
import { goals } from 'mineflayer-pathfinder';

const activeBots = new Map<string, Bot>();

export function createBot({
  PlayerName,
  serverPort,
}: {
  PlayerName: string;
  serverPort: number;
}): Bot {
  const username = `${PlayerName.slice(0, 12)}_bot`;
  const key = username.toLowerCase();
  const existingBot = activeBots.get(key);
  if (existingBot) return existingBot;

  const bot = mineflayer.createBot({
    host: process.env.MINECRAFT_HOST ?? '127.0.0.1',
    port: serverPort,
    username,
    auth: 'offline',
  });

  bot.loadPlugin(pathfinder);

  activeBots.set(key, bot);
  let released = false;
  let spawned = false;
  const release = () => {
    if (released) return;
    released = true;
    if (activeBots.get(key) === bot) activeBots.delete(key);
  };

  bot.once('spawn', () => {
    spawned = true;
    console.log(`Bot ${username} spawned for ${PlayerName}.`);
  });
  bot.on('error', (error) => {
    console.error(`${username} connection error:`, error);
    if (!spawned) release();
  });
  bot.once('kicked', (reason) => {
    console.warn(`${username} was kicked:`, reason);
    release();
  });
  bot.once('end', () => {
    release();
    console.log(`Bot ${username} disconnected.`);
  });

  bot.on('chat', (username, message) => {
    if (username !== bot.username.split('_bot')[0]) return;
    if (message.startsWith(':')) {
      const [command, ...args] = message.split(' --');
      switch (command) {
        case ':navigateTo': {
            const target = bot.players[username]?.entity;
            if (!target) {
              bot.chat(`Player ${username} not found`);
              return;
            }
            bot.chat(`Navigating to ${username}`);
            bot.pathfinder.setMovements(new Movements(bot));
            const position = target.position;
            bot.pathfinder.setGoal(new goals.GoalNear(position.x, position.y, position.z, 1));
            break;
        }
        case ':stop': {
            bot.chat('Stopping navigation');
            bot.pathfinder.stop();
            break;
        }
        case ':goto': {
            const x = parseInt(args.find((arg) => arg.startsWith('x='))?.split('=')[1] || '0');
            const y = parseInt(args.find((arg) => arg.startsWith('y='))?.split('=')[1] || '0');
            const z = parseInt(args.find((arg) => arg.startsWith('z='))?.split('=')[1] || '0');
            if (isNaN(x) || isNaN(y) || isNaN(z)) {
                bot.chat('Invalid coordinates');
                return;
            }
            bot.chat(`Goto ${x}, ${y}, ${z}`);
            bot.pathfinder.setMovements(new Movements(bot));
            bot.pathfinder.setGoal(new goals.GoalNear(x, y, z, 1));
            break;
        }
        case ':ls': {
            const inventory = bot.inventory.items();
            const inventoryString = inventory.map((item, index) => `[${index + 1}] ${item.name} x${item.count}`).join('\n');
            bot.chat(`Inventory:\n${inventoryString}`);
            break
        }
        case ':drop': {
            if (args.length === 0) {
                bot.chat('No item specified');
                return;
            }
            const itemIndex = args.find((arg) => arg.startsWith('item='));
            const itemObj = bot.inventory.items().find((_, index) => index === parseInt(itemIndex?.split('=')[1] || '0') - 1);
            if (!itemObj) {
                bot.chat(`Item ${itemIndex} not found`);
                return;
            }
            bot.toss(itemObj.type, null, itemObj.count);
            break
        }
        case ':follow': {
            const target = bot.players[username]?.entity;
            if (!target) {
              bot.chat(`Player ${username} not found`);
              return;
            }
            bot.chat(`Following ${username}`);
            bot.pathfinder.setMovements(new Movements(bot));
            bot.pathfinder.setGoal(new goals.GoalFollow(target, 2), true);
            break
        }
      }
    }
  });

  return bot;
}
