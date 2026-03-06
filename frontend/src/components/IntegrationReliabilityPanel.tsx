import { useEffect, useState } from 'react';
import { api } from '../services/api';

export function IntegrationReliabilityPanel() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [deadLetters, setDeadLetters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);

      const [subs, dels, dead] = await Promise.all([
        (api.getWebhookSubscriptions() as any) || {},
        (api.getWebhookDeliveries(20) as any) || {},
        (api.getWebhookDeadLetters(20) as any) || {},
      ]);

      setSubscriptions(subs?.data || []);
      setDeliveries(dels?.data || []);
      setDeadLetters(dead?.data || []);
    } catch (err) {
      console.error('Integration panel load error:', err);
      setSubscriptions([]);
      setDeliveries([]);
      setDeadLetters([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const replay = async (id: string) => {
    try {
      await api.replayWebhookDelivery(id);
      await load();
    } catch (err) {
      console.error('Replay failed:', err);
    }
  };

  return (
    <div className="cardShell">
      <div className="cardHeader">
        <div>
          <h3 className="cardTitle">Integration Reliability</h3>
          <p className="cardSub">Webhook subscriptions, delivery health, and dead-letter recovery</p>
        </div>
      </div>

      <div className="cardBody">
        {loading ? (
          <div className="empty">Loading integration reliability…</div>
        ) : (
          <div className="rowGap">
            <div className="analyticsStatsGrid">
              <div className="analyticsStat">
                <div className="analyticsStatLabel">Subscriptions</div>
                <div className="analyticsStatValue">{subscriptions.length}</div>
              </div>
              <div className="analyticsStat">
                <div className="analyticsStatLabel">Recent Deliveries</div>
                <div className="analyticsStatValue">{deliveries.length}</div>
              </div>
              <div className="analyticsStat">
                <div className="analyticsStatLabel">Dead Letters</div>
                <div className="analyticsStatValue">{deadLetters.length}</div>
              </div>
            </div>

            <div>
              <div className="sectionTitle">Subscriptions</div>
              {subscriptions.length === 0 ? (
                <div className="empty">No webhook subscriptions found.</div>
              ) : (
                <div className="fhirList">
                  {subscriptions.map((s) => (
                    <div key={s.id} className="fhirItem">
                      <div className="fhirItemTitle">{s.name}</div>
                      <div className="muted">{s.target_url}</div>
                      <div className="small">
                        Status: <b>{s.is_active ? 'Active' : 'Inactive'}</b>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="sectionTitle">Recent Deliveries</div>
              {deliveries.length === 0 ? (
                <div className="empty">No deliveries found.</div>
              ) : (
                <div className="fhirList">
                  {deliveries.map((d) => (
                    <div key={d.id} className="fhirItem">
                      <div className="fhirItemTitle">{d.event_type}</div>
                      <div className="muted">{d.subscription_name}</div>
                      <div className="small">
                        Status: <b>{d.status}</b> • Attempts: <b>{d.attempt_count}</b>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="sectionTitle">Dead Letters</div>
              {deadLetters.length === 0 ? (
                <div className="empty">No dead letters found.</div>
              ) : (
                <div className="fhirList">
                  {deadLetters.map((d) => (
                    <div key={d.id} className="fhirItem">
                      <div className="fhirItemTitle">{d.event_type}</div>
                      <div className="muted">{d.subscription_name}</div>
                      <div className="small">{d.last_error || 'Unknown error'}</div>
                      <div className="actionsRow" style={{ marginTop: 10 }}>
                        <button className="btn btn-small btn-primary" onClick={() => replay(d.delivery_id)}>
                          Replay
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
