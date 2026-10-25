# CraftServer
A simple Minecraft server manager

## Setup
make sure you have a JDK installed (e.g. Temurin)
> this can be easily done with homebrew on macOS: `brew install --cask temurin`

## Build and run

Run `bun run build` to build and type-check the web app and server packages.

Run `bun run package:binary` to create one self-contained Bun executable at `dist/craftserver` (Windows builds use `dist/craftserver.exe`). It embeds the web app and Bun runtime, then refreshes the extracted web files under `.craftserver-runtime` when it starts. Server files and Minecraft data are stored relative to the current directory, so run it from the directory where you want to keep its data. A JDK is still required for Minecraft server operations.

The executable listens on port `3000` for the web app and `3001` for the tRPC server. Set `WEB_PORT` or `TRPC_PORT` to change those ports. Build it on each target OS and architecture.

## Server Bot
When the server is in offline mode, a player can spawn a bot for themselves with `:spawnbot`. The bot responds to commands sent by that player in game.

### Bot commands

| Command | Description |
| --- | --- |
| `:spawnbot` | Spawn your bot. Requires offline mode. |
| `:navigateTo` | Navigate to your current position. |
| `:follow` | Follow you. |
| `:stop` | Stop the bot's current navigation. |
| `:goto --x=100 --y=64 --z=-20` | Navigate near the given coordinates. |
| `:ls` | List the bot's inventory. |
| `:drop --item=1` | Drop the inventory item at the given 1-based list position. |

### SimpleScript commands

SimpleScript commands are sent in game. Separate script steps with semicolons (`;`). A script runs each step in order and waits for each movement goal to finish before continuing.

| Command | Description |
| --- | --- |
| `:simplescript --chat=Hello` | Run a script directly. |
| `:ss-write --file=welcome --script=chat=Hello;wait=1000;chat=Goodbye` | Save a script. Saving under an existing name edits it. |
| `:ss-ls` | List your saved scripts. |
| `:ss-run --file=welcome` | Run one of your saved scripts. |
| `:ss-delete --file=welcome` | Delete one of your saved scripts. |

Scripts are stored separately for each player. Script names may contain letters, numbers, spaces, underscores, and hyphens, up to 32 characters.

#### Script steps

| Step | Example | Description |
| --- | --- | --- |
| `goto=x,y,z` | `goto=100,64,-20` | Move near coordinates. |
| `gotoplayer=name` | `gotoplayer=Alex` | Move near an online player. |
| `chat=message` | `chat=Hello there` | Send a chat message. |
| `wait=milliseconds` | `wait=1000` | Pause for the given number of milliseconds. |
| `setvar=name,value` | `setvar=greeting,Hello` | Set a text or numeric variable. `setvar=name=value` is also accepted. |
| `saveloc=x,y,z` | `saveloc=startX,startY,startZ` | Save the bot's current coordinates in three variables. |
| `checkstandingblock=blockname,var` | `checkstandingblock=grass_block,onGrass` | Set `var` to `true` if the block under the bot matches, otherwise `false`. |
| `modvar=name,operator,value` | `modvar=startX,+,10` | Add, subtract, multiply, or divide a numeric variable using `+`, `-`, `*`, or `/`. |
| `if=condition` | `if=ready==true` | Start a conditional block. |
| `else` | `else` | Start the alternative branch of an `if` block. |
| `endif` | `endif` | End an `if` block. |
| `while=condition` | `while=count<3` | Repeat a block while its condition is true. Loops stop after 100 iterations. |
| `endwhile` | `endwhile` | End a `while` block. |

Insert variable values with `${name}`. For example, `setvar=greeting,Hello;chat=${greeting}` sends `Hello` in chat. This script saves the current position, offsets the X coordinate by 10, then moves to the resulting coordinates:

```text
saveloc=x,y,z;modvar=x,+,10;goto=${x},${y},${z}
```

Set booleans with `setvar=ready,true` or `setvar=ready,false`. Conditions can check a boolean variable directly (for example, `if=ready`) or compare values with `==`, `!=`, `<`, `<=`, `>`, and `>=`. Ordered comparisons require numbers. Blocks can be nested; each `if` needs `endif`, and each `while` needs `endwhile`.

```text
setvar=ready,true;if=ready;chat=Ready;else;chat=Not ready;endif
setvar=count,0;while=count<3;chat=${count};modvar=count,+,1;endwhile
```

## AI

the server bot can be controlled by an AI using the `:ai` command. The AI will respond to commands sent by the player in game.

the format for these commands is ":ai --Your message here"

The tools it has access to are:

- getOnlinePlayers: Get the list of online players
- sendChat: Send a chat message
- lookAt: Look at a specific position
- goTo: Go to a specific position. Set blocking to true when a later action must wait until the bot arrives; otherwise the bot walks in the background.
- getPlayerPosition: Get the position of a player
- getInventory: Get the inventory of the bot
- dropItem: Drop an item from the bot's inventory
- getNearbyUsefulBlocks: Find nearby useful interactable blocks, including storage, workstations, furnaces, anvils, beds, doors, trapdoors, gates, buttons, and levers.
- getContainerItems: List the contents of a nearby storage container at the given block coordinates. Use getNearbyUsefulBlocks to find its coordinates first.
- putItemsInContainer: Move matching items from the bot inventory into a nearby storage container. If count is omitted, move all matching items.
- takeItemsFromContainer: Move matching items from a nearby storage container into the bot inventory. If count is omitted, take all matching items.
- playMusicDisc: Insert and play a music disc in a jukebox at the given block coordinates. If disc is omitted, use the first music disc in the bot inventory.
- stopJukebox: Stop a jukebox by ejecting its music disc at the given block coordinates.
- followOn: Start following the player who owns this bot.
- followOff: Stop following the player who owns this bot.
- getFollowStatus: Check whether the bot is currently following its owner.
- getNearbyDroppedItems: List all dropped item stacks currently visible to the bot, including item names, counts, and coordinates.
- getNearbyEntities: List all entities currently visible to the bot, including players, mobs, dropped items, and their positions.
- getHealth: Get the health of the bot
- getFood: Get the food level of the bot
