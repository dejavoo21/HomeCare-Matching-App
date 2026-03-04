import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

type Pro = {
  id: string;
  name: string;
  email: string;
  role: "nurse" | "doctor" | string;
  location?: string;
  isActive?: boolean;
};

function initials(name?: string) {
  const n = (name || "").trim();
  if (!n) return "U";
  const parts = n.split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase()).join("");
}

export function ProfessionalsPanel({ refreshKey }: { refreshKey?: number }) {
  const [pros, setPros] = useState<Pro[]>([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"all" | "nurse" | "doctor">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const res: any = await api.getProfessionals(); // { success, data: [...] }
        const rows = res?.data || [];

        // Normalize data: handle both isActive and is_active field names
        const normalized = rows.map((p: any) => ({
          ...p,
          isActive: p.isActive ?? p.is_active ?? true,
        }));

        if (mounted) setPros(normalized);
      } catch (e: any) {
        console.error("❌ Failed to load professionals:", e?.message || e);
        if (mounted) setPros([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [refreshKey]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (pros || [])
      .filter((p: any) => (p.isActive ?? p.is_active ?? true) === true)
      .filter(p => ["nurse", "doctor"].includes(String(p.role).toLowerCase()))
      .filter(p => (role === "all" ? true : String(p.role).toLowerCase() === role))
      .filter(p => {
        if (!query) return true;
        const hay = [p.name, p.email, p.location, p.role].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(query);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [pros, q, role]);

  const nurseCount = (pros || []).filter(p => String(p.role).toLowerCase() === "nurse" && (p.isActive ?? true)).length;
  const doctorCount = (pros || []).filter(p => String(p.role).toLowerCase() === "doctor" && (p.isActive ?? true)).length;

  return (
    <div className="sideCard">
      <div className="sideHeader">
        <div>
          <h3 className="sideTitle">Team Availability</h3>
          <p className="muted">Active doctors & nurses</p>
        </div>

        <div className="pillRow">
          <span className="pillSoft">Nurses <b>{nurseCount}</b></span>
          <span className="pillSoft">Doctors <b>{doctorCount}</b></span>
        </div>
      </div>

      <div className="rowGap">
        <input
          className="input"
          placeholder="Search team…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <div className="chips">
          <button className={role === "all" ? "chip chip-active" : "chip"} onClick={() => setRole("all")}>All</button>
          <button className={role === "nurse" ? "chip chip-active" : "chip"} onClick={() => setRole("nurse")}>Nurses</button>
          <button className={role === "doctor" ? "chip chip-active" : "chip"} onClick={() => setRole("doctor")}>Doctors</button>
        </div>

        {loading ? (
          <div className="skeletonList">
            <div className="skRow" />
            <div className="skRow" />
            <div className="skRow" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="emptyState">
            <div className="emptyTitle">No active professionals</div>
            <p className="muted">Check roles, active status, or admin permissions.</p>
          </div>
        ) : (
          <div className="proList">
            {filtered.map((p) => (
              <div key={p.id} className="proRow">
                <div className="proAvatar">{initials(p.name)}</div>
                
                <div className="proMeta">
                  <div className="proName">{p.name}</div>
                  <div className="muted proSub">{p.email}</div>
                </div>
                
                <span className={String(p.role).toLowerCase() === "doctor" ? "roleBadge roleDoctor" : "roleBadge roleNurse"}>
                  {String(p.role).toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}

        {filtered.length > 8 && (
          <div className="muted tiny">Showing 8 of {filtered.length}</div>
        )}
      </div>
    </div>
  );
}
