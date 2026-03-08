import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useRealTime } from '../contexts/RealTimeContext';

type TotpStatus = {
  enabled?: boolean;
  exists?: boolean;
  verifiedAt?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
}

export function AdminSettingsPage() {
  const { state } = useRealTime();
  const [totpStatus, setTotpStatus] = useState<TotpStatus | null>(null);
  const [connectedSystemsCount, setConnectedSystemsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);

      const [totpResp, systemsResp] = await Promise.allSettled([
        api.getTotpStatus() as Promise<any>,
        api.getConnectedSystems() as Promise<any>,
      ]);

      if (totpResp.status === 'fulfilled') {
        setTotpStatus(totpResp.value?.data || null);
      } else {
        setTotpStatus(null);
      }

      if (systemsResp.status === 'fulfilled') {
        const rows = systemsResp.value?.data || [];
        setConnectedSystemsCount(Array.isArray(rows) ? rows.length : 0);
      } else {
        setConnectedSystemsCount(0);
      }
    } catch (err) {
      console.error('Failed to load settings page:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const realtimeLabel =
    state === 'connected'
      ? 'Connected'
      : state === 'reconnecting'
        ? 'Reconnecting'
        : 'Paused';

  return (
    <main className="pageStack" role="main" aria-label="Settings page">
      <section className="pageHeaderBlock">
        <div className="pageHeaderRow">
          <div>
            <h1 className="pageTitle">Settings</h1>
            <p className="subtitle">
              Review platform configuration, security posture, and integration defaults.
            </p>
          </div>

          <div className="pageActions">
            <button className="btn btn-primary" onClick={load}>
              Refresh Settings
            </button>
          </div>
        </div>
      </section>

      <section className="settingsOverviewGrid">
        <div className="settingsOverviewCard">
          <div className="settingsOverviewLabel">Realtime</div>
          <div className="settingsOverviewValue">{realtimeLabel}</div>
        </div>

        <div className="settingsOverviewCard">
          <div className="settingsOverviewLabel">Connected Systems</div>
          <div className="settingsOverviewValue">{connectedSystemsCount}</div>
        </div>

        <div className="settingsOverviewCard">
          <div className="settingsOverviewLabel">MFA</div>
          <div className="settingsOverviewValue">
            {totpStatus?.enabled ? 'Enabled' : 'Available'}
          </div>
        </div>

        <div className="settingsOverviewCard">
          <div className="settingsOverviewLabel">Environment</div>
          <div className="settingsOverviewValue">Production Ready</div>
        </div>
      </section>

      {loading ? (
        <section className="pageCard">
          <div className="empty">Loading settings...</div>
        </section>
      ) : (
        <section className="settingsGrid">
          <div className="settingsCard">
            <h3 className="settingsCardTitle">Platform</h3>
            <p className="settingsCardText">
              Core operational defaults and service-level platform readiness.
            </p>

            <div className="settingsList">
              <div className="settingsRowItem">
                <span>Admin Console</span>
                <strong>Enabled</strong>
              </div>
              <div className="settingsRowItem">
                <span>Realtime Events</span>
                <strong>{realtimeLabel}</strong>
              </div>
              <div className="settingsRowItem">
                <span>Operational Dashboard</span>
                <strong>Configured</strong>
              </div>
            </div>
          </div>

          <div className="settingsCard">
            <h3 className="settingsCardTitle">Security</h3>
            <p className="settingsCardText">
              Authentication, session handling, and account protection settings.
            </p>

            <div className="settingsList">
              <div className="settingsRowItem">
                <span>Cookie-based Auth</span>
                <strong>Enabled</strong>
              </div>
              <div className="settingsRowItem">
                <span>TOTP MFA</span>
                <strong>{totpStatus?.enabled ? 'Enabled' : 'Available'}</strong>
              </div>
              <div className="settingsRowItem">
                <span>TOTP Verified</span>
                <strong>{formatDate(totpStatus?.verifiedAt)}</strong>
              </div>
              <div className="settingsRowItem">
                <span>Audit Logging</span>
                <strong>Enabled</strong>
              </div>
            </div>
          </div>

          <div className="settingsCard">
            <h3 className="settingsCardTitle">Integrations</h3>
            <p className="settingsCardText">
              Hospital, dispatch agency, and partner connectivity defaults.
            </p>

            <div className="settingsList">
              <div className="settingsRowItem">
                <span>Connected Systems</span>
                <strong>{connectedSystemsCount}</strong>
              </div>
              <div className="settingsRowItem">
                <span>FHIR Starter</span>
                <strong>Enabled</strong>
              </div>
              <div className="settingsRowItem">
                <span>Webhook Reliability</span>
                <strong>Enabled</strong>
              </div>
            </div>
          </div>

          <div className="settingsCard">
            <h3 className="settingsCardTitle">Environment</h3>
            <p className="settingsCardText">
              Deployment readiness and operational environment posture.
            </p>

            <div className="settingsList">
              <div className="settingsRowItem">
                <span>Deployment Mode</span>
                <strong>Railway-ready</strong>
              </div>
              <div className="settingsRowItem">
                <span>Health Endpoints</span>
                <strong>Configured</strong>
              </div>
              <div className="settingsRowItem">
                <span>Structured Logging</span>
                <strong>Enabled</strong>
              </div>
            </div>
          </div>

          <div className="settingsCard settingsCard-wide">
            <h3 className="settingsCardTitle">Next Configuration Phase</h3>
            <p className="settingsCardText">
              This section is ready for feature flags, notification defaults, integration-level
              settings, environment editing, and policy-based admin configuration.
            </p>
          </div>
        </section>
      )}
    </main>
  );
}
