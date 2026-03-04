import React, { createContext, useContext } from "react";
import type { AssistantAction } from "../types/assistant";

type Handler = (actions: AssistantAction[]) => void;

const Ctx = createContext<Handler | null>(null);

export function AssistantActionsProvider({
  onActions,
  children,
}: {
  onActions: Handler;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={onActions}>{children}</Ctx.Provider>;
}

export function useAssistantActions() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAssistantActions must be used inside AssistantActionsProvider");
  return v;
}
