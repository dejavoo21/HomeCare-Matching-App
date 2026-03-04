import { useEffect, useMemo, useState } from "react";
import { CareRequest } from "../types";
import { api } from "../services/api";

type Pro = { id: string; name: string; role: string; isActive?: boolean };

export function RequestDrawer({
  request,
  onClose,
  onRefresh,
}: {
  request: CareRequest | null;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [pros, setPros] = useState<Pro[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!request) return;
    (async () => {
      try {
        const res: any = await api.getProfessionals();
        setPros(res?.data || []);
      } catch {
        setPros([]);
      }
    })();
  }, [request?.id]);

  const availablePros = useMemo(() => {
    return (pros || [])
      .filter((p) => (p.isActive ?? true) === true)
      .filter((p) => ["nurse", "doctor"].includes(String(p.role).toLowerCase()));
  }, [pros]);

  if (!request) return null;

  const canOffer = ["queued", "offered"].includes(String(request.status).toLowerCase());

  const sendOffer = async () => {
    if (!selected) return;
    try {
      setBusy(true);
      setMsg("");
      await api.offerToProfessional(request.id, selected);
      setMsg("✅ Offer sent (3 min expiry).");
      onRefresh();
    } catch (e: any) {
      setMsg(e?.message || "Failed to send offer.");
    } finally {
      setBusy(false);
    }
  };

  const handleRequeue = async () => {
    try {
      setBusy(true);
      await api.requeueRequest(request.id);
      setMsg("✅ Request requeued.");
      onRefresh();
    } catch (e: any) {
      setMsg("❌ " + (e?.message || "Failed to requeue."));
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    try {
      setBusy(true);
      await api.cancelRequest(request.id);
      setMsg("✅ Request cancelled.");
      onRefresh();
    } catch (e: any) {
      setMsg("❌ " + (e?.message || "Failed to cancel."));
    } finally {
      setBusy(false);
    }
  };

  const handleUrgency = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const urgency = e.target.value;
    if (!urgency) return;
    try {
      setBusy(true);
      await api.setUrgency(request.id, urgency);
      setMsg("✅ Urgency updated.");
      onRefresh();
    } catch (e: any) {
      setMsg("❌ " + (e?.message || "Failed to update urgency."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div 
      className="drawerOverlay" 
      onClick={onClose}
      role="presentation"
      aria-hidden={!request}
    >
      <div 
        className="drawerPanel" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawerTitle"
      >
        <div className="drawerHeader">
          <div>
            <h2 id="drawerTitle" className="drawerTitle">Request Details</h2>
            <p className="drawerSubtitle">{request.description}</p>
          </div>
          <button 
            className="btn btn-small btn-close" 
            onClick={onClose}
            aria-label="Close request details"
            title="Close"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <div className="drawerActions">
          <button 
            className="btn btn-secondary btn-small" 
            onClick={handleRequeue}
            disabled={!["offered", "accepted", "en_route"].includes(String(request.status).toLowerCase()) || busy}
          >
            Requeue
          </button>
          <button 
            className="btn btn-danger btn-small" 
            onClick={handleCancel}
            disabled={!["queued", "offered"].includes(String(request.status).toLowerCase()) || busy}
          >
            Cancel
          </button>
          <select 
            className="select btn-small" 
            onChange={handleUrgency}
            defaultValue=""
            disabled={busy}
          >
            <option value="">Set urgency</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div className="drawerBody">
          <div className="kv">
            <div className="k">ID</div>
            <div className="v mono">{request.id}</div>
          </div>
          <div className="kv">
            <div className="k">Status</div>
            <div className="v">{String(request.status)}</div>
          </div>
          <div className="kv">
            <div className="k">Urgency</div>
            <div className="v">{String(request.urgency)}</div>
          </div>
          <div className="kv">
            <div className="k">Service</div>
            <div className="v">{String(request.serviceType)}</div>
          </div>
          <div className="kv">
            <div className="k">Address</div>
            <div className="v">{request.address}</div>
          </div>
          <div className="kv">
            <div className="k">Offer Expires</div>
            <div className="v mono">{request.offerExpiresAt ? new Date(request.offerExpiresAt).toLocaleString() : "—"}</div>
          </div>

          <div className="divider" />

          <div className="drawerSection">
            <div className="drawerSectionTop">
              <div>
                <h3 className="sectionTitle">Manual Offer</h3>
                <p className="muted">Send a time-limited offer (3 minutes) to a nurse/doctor.</p>
              </div>
              <div className="miniInfo" title={request.assignedProfessionalId}>
                <span className="miniLabel">Current</span>
                <span className="mono miniValue">
                  {request.assignedProfessionalId ? request.assignedProfessionalId.slice(0, 8) : "—"}
                </span>
              </div>
            </div>

            <div className="offerRow">
              <select
                id="proSelect"
                className="select wide"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                disabled={!canOffer || busy}
                aria-label="Select healthcare professional"
              >
                <option value="">Select nurse/doctor…</option>
                {availablePros.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role})
                  </option>
                ))}
              </select>

              <button 
                className="btn btn-primary" 
                onClick={sendOffer} 
                disabled={!canOffer || !selected || busy}
                aria-label={busy ? "Sending offer" : "Send offer to selected professional"}
              >
                {busy ? "Sending..." : "Send Offer"}
              </button>
            </div>

            {!canOffer && (
              <div className="note warn" role="alert">
                Offers are only allowed when status is <b>queued</b> or <b>offered</b>.
              </div>
            )}

            {msg && (
              <div 
                className="note" 
                role="status" 
                aria-live="polite"
              >
                {msg}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
