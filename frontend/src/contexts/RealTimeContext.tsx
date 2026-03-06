import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";

type ConnectionState = "connected" | "reconnecting" | "disconnected";
type Handler = (event: any) => void;

type RealTimeContextType = {
  state: ConnectionState;
  on: (eventType: string, handler: Handler) => () => void;
};

const RealTimeContext = createContext<RealTimeContextType | undefined>(undefined);

export function RealTimeProvider({ children }: { children: React.ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const [state, setState] = useState<ConnectionState>("disconnected");

  const handlersRef = useRef<Map<string, Set<Handler>>>(new Map());
  const esRef = useRef<EventSource | null>(null);
  const offlineTimerRef = useRef<number | null>(null);

  const on = (eventType: string, handler: Handler) => {
    const map = handlersRef.current;
    if (!map.has(eventType)) map.set(eventType, new Set());
    map.get(eventType)!.add(handler);

    return () => map.get(eventType)?.delete(handler);
  };

  const clearOfflineTimer = () => {
    if (offlineTimerRef.current) {
      window.clearTimeout(offlineTimerRef.current);
      offlineTimerRef.current = null;
    }
  };

  const armOfflineTimer = () => {
    clearOfflineTimer();
    offlineTimerRef.current = window.setTimeout(() => {
      setState("disconnected");
    }, 4000); // ✅ after 4s, call it offline
  };

  useEffect(() => {
    if (!isAuthenticated || !token) {
      esRef.current?.close();
      esRef.current = null;
      clearOfflineTimer();
      setState("disconnected");
      return;
    }

    esRef.current?.close();
    clearOfflineTimer();

    const baseUrl = (import.meta as any).env.VITE_API_URL || 'https://homecare-matching-app-production.up.railway.app';

    // NOTE: EventSource cannot send Authorization header reliably.
    // Keeping token query param is OK for now (Phase 5 we harden it).
    const url = `${baseUrl}/realtime/stream?token=${encodeURIComponent(token)}`;

    setState("reconnecting");
    armOfflineTimer();

    const es = new EventSource(url);
    esRef.current = es;

    const emit = (type: string, payload: any) => {
      const set = handlersRef.current.get(type);
      if (set) set.forEach((h) => h(payload));
    };

    const knownEvents = [
      "REQUEST_CREATED",
      "REQUEST_STATUS_CHANGED",
      "OFFER_CREATED",
      "OFFER_EXPIRED",
      "OFFER_ACCEPTED",
      "OFFER_DECLINED",
      "VISIT_CREATED",
      "VISIT_STATUS_CHANGED",
      "ADMIN_ASSIGNED",
      "HEARTBEAT",
    ];

    const listeners: Array<{ type: string; fn: (e: MessageEvent) => void }> = [];

    for (const type of knownEvents) {
      const fn = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          emit(type, data);
          emit("*", { type, data });
        } catch {}
      };
      es.addEventListener(type, fn);
      listeners.push({ type, fn });
    }

    es.onopen = () => {
      clearOfflineTimer();
      setState("connected");
    };

    es.onerror = () => {
      // EventSource retries automatically; we show reconnecting but degrade to offline if it doesn't recover
      setState("reconnecting");
      armOfflineTimer();
    };

    return () => {
      clearOfflineTimer();
      listeners.forEach(({ type, fn }) => es.removeEventListener(type, fn));
      es.close();
    };
  }, [token, isAuthenticated]);

  const value = useMemo<RealTimeContextType>(() => ({ state, on }), [state]);
  return <RealTimeContext.Provider value={value}>{children}</RealTimeContext.Provider>;
}

export function useRealTime() {
  const ctx = useContext(RealTimeContext);
  if (!ctx) throw new Error("useRealTime must be used within RealTimeProvider");
  return ctx;
}
