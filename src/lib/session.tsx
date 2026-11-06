import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { api } from "./api";
import { queryClient } from "./query";
import type { User } from "../types";

type Session = {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: (beforeClear?: () => Promise<unknown>) => Promise<void>;
  loggingOut: boolean;
};
const Context = createContext<Session>(null!);
export const useSession = () => useContext(Context);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<{
    user: User | null;
    loading: boolean;
  }>({ user: null, loading: true });
  const [loggingOut, setLoggingOut] = useState(false);
  const currentUser = useRef<User | null>(null);
  const pending = useRef<AbortController | null>(null);
  const generation = useRef(0);

  const applySession = useCallback((next: User | null) => {
    const changed = currentUser.current?.id !== next?.id;
    currentUser.current = next;
    setSession({ user: next, loading: false });
    // A limpeza do cache fica fora da atualização de estado do React.
    if (changed) {
      const privateResources = new Set([
        "profile",
        "wallets",
        "favorites",
        "cart",
        "quote",
        "order",
      ]);
      queryClient.removeQueries({
        predicate: (query) => privateResources.has(String(query.queryKey[0])),
      });
    }
  }, []);

  const refresh = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const requestGeneration = ++generation.current;
    try {
      const { data } = await api.get<{ user: User | null }>("/session", {
        signal: controller.signal,
      });
      if (
        !controller.signal.aborted &&
        requestGeneration === generation.current
      )
        applySession(data.user);
    } catch {
      if (
        !controller.signal.aborted &&
        requestGeneration === generation.current
      )
        applySession(null);
    } finally {
      if (pending.current === controller) pending.current = null;
    }
  }, [applySession]);

  const logout = useCallback(
    async (beforeClear?: () => Promise<unknown>) => {
      setLoggingOut(true);
      try {
        await api.delete("/session");
        generation.current++;
        pending.current?.abort();
        try {
          await beforeClear?.();
        } finally {
          applySession(null);
        }
      } finally {
        setLoggingOut(false);
      }
    },
    [applySession],
  );

  useEffect(() => {
    const id = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          generation.current++;
          pending.current?.abort();
          applySession(null);
        }
        return Promise.reject(error);
      },
    );
    void refresh();
    return () => {
      generation.current++;
      pending.current?.abort();
      api.interceptors.response.eject(id);
    };
  }, [refresh, applySession]);

  return (
    <Context.Provider value={{ ...session, refresh, logout, loggingOut }}>
      {children}
    </Context.Provider>
  );
}
