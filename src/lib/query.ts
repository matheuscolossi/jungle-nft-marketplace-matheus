import { QueryClient } from "@tanstack/react-query";
import axios from "axios";
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20000,
      gcTime: 300000,
      retry: (n, e) =>
        n < 1 &&
        (!axios.isAxiosError(e) || !e.response || e.response.status >= 500),
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
});
