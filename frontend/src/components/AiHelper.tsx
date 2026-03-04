import { useEffect, useRef, useState } from "react";
import { Bot, X, Sparkles, Send } from "lucide-react";

type Msg = { role: "bot" | "user"; text: string };

export function AiHelper() {
  const [open, setOpen] = useState(true); // opens when page loads
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "bot",
      text: "Hi! I can guide you around the dispatch dashboard — try: \"How do I send a manual offer?\" or \"What does queued/offered mean?\"",
    },
  ]);

  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || minimized) return;
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open, minimized]);

  const send = () => {
    const q = input.trim();
    if (!q) return;
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setInput("");

    // Simple local responses (no backend required yet)
    const answer =
      q.toLowerCase().includes("manual offer")
        ? "Open a request → choose a nurse/doctor → Send Offer. Offers expire in 3 minutes if not accepted."
        : q.toLowerCase().includes("queued")
        ? "Queued means the request is waiting to be dispatched. Offered means a professional has a time-limited offer."
        : q.toLowerCase().includes("ctrl") || q.toLowerCase().includes("palette")
        ? "Press Ctrl+K to open the command palette for fast actions (Offer/Requeue/Cancel)."
        : "Got it. For now I can help with navigation and workflow. Want to manage offers, requeue, or search?";

    setTimeout(() => setMsgs((m) => [...m, { role: "bot", text: answer }]), 300);
  };

  if (!open) return null;

  return (
    <div className={minimized ? "aiDock aiDock-min" : "aiDock"}>
      <div className="aiHeader">
        <div className="aiTitle">
          <span className="aiIcon"><Bot size={16} /></span>
          <div>
            <div className="aiTitleMain">Assistant</div>
            <div className="aiTitleSub">Workflow guidance</div>
          </div>
        </div>

        <div className="aiHeaderBtns">
          <button className="aiBtn" onClick={() => setMinimized((v) => !v)} title="Minimize">
            <Sparkles size={16} />
          </button>
          <button className="aiBtn" onClick={() => setOpen(false)} title="Close">
            <X size={16} />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          <div className="aiBody">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "bot" ? "aiMsg aiBot" : "aiMsg aiUser"}>
                {m.text}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="aiInputRow">
            <input
              className="input aiInput"
              placeholder="Ask something…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            />
            <button className="btn aiSend" onClick={send} aria-label="Send">
              <Send size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
