import mineflayer, { type Bot } from 'mineflayer';
import { pathfinder } from 'mineflayer-pathfinder';
import { Movements } from 'mineflayer-pathfinder';
import { goals } from 'mineflayer-pathfinder';
import { handleSimpleScriptCommand } from './simplescript.js';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { tool, ToolLoopAgent } from 'ai';
import z from 'zod';
import { Vec3 } from 'vec3';

const activeBots = new Map<string, Bot>();
const usefulBlockNames = new Set([
    'crafting_table', 'furnace', 'blast_furnace', 'smoker', 'ender_chest',
    'trapped_chest', 'barrel', 'hopper', 'dispenser', 'dropper',
    'brewing_stand', 'enchanting_table', 'grindstone', 'stonecutter',
    'smithing_table', 'loom', 'cartography_table', 'fletching_table',
    'lectern', 'composter', 'bell', 'jukebox', 'note_block', 'beacon',
    'respawn_anchor', 'campfire', 'soul_campfire', 'beehive', 'bee_nest',
    'cauldron', 'water_cauldron', 'lava_cauldron', 'powder_snow_cauldron', 'anvil',
]);
const storageContainerNames = new Set([
    'chest', 'trapped_chest', 'ender_chest', 'barrel', 'hopper', 'dispenser', 'dropper',
]);

function isUsefulInteractableBlock(name: string): boolean {
    return usefulBlockNames.has(name)
        || name === 'chest'
        || name.endsWith('_shulker_box')
        || name.endsWith('_anvil')
        || name.endsWith('_door')
        || name.endsWith('_trapdoor')
        || name.endsWith('_fence_gate')
        || name.endsWith('_button')
        || name.endsWith('_pressure_plate')
        || name.endsWith('_bed')
        || name === 'lever';
}

function isStorageContainerBlock(name: string): boolean {
    return storageContainerNames.has(name) || name.endsWith('_shulker_box');
}

export function createBot({
  PlayerName,
  serverPort,
  openRouterApiKey,
  openRouterBaseUrl,
  openRouterModel,
}: {
  PlayerName: string;
  serverPort: number;
  openRouterApiKey: string;
  openRouterBaseUrl: string;
  openRouterModel: string;
}): Bot {

    var aiMessages = [];
  const openRouterConfig = {
    apiKey: openRouterApiKey,
    baseURL: openRouterBaseUrl,
    model: openRouterModel,
  };
  const username = `${PlayerName.slice(0, 12)}_bot`;
  const key = username.toLowerCase();
  const existingBot = activeBots.get(key);
  if (existingBot) return existingBot;
  let followedPlayer: string | null = null;

  const bot = mineflayer.createBot({
    host: process.env.MINECRAFT_HOST ?? '127.0.0.1',
    port: serverPort,
    username,
    auth: 'offline',
  });
  const getConfiguredPlayer = () => Object.values(bot.players).find(
    (player) => player.username.toLowerCase() === PlayerName.toLowerCase(),
  );

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
    if (username.toLowerCase() !== PlayerName.toLowerCase()) return;
    if (message.startsWith(':')) {
      const [command, ...args] = message.split(' --');
      if (handleSimpleScriptCommand(bot, username, command ?? '', args, message)) return;
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
        case ':ai': {
            console.info(`[AI] Command received from ${username}.`);
            if (!openRouterApiKey || !openRouterBaseUrl || !openRouterModel) {
                console.warn(`[AI] Request from ${username} skipped: OpenRouter configuration is incomplete (key=${Boolean(openRouterApiKey)}, baseUrl=${Boolean(openRouterBaseUrl)}, model=${Boolean(openRouterModel)}).`);
                bot.chat('AI configuration not found, ask your server admin to configure it');
                return;
            }
            console.info(`[AI] Starting request for ${username} using model ${openRouterModel} at ${openRouterBaseUrl}.`);
            const openRouter = createOpenRouter({
                apiKey: openRouterApiKey,
                baseURL: openRouterBaseUrl,
            });
            const ai = new ToolLoopAgent({
                model: openRouter.chat(openRouterModel),
                instructions: `Your are a minecraft bot. you can use your tools to control the bot and interact with the game. Whenever you need to tell the user something, use the send_chat tool. Your regular responses will not be seen by the user. Your name is ${bot.username}, you are the bot for the user ${username}. You can use the chat tool between tools to tell the user what you are doing, be sure to keep the player informed of your progress. When using goTo, set blocking to true whenever a later action depends on the bot having arrived; this makes the tool wait until navigation finishes. Leave blocking false or unset when you can continue while the bot walks. When the user asks you to follow them, use followOn; use followOff to stop, and getFollowStatus to check the current state.`,
                tools: {
                    getOnlinePlayers: tool({
                        description: 'Get the list of online players',
                        inputSchema: z.object({}),
                        execute: () => {
                            return bot.players
                        },
                    }),
                    sendChat: tool({
                        description: 'Send a chat message',
                        inputSchema: z.object({
                            message: z.string(),
                        }),
                        execute: ({ message }) => {
                            bot.chat(message)
                            return `Sent message: ${message}`
                        },
                    }),
                    lookAt: tool({
                        description: 'Look at a specific position',
                        inputSchema: z.object({
                            x: z.number(),
                            y: z.number(),
                            z: z.number(),
                        }),
                        execute: ({ x, y, z }) => {
                            bot.lookAt(new Vec3(x, y, z))
                            return `Looked at position (${x}, ${y}, ${z})`
                        },
                    }),
                    goTo: tool({
                        description: 'Go to a specific position. Set blocking to true when a later action must wait until the bot arrives; otherwise the bot walks in the background.',
                        inputSchema: z.object({
                            x: z.number(),
                            y: z.number(),
                            z: z.number(),
                            blocking: z.boolean().optional().describe('Wait for navigation to finish before returning. Use true if the next action depends on arrival.'),
                        }),
                        execute: async ({ x, y, z, blocking }) => {
                            bot.pathfinder.setMovements(new Movements(bot));
                            const goal = new goals.GoalGetToBlock(x, y, z);
                            if (blocking) {
                                await bot.pathfinder.goto(goal);
                                return `Arrived at position (${x}, ${y}, ${z})`;
                            }
                            bot.pathfinder.setGoal(goal);
                            return `Going to position (${x}, ${y}, ${z})`;
                        },
                    }),
                    getPlayerPosition: tool({
                        description: 'Get the position of a player',
                        inputSchema: z.object({
                            username: z.string().describe('The username of the player'),
                        }),
                        execute: ({ username }) => {
                            const player = bot.players[username]
                            if (!player) {
                                return `Player ${username} not found`
                            }
                            return `Player ${username} is at position (${player.entity.position.x}, ${player.entity.position.y}, ${player.entity.position.z})`
                        },
                    }),
                    getInventory: tool({
                        description: 'Get the inventory of the bot',
                        inputSchema: z.object({}),
                        execute: () => {
                            return bot.inventory
                        },
                    }),
                    dropItem: tool({
                        description: 'Drop an item from the bot\'s inventory',
                        inputSchema: z.object({
                            item: z.string().describe('The name of the item to drop'),
                            count: z.number().default(1).describe('The number of items to drop'),
                        }),
                        execute: ({ item, count }) => {
                            const itemInstance = bot.inventory.items().find((i) => i.name === item);
                            if (!itemInstance) {
                                return `Item ${item} not found in inventory`
                            }
                            bot.toss(itemInstance.type, null, count)
                            return `Dropped item ${item}`
                        },
                    }),
                    getNearbyUsefulBlocks: tool({
                        description: 'Find nearby useful interactable blocks, including storage, workstations, furnaces, anvils, beds, doors, trapdoors, gates, buttons, and levers. Returns each block name and coordinates.',
                        inputSchema: z.object({}),
                        execute: () => {
                            const positions = bot.findBlocks({
                                matching: (block) => isUsefulInteractableBlock(block.name),
                                maxDistance: 128,
                                count: 64,
                            });
                            return positions.flatMap((position) => {
                                const block = bot.blockAt(position);
                                return block ? [{
                                    name: block.name,
                                    x: position.x,
                                    y: position.y,
                                    z: position.z,
                                }] : [];
                            });
                        },
                    }),
                    getContainerItems: tool({
                        description: 'List the contents of a nearby storage container at the given block coordinates. Use getNearbyUsefulBlocks to find its coordinates first.',
                        inputSchema: z.object({
                            x: z.number().int(),
                            y: z.number().int(),
                            z: z.number().int(),
                        }),
                        execute: async ({ x, y, z }) => {
                            const block = bot.blockAt(new Vec3(x, y, z));
                            if (!block || !isStorageContainerBlock(block.name)) {
                                return `No supported storage container found at (${x}, ${y}, ${z})`;
                            }
                            const container = await bot.openContainer(block);
                            try {
                                return container.containerItems().map((item) => ({
                                    name: item.name,
                                    count: item.count,
                                    slot: item.slot,
                                }));
                            } finally {
                                await container.close();
                            }
                        },
                    }),
                    putItemsInContainer: tool({
                        description: 'Move matching items from the bot inventory into a nearby storage container. If count is omitted, move all matching items.',
                        inputSchema: z.object({
                            x: z.number().int(),
                            y: z.number().int(),
                            z: z.number().int(),
                            item: z.string().describe('Exact item name, such as oak_planks'),
                            count: z.number().int().positive().optional().describe('Number of items to put in the container; omit to transfer all matching items.'),
                        }),
                        execute: async ({ x, y, z, item, count }) => {
                            const block = bot.blockAt(new Vec3(x, y, z));
                            if (!block || !isStorageContainerBlock(block.name)) {
                                return `No supported storage container found at (${x}, ${y}, ${z})`;
                            }
                            const stacks = bot.inventory.items().filter((stack) => stack.name === item);
                            if (!stacks.length) return `No ${item} in inventory`;
                            const requested = count ?? stacks.reduce((total, stack) => total + stack.count, 0);
                            const container = await bot.openContainer(block);
                            try {
                                let remaining = requested;
                                for (const stack of stacks) {
                                    if (remaining <= 0) break;
                                    const amount = Math.min(stack.count, remaining);
                                    await container.deposit(stack.type, stack.metadata, amount);
                                    remaining -= amount;
                                }
                                const transferred = requested - remaining;
                                return `Put ${transferred} ${item} in the container`;
                            } finally {
                                await container.close();
                            }
                        },
                    }),
                    takeItemsFromContainer: tool({
                        description: 'Move matching items from a nearby storage container into the bot inventory. If count is omitted, take all matching items.',
                        inputSchema: z.object({
                            x: z.number().int(),
                            y: z.number().int(),
                            z: z.number().int(),
                            item: z.string().describe('Exact item name, such as oak_planks'),
                            count: z.number().int().positive().optional().describe('Number of items to take from the container; omit to take all matching items.'),
                        }),
                        execute: async ({ x, y, z, item, count }) => {
                            const block = bot.blockAt(new Vec3(x, y, z));
                            if (!block || !isStorageContainerBlock(block.name)) {
                                return `No supported storage container found at (${x}, ${y}, ${z})`;
                            }
                            const container = await bot.openContainer(block);
                            try {
                                const stacks = container.containerItems().filter((stack) => stack.name === item);
                                if (!stacks.length) return `No ${item} in the container`;
                                const requested = count ?? stacks.reduce((total, stack) => total + stack.count, 0);
                                let remaining = requested;
                                for (const stack of stacks) {
                                    if (remaining <= 0) break;
                                    const amount = Math.min(stack.count, remaining);
                                    await container.withdraw(stack.type, stack.metadata, amount);
                                    remaining -= amount;
                                }
                                const transferred = requested - remaining;
                                return `Took ${transferred} ${item} from the container`;
                            } finally {
                                await container.close();
                            }
                        },
                    }),
                    playMusicDisc: tool({
                        description: 'Insert and play a music disc in a jukebox at the given block coordinates. If disc is omitted, use the first music disc in the bot inventory.',
                        inputSchema: z.object({
                            x: z.number().int(),
                            y: z.number().int(),
                            z: z.number().int(),
                            disc: z.string().optional().describe('Optional exact item name, such as music_disc_cat.'),
                        }),
                        execute: async ({ x, y, z, disc }) => {
                            const jukebox = bot.blockAt(new Vec3(x, y, z));
                            if (!jukebox || jukebox.name !== 'jukebox') {
                                return `No jukebox found at (${x}, ${y}, ${z})`;
                            }
                            const musicDisc = bot.inventory.items().find((item) =>
                                item.name.startsWith('music_disc_') && (!disc || item.name === disc),
                            );
                            if (!musicDisc) {
                                return disc ? `Music disc ${disc} not found in inventory` : 'No music disc found in inventory';
                            }
                            await bot.equip(musicDisc, 'hand');
                            await bot.activateBlock(jukebox);
                            return `Played ${musicDisc.name} in the jukebox at (${x}, ${y}, ${z})`;
                        },
                    }),
                    stopJukebox: tool({
                        description: 'Stop a jukebox by ejecting its music disc at the given block coordinates.',
                        inputSchema: z.object({
                            x: z.number().int(),
                            y: z.number().int(),
                            z: z.number().int(),
                        }),
                        execute: async ({ x, y, z }) => {
                            const jukebox = bot.blockAt(new Vec3(x, y, z));
                            if (!jukebox || jukebox.name !== 'jukebox') {
                                return `No jukebox found at (${x}, ${y}, ${z})`;
                            }
                            await bot.unequip('hand');
                            await bot.activateBlock(jukebox);
                            return `Stopped the jukebox and ejected its disc at (${x}, ${y}, ${z})`;
                        },
                    }),
                    followOn: tool({
                        description: 'Start following the player who owns this bot.',
                        inputSchema: z.object({}),
                        execute: () => {
                            const player = getConfiguredPlayer();
                            if (!player?.entity) return `Cannot find ${PlayerName} nearby to follow`;
                            bot.pathfinder.setMovements(new Movements(bot));
                            bot.pathfinder.setGoal(new goals.GoalFollow(player.entity, 2), true);
                            followedPlayer = player.username;
                            return `Now following ${player.username}`;
                        },
                    }),
                    followOff: tool({
                        description: 'Stop following the player who owns this bot.',
                        inputSchema: z.object({}),
                        execute: () => {
                            const goal = bot.pathfinder.goal;
                            const player = getConfiguredPlayer();
                            const isFollowingOwner = goal instanceof goals.GoalFollow
                                && (goal.entity.username?.toLowerCase() === PlayerName.toLowerCase()
                                    || (player?.entity && goal.entity.id === player.entity.id));
                            if (isFollowingOwner) {
                                bot.pathfinder.stop();
                            }
                            const previousTarget = isFollowingOwner ? followedPlayer ?? PlayerName : null;
                            followedPlayer = null;
                            return previousTarget ? `Stopped following ${previousTarget}` : 'The bot was not following a player';
                        },
                    }),
                    getFollowStatus: tool({
                        description: 'Check whether the bot is currently following its owner.',
                        inputSchema: z.object({}),
                        execute: () => {
                            const player = getConfiguredPlayer();
                            const goal = bot.pathfinder.goal;
                            if (followedPlayer && player?.entity && goal instanceof goals.GoalFollow && goal.entity.id === player.entity.id) {
                                return `Following ${player.username}${bot.pathfinder.isMoving() ? ' and moving' : ' and waiting for them to move'}`;
                            }
                            followedPlayer = null;
                            return 'Not currently following';
                        },
                    }),
                    getNearbyDroppedItems: tool({
                        description: 'List all dropped item stacks currently visible to the bot, including item names, counts, and coordinates.',
                        inputSchema: z.object({}),
                        execute: () => {
                            return Object.values(bot.entities).flatMap((entity) => {
                                const droppedItem = entity.getDroppedItem();
                                if (!droppedItem) return [];
                                return [{
                                    name: droppedItem.name,
                                    count: droppedItem.count,
                                    x: entity.position.x,
                                    y: entity.position.y,
                                    z: entity.position.z,
                                }];
                            });
                        },
                    }),
                    getNearbyEntities: tool({
                        description: 'List all entities currently visible to the bot, including players, mobs, dropped items, and their positions.',
                        inputSchema: z.object({}),
                        execute: () => {
                            if (!bot.entity) return [];
                            return Object.values(bot.entities).map((entity) => ({
                                id: entity.id,
                                type: entity.type,
                                name: entity.name ?? null,
                                username: entity.username ?? null,
                                mobType: entity.mobType ?? null,
                                x: entity.position.x,
                                y: entity.position.y,
                                z: entity.position.z,
                                distance: bot.entity.position.distanceTo(entity.position),
                            }));
                        },
                    }),
                    getHealth: tool({
                        description: 'Get the health of the bot',
                        inputSchema: z.object({}),
                        execute: () => {
                            return bot.health;
                        },
                    }),
                    getFood: tool({
                        description: 'Get the food level of the bot',
                        inputSchema: z.object({}),
                        execute: () => {
                            return bot.food;
                        },
                    }),
                },
            });
            aiMessages.push({
                role: 'user',
                content: args[0] ?? '',
            });
            void ai.stream({
                messages: aiMessages,
            }).then(async (result) => {
                for await (const part of result.stream) {
                    if (part.type === 'error') {
                        console.error(`[AI] Provider stream error for ${username}:`, part.error);
                    }
                }
                const assistantText = await result.text;
                aiMessages.push({
                    role: 'assistant',
                    content: assistantText,
                });
                console.info(`[AI] Request completed for ${username}.`);
            }).catch((error: unknown) => {
                console.error(`[AI] Provider request failed for ${username}:`, error);
                bot.chat('AI request failed. Check the server logs for details.');
            });
            break
        }
      }
    }
  });

  return bot;
}
