"use client";

/**
 * Query Provider
 * React Query Provider wrapper for client components
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function QueryProvider({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time: Data considered fresh for 1 minute
            staleTime: 60 * 1000,
            // Cache time: Keep unused data in cache for 5 minutes
            gcTime: 5 * 60 * 1000,
            // Refetch on window focus
            refetchOnWindowFocus: true,
            // Refetch on mount if stale
            refetchOnMount: true,
            // Retry failed requests 1 time
            retry: 1,
            // Don't refetch on reconnect by default
            refetchOnReconnect: false,
          },
          mutations: {
            // Retry failed mutations 0 times
            retry: 0,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
