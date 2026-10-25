import { router } from './trpc.js';
import serverConfigRouter from './serverconfig';
import statusRouter from './status';
import serverFilesRouter from './serverfiles';
import modsRouter from './mods';

export const appRouter = router({
  config: serverConfigRouter,
  status: statusRouter,
  files: serverFilesRouter,
  mods: modsRouter,
});

export type AppRouter = typeof appRouter;
