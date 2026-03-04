export type AssistantAction =
  | { type: "SET_TAB"; tab: "queued" | "offered" | "accepted" | "en_route" | "completed" | "cancelled" }
  | { type: "SET_SEARCH"; query: string }
  | { type: "OPEN_REQUEST"; requestId: string }
  | { type: "REFRESH_DASHBOARD" }
  | { type: "NAVIGATE"; path: string };
