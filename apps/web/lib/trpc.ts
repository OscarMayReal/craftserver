import { createTRPCReact } from '@trpc/react-query';

import type { AppRouter } from '@workspace/server/router';

export const trpc = createTRPCReact<AppRouter>();
