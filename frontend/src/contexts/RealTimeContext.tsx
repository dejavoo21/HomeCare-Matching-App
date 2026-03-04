import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";

type ConnectionState = "connected" | "reconnecting" | "disconnected";
type Handler = (event: any) => void;

type RealTimeContextType = {
  state: ConnectionState;
  on: (eventType: string, handler: Handler) => () => void; // returns unsubscribe
};

const RealTimeContext = createContext<RealTimeContextType | undefined>(undefined);

export function RealTimeProvider({ children }: { children: React.ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const [state, setState] = useState<ConnectionState>("disconnected");

  const handlersRef = useRef<Map<string, Set<Handler>>>(new Map());
  const esRef = useRef<EventSource | null>(null);

  const on = (eventType: string, handler: Handler) => {
    const map = handlersRef.current;
    if (!map.has(eventType)) map.set(eventType, new Set());
    map.get(eventType)!.add(handler);

    return () => {
      map.get(eventType)?.delete(handler);
    };
  };

  useEffect(() => {
    // Close if logged out
    if (!isAuthenticated || !token) {
      esRef.current?.close();
      esRef.current = null;
      setState("disconnected");
      return;
    }

    // Reconnect on token change
    esRef.current?.close();

    const baseUrl = (import.meta as any).env.VITE_API_URL || "http://localhost:6005";
    const url = `${baseUrl}/realtime/stream?token=${encodeURIComponent(token)}`;

    const es = new EventSource(url);
    esRef.current = es;

    setState("reconnecting");

    const emit = (type: string, payload: any) => {
      const set = handlersRef.current.get(type);
      if (set) set.forEach((h) => h(payload));
    };

    // Named events (recommended)
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
      "connected",
    ];

    const listeners: Array<{ type: string; fn: (e: MessageEvent) => void }> = [];

    for (const type of knownEvents) {
      const fn = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          emit(type, data);
          // also emit wildcard for simple subscriptions
          emit("*", { type, data });
        } catch {
          // ignore malformed
        }
      };
      es.addEventListener(type, fn);
      listeners.push({ type, fn });
    }

    es.onopen = () => setState("connected");
    es.onerror = () => {
      // EventSource auto-retries; show reconnecting
      setState("reconnecting");
    };

    return () => {
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
