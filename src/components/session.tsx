"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { Profile } from "@/lib/types";

export interface SessionInfo {
  me: Profile | null;
  actingAsDemo: boolean;
  demoMode: boolean;
  ai: boolean;
}

interface Ctx extends SessionInfo {
  loading: boolean;
  refresh: () => Promise<void>;
}

const SessionCtx = createContext<Ctx>({ me: null, actingAsDemo: false, demoMode: false, ai: false, loading: true, refresh: async () => {} });

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [info, setInfo] = useState<SessionInfo>({ me: null, actingAsDemo: false, demoMode: false, ai: false });
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      setInfo(await api<SessionInfo>("/api/session"));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return <SessionCtx.Provider value={{ ...info, loading, refresh }}>{children}</SessionCtx.Provider>;
}

export function useSession() {
  return useContext(SessionCtx);
}
