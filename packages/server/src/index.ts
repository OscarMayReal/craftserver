import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';

import { appRouter } from './router.js';
import { startInstalledServer } from './serverconfig.js';
import { startFtpServer } from './ftp.js';
import { watchServerChatLog } from './server.js';
import './botmanager.js';

watchServerChatLog();

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext: () => ({}),
  }),
);

app.listen(port, () => {
  console.log(`tRPC server listening on http://localhost:${port}/trpc`);
  void startFtpServer().catch((error: unknown) => {
    console.error('Could not start the FTP server:', error);
  });
  void startInstalledServer()
    .then((started) => {
      if (started) console.log('Installed Minecraft server started.');
    })
    .catch((error: unknown) => {
      console.error('Could not start the installed Minecraft server:', error);
    });
});
