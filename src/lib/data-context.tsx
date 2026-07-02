"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Snapshot } from "@/lib/types";

type Ctx = {
  data: Snapshot | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  mutate: (path: string, method: "POST" | "PATCH" | "DELETE", body: unknown) => Promise<boolean>;
};

const DataCtx = createContext<Ctx>({
  data: null,
  loading: true,
  error: null,
  refresh: async () => {},
  mutate: async () => false,
});

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/data", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as Snapshot;
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const mutate = useCallback(
    async (path: string, method: "POST" | "PATCH" | "DELETE", body: unknown) => {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (typeof window !== "undefined") {
          const raw = localStorage.getItem("frf-user");
          if (raw) {
            try {
              const u = JSON.parse(raw);
              if (u.email) headers["X-User-Email"] = u.email;
              if (u.role) headers["X-User-Role"] = u.role;
            } catch {}
          }
        }

        const res = await fetch(path, {
          method,
          headers,
          body: JSON.stringify(body),
        });
        await refresh();
        return res.ok;
      } catch {
        return false;
      }
    },
    [refresh],
  );

  return <DataCtx.Provider value={{ data, loading, error, refresh, mutate }}>{children}</DataCtx.Provider>;
}

export function useData() {
  return useContext(DataCtx);
}

/** Persist form drafts to localStorage (auto-save / draft mode). */
export function useDraft<T>(key: string, initial: T): [T, (v: T) => void, () => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = localStorage.getItem(`frf-draft-${key}`);
      if (raw) return JSON.parse(raw) as T;
    } catch {}
    return initial;
  });
  const set = (v: T) => {
    setValue(v);
    try {
      localStorage.setItem(`frf-draft-${key}`, JSON.stringify(v));
    } catch {}
  };
  const clear = () => {
    setValue(initial);
    try {
      localStorage.removeItem(`frf-draft-${key}`);
    } catch {}
  };
  return [value, set, clear];
}
