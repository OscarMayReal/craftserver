# CraftServer
A simple Minecraft server manager

## Setup
make sure you have a JDK installed (e.g. Temurin)
> this can be easily done with homebrew on macOS: `brew install --cask temurin`

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
