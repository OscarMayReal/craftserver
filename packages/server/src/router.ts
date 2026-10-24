import { router } from './trpc.js';
import serverConfigRouter from './serverconfig';
import statusRouter from './status';

export const appRouter = router({
  config: serverConfigRouter,
  status: statusRouter,
});

export type AppRouter = typeof appRouter;
