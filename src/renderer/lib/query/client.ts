import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      gcTime: 10 * 60_000,
      retry: 1,
      refetchOnWindowFocus: true
    }
  }
});

