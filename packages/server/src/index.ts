import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';

import { appRouter } from './router.js';

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
});
