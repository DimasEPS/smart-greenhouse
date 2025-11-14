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
            // Stale time: Data considered fresh for 10 seconds (real-time dashboard)
            staleTime: 10 * 1000,
            // Cache time: Keep unused data in cache for 5 minutes
            gcTime: 5 * 60 * 1000,
            // Don't refetch on window focus (to avoid conflicts with refetchInterval)
            refetchOnWindowFocus: false,
            // Refetch on mount if stale
            refetchOnMount: true,
            // Retry failed requests 1 time
            retry: 1,
            // Refetch on reconnect to ensure fresh data
            refetchOnReconnect: true,
            // Keep polling even when browser tab is inactive
            refetchIntervalInBackground: false,
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
