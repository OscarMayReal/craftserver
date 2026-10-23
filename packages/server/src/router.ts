import { z } from 'zod';

import { publicProcedure, router } from './trpc.js';

export const appRouter = router({
  health: publicProcedure.query(() => ({ status: 'ok' as const })),
  hello: publicProcedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .query(({ input }) => ({ greeting: `Hello, ${input.name}!` })),
});

export type AppRouter = typeof appRouter;
