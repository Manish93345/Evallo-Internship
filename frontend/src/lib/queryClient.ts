import { QueryClient } from '@tanstack/react-query';

/**
 * Shared TanStack Query client. Defaults tuned for an internal admin tool:
 *  • staleTime 30s   — most lists tolerate a half-minute of staleness
 *  • retry 1         — don't hammer a flaky network with default 3 retries
 *  • refetchOnWindowFocus false — annoying for a dashboard
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
