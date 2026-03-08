import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

type ConnectedSystem = {
  id: string;
  name: string;
  system_type: 'hospital' | 'dispatch_agency' | 'webhook_partner';
  base_url: string;
  auth_type: 'none' | 'api_key' | 'bearer';
  auth_config?: any;
  is_active: boolean;
  status: 'not_tested' | 'connected' | 'failed';
  last_tested_at?: string | null;
  last_test_result?: string | null;
  notes?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '-' : d.toLocaleString();
}

function systemTypeLabel(v: string) {
  if (v === 'hospital') return 'Hospital';
  if (v === 'dispatch_agency') return 'Dispatch Agency';
  return 'Webhook Partner';
}

function statusClass(v: string) {
  const s = String(v || '').toLowerCase();
  if (s === 'connected') return 'pillSoft pillConnected';
  if (s === 'failed') return 'pillSoft pillFailed';
  return 'pillSoft pillNeutral';
}

export function ConnectedSystemsPanel() {
  const [items, setItems] = useState<ConnectedSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    systemType: 'hospital',
    baseUrl: '',
    authType: 'none',
    secretOrToken: '',
    isActive: true,
    notes: '',
  });

  const load = async () => {
    try {
      setLoading(true);
      const response = (await api.getConnectedSystems()) as any;
      setItems(response?.data || []);
    } catch (err) {
      console.error('Failed to load connected systems:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(
    () => ({
      hospitals: items.filter((i) => i.system_type === 'hospital'),
      agencies: items.filter((i) => i.system_type === 'dispatch_agency'),
      partners: items.filter((i) => i.system_type === 'webhook_partner'),
    }),
    [items]
  );

  const createItem = async () => {
    if (!form.name || !form.baseUrl) return;

    try {
      const authConfig =
        form.authType === 'api_key'
          ? { apiKey: form.secretOrToken }
          : form.authType === 'bearer'
            ? { token: form.secretOrToken }
            : {};

      await api.createConnectedSystem({
        name: form.name,
        systemType: form.systemType as any,
        baseUrl: form.baseUrl,
        authType: form.authType as any,
        authConfig,
        isActive: form.isActive,
        notes: form.notes,
      });

      setForm({
        name: '',
        systemType: 'hospital',
        baseUrl: '',
        authType: 'none',
        secretOrToken: '',
        isActive: true,
        notes: '',
      });

      await load();
    } catch (err) {
      console.error('Failed to create connected system:', err);
    }
  };

  const testItem = async (id: string) => {
    try {
      setBusyId(id);
      await api.testConnectedSystem(id);
      await load();
    } catch (err) {
      console.error('Failed to test connected system:', err);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="connectedSystemsWrap">
      <div className="connectedSystemsHeader">
        <div>
          <h2 className="section-title">Connected Systems</h2>
          <p className="muted">Hospitals, dispatch agencies, and partner integrations</p>
        </div>
      </div>

      <div className="connectedSystemsGrid">
        <div className="connectedSystemsMain">
          <div className="connectedSummaryGrid">
            <div className="connectedSummaryCard">
              <div className="connectedSummaryLabel">Hospitals</div>
              <div className="connectedSummaryValue">{grouped.hospitals.length}</div>
            </div>
            <div className="connectedSummaryCard">
              <div className="connectedSummaryLabel">Dispatch Agencies</div>
              <div className="connectedSummaryValue">{grouped.agencies.length}</div>
            </div>
            <div className="connectedSummaryCard">
              <div className="connectedSummaryLabel">Webhook Partners</div>
              <div className="connectedSummaryValue">{grouped.partners.length}</div>
            </div>
          </div>

          {loading ? (
            <div className="empty">Loading connected systems...</div>
          ) : (
            <>
              <SystemsGroup title="Hospital Connections" items={grouped.hospitals} onTest={testItem} busyId={busyId} />
              <SystemsGroup title="Dispatch Agency Connections" items={grouped.agencies} onTest={testItem} busyId={busyId} />
              <SystemsGroup title="Webhook / Partner Connections" items={grouped.partners} onTest={testItem} busyId={busyId} />
            </>
          )}
        </div>

        <div className="connectedSystemsSide">
          <div className="sideCard">
            <div className="sideHeader">
              <div>
                <h3 className="sideTitle">Add Connection</h3>
                <p className="muted">Register a hospital, agency, or partner</p>
              </div>
            </div>

            <div className="rowGap">
              <input className="input" placeholder="Connection name" value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} />
              <select className="select" value={form.systemType} onChange={(e) => setForm((v) => ({ ...v, systemType: e.target.value }))}>
                <option value="hospital">Hospital</option>
                <option value="dispatch_agency">Dispatch Agency</option>
                <option value="webhook_partner">Webhook Partner</option>
              </select>
              <input className="input" placeholder="Base URL / endpoint" value={form.baseUrl} onChange={(e) => setForm((v) => ({ ...v, baseUrl: e.target.value }))} />
              <select className="select" value={form.authType} onChange={(e) => setForm((v) => ({ ...v, authType: e.target.value }))}>
                <option value="none">No Auth</option>
                <option value="api_key">API Key</option>
                <option value="bearer">Bearer Token</option>
              </select>

              {form.authType !== 'none' && (
                <input
                  className="input"
                  placeholder={form.authType === 'api_key' ? 'API Key' : 'Bearer Token'}
                  value={form.secretOrToken}
                  onChange={(e) => setForm((v) => ({ ...v, secretOrToken: e.target.value }))}
                />
              )}

              <textarea className="input" rows={4} placeholder="Notes" value={form.notes} onChange={(e) => setForm((v) => ({ ...v, notes: e.target.value }))} />

              <label className="checkRow">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((v) => ({ ...v, isActive: e.target.checked }))} />
                <span>Active</span>
              </label>

              <button className="btn btn-primary" onClick={createItem}>
                Save Connection
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SystemsGroup({
  title,
  items,
  onTest,
  busyId,
}: {
  title: string;
  items: ConnectedSystem[];
  onTest: (id: string) => void;
  busyId: string | null;
}) {
  return (
    <div className="systemsGroup">
      <div className="systemsGroupTitle">{title}</div>

      {items.length === 0 ? (
        <div className="empty">No connections added yet.</div>
      ) : (
        <div className="systemsList">
          {items.map((item) => (
            <div key={item.id} className="systemCard">
              <div className="systemCardTop">
                <div>
                  <div className="systemCardTitle">{item.name}</div>
                  <div className="muted small">
                    {systemTypeLabel(item.system_type)} • {item.base_url}
                  </div>
                </div>

                <div className="systemCardBadges">
                  <span className={statusClass(item.status)}>{String(item.status).replace('_', ' ').toUpperCase()}</span>
                  <span className="pillSoft">{item.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                </div>
              </div>

              <div className="systemCardMeta muted">
                Auth: {String(item.auth_type).toUpperCase()} • Last tested: {formatDate(item.last_tested_at)}
              </div>

              {item.last_test_result ? <div className="systemCardResult">{item.last_test_result}</div> : null}
              {item.notes ? <div className="systemCardNotes">{item.notes}</div> : null}

              <div className="actionsRow">
                <button className="btn btn-small btn-primary" onClick={() => onTest(item.id)} disabled={busyId === item.id}>
                  {busyId === item.id ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
