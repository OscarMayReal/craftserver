import fs from 'node:fs';
import type { Bot } from 'mineflayer';
import { Movements, goals } from 'mineflayer-pathfinder';

const runningBots = new WeakSet<Bot>();
const scriptStorePath = './data/bot-scripts.json';
type PlayerScripts = Record<string, Record<string, string>>;

function readScripts(): PlayerScripts {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(scriptStorePath, 'utf8'));
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed as PlayerScripts : {};
  } catch {
    return {};
  }
}

function writeScripts(scripts: PlayerScripts): void {
  fs.mkdirSync('./data', { recursive: true });
  fs.writeFileSync(scriptStorePath, JSON.stringify(scripts, null, 2));
}

function scriptFilename(args: string[]): string | undefined {
  const value = args.find((argument) => argument.startsWith('file='))?.slice('file='.length).trim();
  return value && /^[A-Za-z0-9 _-]{1,32}$/.test(value) ? value : undefined;
}

function resolveText(text: string, variables: Map<string, string>): string {
  return text.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_match, name: string) => {
    const value = variables.get(name);
    if (value === undefined) throw new Error(`Variable ${name} is not defined`);
    return value;
  });
}

type ControlBlock = { index: number; kind: 'if' | 'while'; elseIndex?: number };

function indexControlBlocks(steps: string[]) {
  const stack: ControlBlock[] = [];
  const endForStart = new Map<number, number>();
  const elseForIf = new Map<number, number>();
  for (let index = 0; index < steps.length; index++) {
    const step = steps[index]!.trim();
    if (step.startsWith('if=')) stack.push({ index, kind: 'if' });
    else if (step.startsWith('while=')) stack.push({ index, kind: 'while' });
    else if (step === 'else') {
      const current = stack.at(-1);
      if (!current || current.kind !== 'if' || current.elseIndex !== undefined) throw new Error('Unexpected else');
      current.elseIndex = index;
      elseForIf.set(current.index, index);
    } else if (step === 'endif' || step === 'endwhile') {
      const current = stack.pop();
      const expected = step === 'endif' ? 'if' : 'while';
      if (!current || current.kind !== expected) throw new Error(`Unexpected ${step}`);
      endForStart.set(current.index, index);
    }
  }
  if (stack.length) {
    const current = stack.at(-1)!;
    throw new Error(`Missing ${current.kind === 'if' ? 'endif' : 'endwhile'}`);
  }
  return { endForStart, elseForIf };
}

function conditionValue(value: string, variables: Map<string, string>): string {
  const trimmed = value.trim();
  return variables.get(trimmed) ?? trimmed;
}

function evaluateCondition(expression: string, variables: Map<string, string>): boolean {
  const comparison = expression.match(/^\s*(.*?)\s*(==|!=|<=|>=|<|>)\s*(.*?)\s*$/);
  if (!comparison) {
    const value = variables.get(expression.trim()) ?? expression.trim();
    if (/^(true|false)$/i.test(value)) return value.toLowerCase() === 'true';
    const number = Number(value);
    if (value !== '' && Number.isFinite(number)) return number !== 0;
    throw new Error(`Invalid condition: ${expression}. Use a boolean variable or comparison such as count < 3`);
  }

  const [, leftText, operator, rightText] = comparison;
  const left = conditionValue(leftText!, variables);
  const right = conditionValue(rightText!, variables);
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  const numeric = left.trim() !== '' && right.trim() !== '' && Number.isFinite(leftNumber) && Number.isFinite(rightNumber);
  const a = numeric ? leftNumber : left.toLowerCase();
  const b = numeric ? rightNumber : right.toLowerCase();
  switch (operator) {
    case '==': return a === b;
    case '!=': return a !== b;
    case '<':
    case '<=':
    case '>':
    case '>=':
      if (!numeric) throw new Error(`Condition ${operator} requires numeric values`);
      if (operator === '<') return leftNumber < rightNumber;
      if (operator === '<=') return leftNumber <= rightNumber;
      if (operator === '>') return leftNumber > rightNumber;
      return leftNumber >= rightNumber;
    default: throw new Error(`Unsupported condition operator: ${operator}`);
  }
}

export async function runSimpleScript(bot: Bot, script: string): Promise<void> {
  if (!script.trim()) throw new Error('SimpleScript is empty');
  if (runningBots.has(bot)) {
    bot.chat('A SimpleScript is already running');
    throw new Error('A SimpleScript is already running');
  }
  runningBots.add(bot);
  bot.chat('Executing script');
  const variables = new Map<string, string>();
  try {
    const steps = script.split(';').map((step) => step.trim());
    const blocks = indexControlBlocks(steps);

    const executeRange = async (start: number, end: number): Promise<void> => {
      for (let index = start; index < end; index++) {
        const step = resolveText(steps[index]!, variables);
        if (!step) continue;
        if (step.startsWith('if=')) {
          const blockEnd = blocks.endForStart.get(index)!;
          const elseIndex = blocks.elseForIf.get(index);
          if (evaluateCondition(step.slice('if='.length), variables)) {
            await executeRange(index + 1, elseIndex ?? blockEnd);
          } else if (elseIndex !== undefined) {
            await executeRange(elseIndex + 1, blockEnd);
          }
          index = blockEnd;
        } else if (step.startsWith('while=')) {
          const blockEnd = blocks.endForStart.get(index)!;
          const condition = steps[index]!.slice('while='.length);
          let iterations = 0;
          while (evaluateCondition(resolveText(condition, variables), variables)) {
            if (++iterations > 100) throw new Error('While loop exceeded 100 iterations');
            await executeRange(index + 1, blockEnd);
          }
          index = blockEnd;
        } else if (step.startsWith('goto=')) {
          const coords = step.slice('goto='.length).split(',').map((value) => Number(value.trim()));
          const [x, y, z] = coords;
          if (coords.length !== 3 || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) throw new Error('Invalid coordinates');
          bot.chat(`Goto ${x}, ${y}, ${z}`);
          bot.pathfinder.setMovements(new Movements(bot));
          await bot.pathfinder.goto(new goals.GoalNear(x!, y!, z!, 1));
        } else if (step.startsWith('gotoplayer=')) {
          const playerName = step.slice('gotoplayer='.length).trim();
          const target = bot.players[playerName]?.entity;
          if (!target) throw new Error(`Player ${playerName} not found`);
          bot.pathfinder.setMovements(new Movements(bot));
          await bot.pathfinder.goto(new goals.GoalNear(target.position.x, target.position.y, target.position.z, 1));
        } else if (step.startsWith('chat=')) {
          bot.chat(step.slice('chat='.length));
        } else if (step.startsWith('wait=')) {
          const duration = parseInt(step.slice('wait='.length));
          if (isNaN(duration) || duration < 0) throw new Error('Invalid wait duration');
          await new Promise((resolve) => setTimeout(resolve, duration));
        } else if (step.startsWith('setvar=')) {
          const assignment = step.slice('setvar='.length);
          const commaSeparator = assignment.indexOf(',');
          const separator = commaSeparator >= 0 ? commaSeparator : assignment.indexOf('=');
          if (separator < 1) throw new Error('Invalid setvar format. Use setvar=name,value');
          const key = assignment.slice(0, separator).trim();
          const value = assignment.slice(separator + 1).trim();
          if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) throw new Error('Variable names must start with a letter or underscore and contain only letters, numbers, and underscores');
          variables.set(key, value);
      } else if (step.startsWith('saveloc')) {
        const vars = step.slice('saveloc='.length).trim().replace(/^=/, '').split(',').map((value) => value.trim());
        if (vars.length !== 3) throw new Error('Invalid saveloc format. Use saveloc=x,y,z');
          const [x, y, z] = vars;
          if (!x || !y || !z) throw new Error('Invalid saveloc format. Use saveloc=x,y,z');
          if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(x) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(y) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(z)) throw new Error('Variable names must start with a letter or underscore and contain only letters, numbers, and underscores');
        variables.set(x, bot.entity.position.x.toString());
        variables.set(y, bot.entity.position.y.toString());
        variables.set(z, bot.entity.position.z.toString());
      } else if (step.startsWith('checkstandingblock=')) {
        const [blockName, variableName] = step.slice('checkstandingblock='.length).split(',').map((value) => value.trim());
        if (!blockName || !variableName || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(variableName)) {
          throw new Error('Invalid checkstandingblock format. Use checkstandingblock=blockname,var');
        }
        const blockBelow = bot.blockAt(bot.entity.position.offset(0, -1, 0));
        variables.set(variableName, (blockBelow?.name.toLowerCase() === blockName.toLowerCase()).toString());
      } else if (step.startsWith('modvar')) {
          const stepargs = step.slice('modvar='.length).trim().split(',').map((value) => value.trim());
          const [variableName, operator, operandText] = stepargs;
          if (!variableName || !['+', '-', '*', '/'].includes(operator ?? '') || operandText === undefined) throw new Error('Invalid modvar format. Use modvar=name,operator,value');
          const currentText = variables.get(variableName);
          if (currentText === undefined) throw new Error(`Variable ${variableName} not found`);
          const currentValue = Number(currentText);
          const operand = Number(operandText);
          if (!Number.isFinite(currentValue) || !Number.isFinite(operand)) throw new Error('modvar requires numeric values');
          const newValue = operator === '+' ? currentValue + operand : operator === '-' ? currentValue - operand : operator === '*' ? currentValue * operand : currentValue / operand;
          variables.set(variableName, newValue.toString());
        } else if (step === 'else' || step === 'endif' || step === 'endwhile') {
          throw new Error(`Unexpected ${step}`);
        } else {
          throw new Error(`Unknown step: ${step}`);
        }
      }
    };

    await executeRange(0, steps.length);
    bot.chat('SimpleScript complete');
  } catch (error) {
    bot.chat(`SimpleScript stopped: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  } finally {
    runningBots.delete(bot);
  }
}

export function handleSimpleScriptCommand(bot: Bot, playerName: string, command: string, args: string[], message: string): boolean {
  const playerKey = playerName.toLowerCase();
  if (command === ':simplescript') {
    const script = args[0];
    if (!script?.trim()) bot.chat('SimpleScript is empty');
    else void runSimpleScript(bot, script).catch(() => undefined);
    return true;
  }

  if (command === ':ss-ls') {
    const names = Object.keys(readScripts()[playerKey] ?? {});
    if (!names.length) bot.chat('You have no saved scripts');
    else {
      bot.chat('Saved scripts:');
      for (let index = 0; index < names.length; index += 5) bot.chat(names.slice(index, index + 5).join(', '));
    }
    return true;
  }

  if (command === ':ss-run') {
    const filename = scriptFilename(args);
    if (!filename) bot.chat('Usage: :ss-run --file=name');
    else {
      const script = readScripts()[playerKey]?.[filename.toLowerCase()];
      if (!script) bot.chat(`Script ${filename} not found. Use :ss-ls to list scripts`);
      else void runSimpleScript(bot, script).catch(() => undefined);
    }
    return true;
  }

  if (command === ':ss-write') {
    const filename = scriptFilename(args);
    const scriptMarker = message.indexOf('--script=');
    const script = scriptMarker >= 0 ? message.slice(scriptMarker + '--script='.length).trim() : '';
    if (!filename || !script) {
      bot.chat('Usage: :ss-write --file=name --script=step1;step2');
      return true;
    }
    const allScripts = readScripts();
    const playerScripts = allScripts[playerKey] ?? {};
    const existed = Object.hasOwn(playerScripts, filename.toLowerCase());
    playerScripts[filename.toLowerCase()] = script;
    allScripts[playerKey] = playerScripts;
    writeScripts(allScripts);
    bot.chat(existed ? `Updated script ${filename}` : `Saved script ${filename}`);
    return true;
  }

  if (command === ':ss-delete') {
    const filename = scriptFilename(args);
    if (!filename) {
      bot.chat('Usage: :ss-delete --file=name');
      return true;
    }
    const allScripts = readScripts();
    const playerScripts = allScripts[playerKey];
    const key = filename.toLowerCase();
    if (!playerScripts || !Object.hasOwn(playerScripts, key)) bot.chat(`Script ${filename} not found`);
    else {
      delete playerScripts[key];
      if (Object.keys(playerScripts).length === 0) delete allScripts[playerKey];
      writeScripts(allScripts);
      bot.chat(`Deleted script ${filename}`);
    }
    return true;
  }

  return false;
}
