import '../index.css';

export function AdminSettingsPage() {
  return (
    <div className="pageStack">
      <div className="pageHeaderBlock">
        <h1 className="pageTitle">Settings</h1>
        <p className="subtitle">System preferences, environment configuration, and platform controls.</p>
      </div>

      <section className="settingsGrid">
        <div className="settingsCard">
          <h3 className="settingsCardTitle">Platform</h3>
          <p className="settingsCardText">
            Configure environment options, feature controls, and operational defaults.
          </p>
          <div className="settingsList">
            <div className="settingsRowItem">
              <span>Environment</span>
              <strong>Production</strong>
            </div>
            <div className="settingsRowItem">
              <span>Realtime Status</span>
              <strong>Realtime paused</strong>
            </div>
            <div className="settingsRowItem">
              <span>FHIR Starter</span>
              <strong>Enabled</strong>
            </div>
          </div>
        </div>

        <div className="settingsCard">
          <h3 className="settingsCardTitle">Security</h3>
          <p className="settingsCardText">
            Review authentication posture and access-control configuration.
          </p>
          <div className="settingsList">
            <div className="settingsRowItem">
              <span>Cookie Auth</span>
              <strong>Enabled</strong>
            </div>
            <div className="settingsRowItem">
              <span>TOTP MFA</span>
              <strong>Available</strong>
            </div>
            <div className="settingsRowItem">
              <span>Audit Logging</span>
              <strong>Enabled</strong>
            </div>
          </div>
        </div>

        <div className="settingsCard settingsCard-wide">
          <h3 className="settingsCardTitle">Next Configuration Phase</h3>
          <p className="settingsCardText">
            This area is ready for environment editing, notification preferences, connection defaults,
            and integration-level controls.
          </p>
        </div>
      </section>
    </div>
  );
}
