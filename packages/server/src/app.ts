import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';

import { appRouter } from './router.js';
import { startInstalledServer } from './serverconfig.js';
import { startFtpServer } from './ftp.js';
import { watchServerChatLog } from './server.js';
import { createFolderArchive } from './serverfiles.js';
import './botmanager.js';

export function startServerApp() {
  watchServerChatLog();

  const app = express();
  const port = Number(process.env.TRPC_PORT ?? process.env.PORT ?? 3001);

  app.get('/files/archive', (request, response) => {
    try {
      const requestedPath = request.query.path;
      if (typeof requestedPath !== 'string' || !requestedPath) {
        return response.status(400).send('Folder path is required');
      }
      const archive = createFolderArchive(requestedPath);
      const safeName = archive.name.replace(/[\\"\r\n]/g, '_');
      response.setHeader('Content-Type', 'application/zip');
      response.setHeader('Content-Disposition', `attachment; filename="${safeName}.zip"`);
      response.setHeader('Content-Length', archive.data.length);
      return response.send(archive.data);
    } catch (error) {
      return response.status(400).send(error instanceof Error ? error.message : 'Could not create folder archive');
    }
  });

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
}
