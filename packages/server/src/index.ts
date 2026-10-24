import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';

import { appRouter } from './router.js';
import { startInstalledServer } from './serverconfig.js';

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
  void startInstalledServer()
    .then((started) => {
      if (started) console.log('Installed Minecraft server started.');
    })
    .catch((error: unknown) => {
      console.error('Could not start the installed Minecraft server:', error);
    });
});
