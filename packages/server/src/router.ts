import { router } from './trpc.js';
import serverConfigRouter from './serverconfig';
import statusRouter from './status';
import serverFilesRouter from './serverfiles';

export const appRouter = router({
  config: serverConfigRouter,
  status: statusRouter,
  files: serverFilesRouter,
});

export type AppRouter = typeof appRouter;
