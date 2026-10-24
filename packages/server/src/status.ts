import fs from 'node:fs';
import { createConnection } from 'node:net';
import { publicProcedure, router } from './trpc.js';
import { getServerUptimeMs } from './server.js';

function writeVarInt(value: number): number[] {
  const bytes: number[] = [];
  do {
    let byte = value & 0x7f;
    value >>>= 7;
    if (value !== 0) byte |= 0x80;
    bytes.push(byte);
  } while (value !== 0);
  return bytes;
}

function readVarInt(buffer: Buffer, offset: number): { value: number; nextOffset: number } | null {
  let value = 0;
  let position = offset;
  let byte: number;

  do {
    if (position >= buffer.length || position - offset >= 5) return null;
    byte = buffer[position++]!;
    value |= (byte & 0x7f) << ((position - offset - 1) * 7);
  } while ((byte & 0x80) !== 0);

  return { value, nextOffset: position };
}

function getConfiguredPort(): number {
  try {
    const config = JSON.parse(fs.readFileSync('./data/serverconfig.json', 'utf-8')) as { serverPort?: unknown };
    return typeof config.serverPort === 'number' ? config.serverPort : 25565;
  } catch {
    return 25565;
  }
}

function getCurrentPlayers(): Promise<number | null> {
  const port = getConfiguredPort();

  return new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    let response = Buffer.alloc(0);
    let settled = false;

    function finish(players: number | null) {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(players);
    }

    socket.setTimeout(2_500, () => finish(null));
    socket.on('error', () => finish(null));
    socket.on('connect', () => {
      const host = Buffer.from('127.0.0.1');
      const handshake = [
        0,
        ...writeVarInt(765),
        ...writeVarInt(host.length),
        ...host,
        (port >> 8) & 0xff,
        port & 0xff,
        1,
      ];
      const handshakePacket = [...writeVarInt(handshake.length), ...handshake];
      socket.write(Buffer.from([...handshakePacket, 1, 0]));
    });
    socket.on('data', (chunk) => {
      response = Buffer.concat([response, chunk]);
      const packetLength = readVarInt(response, 0);
      if (!packetLength) return;

      const packetEnd = packetLength.nextOffset + packetLength.value;
      if (response.length < packetEnd) return;

      const packetId = readVarInt(response, packetLength.nextOffset);
      if (!packetId || packetId.value !== 0) return finish(null);
      const jsonLength = readVarInt(response, packetId.nextOffset);
      if (!jsonLength) return finish(null);

      const jsonStart = jsonLength.nextOffset;
      const jsonEnd = jsonStart + jsonLength.value;
      if (response.length < jsonEnd) return;

      try {
        const status = JSON.parse(response.toString('utf8', jsonStart, jsonEnd)) as {
          players?: { online?: number };
        };
        finish(typeof status.players?.online === 'number' ? status.players.online : null);
      } catch {
        finish(null);
      }
    });
  });
}

const statusRouter = router({
  get: publicProcedure.query(async () => {
    const memory = process.memoryUsage();

    return {
      currentPlayers: await getCurrentPlayers(),
      uptimeMs: getServerUptimeMs(),
      memoryUsage: {
        residentBytes: memory.rss,
        heapUsedBytes: memory.heapUsed,
        heapTotalBytes: memory.heapTotal,
      },
    };
  }),
});

export default statusRouter;
