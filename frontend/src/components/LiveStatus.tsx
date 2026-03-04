// import React from "react";
import { useRealTime } from "../contexts/RealTimeContext";

export function LiveStatus() {
  const { state } = useRealTime();

  const label =
    state === "connected" ? "Live" : state === "reconnecting" ? "Reconnecting…" : "Offline";

  // minimal styling (no fancy libs)
  const dot =
    state === "connected" ? "🟢" : state === "reconnecting" ? "🟠" : "🔴";

  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: 14 }}>
      <span>{dot}</span>
      <span>{label}</span>
    </span>
  );
}
