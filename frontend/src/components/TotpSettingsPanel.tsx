import { useEffect, useState } from 'react';
import { api } from '../services/api';

export function TotpSettingsPanel() {
  const [status, setStatus] = useState<any>(null);
  const [setupData, setSetupData] = useState<any>(null);
  const [code, setCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const loadStatus = async () => {
    try {
      const resp = (await api.getTotpStatus()) as any;
      setStatus(resp?.data || null);
    } catch (err) {
      console.error('Failed to load TOTP status:', err);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const startSetup = async () => {
    try {
      setBusy(true);
      setMessage('');
      const resp = (await api.setupTotp()) as any;
      setSetupData(resp?.data || null);
    } catch (err: any) {
      setMessage(err?.message || 'Failed to start setup');
    } finally {
      setBusy(false);
    }
  };

  const confirmEnable = async () => {
    try {
      setBusy(true);
      setMessage('');
      await api.verifyEnableTotp(code);
      setMessage('Authenticator app enabled successfully.');
      setSetupData(null);
      setCode('');
      await loadStatus();
    } catch (err: any) {
      setMessage(err?.message || 'Failed to verify code');
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    try {
      setBusy(true);
      setMessage('');
      await api.disableTotp(disableCode);
      setMessage('Authenticator app disabled.');
      setDisableCode('');
      await loadStatus();
    } catch (err: any) {
      setMessage(err?.message || 'Failed to disable TOTP');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cardShell">
      <div className="cardHeader">
        <div>
          <h3 className="cardTitle">Authenticator App</h3>
          <p className="cardSub">Protect your account with time-based verification codes.</p>
        </div>
      </div>

      <div className="cardBody">
        <div className="rowGap">
          <div className="muted">
            Status: <b>{status?.enabled ? 'Enabled' : 'Not enabled'}</b>
          </div>

          {!status?.enabled && !setupData && (
            <button className="btn btn-primary" onClick={startSetup} disabled={busy}>
              {busy ? 'Starting…' : 'Set up Authenticator'}
            </button>
          )}

          {!status?.enabled && setupData && (
            <div className="totpSetupBox">
              <p>1. Scan this QR code with your authenticator app.</p>
              {setupData.qrDataUrl ? (
                <img src={setupData.qrDataUrl} alt="TOTP QR Code" className="totpQr" />
              ) : null}

              <p>2. If you cannot scan it, use this secret:</p>
              <div className="mono totpSecret">{setupData.secret}</div>

              <p>3. Enter the 6-digit code from the app:</p>
              <div className="row">
                <input
                  className="input"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  inputMode="numeric"
                />
                <button className="btn btn-primary" onClick={confirmEnable} disabled={busy || !code}>
                  Confirm
                </button>
              </div>
            </div>
          )}

          {status?.enabled && (
            <div className="totpDisableBox">
              <p>Enter a current code to disable the authenticator app.</p>
              <div className="row">
                <input
                  className="input"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                  placeholder="123456"
                  inputMode="numeric"
                />
                <button className="btn btn-danger" onClick={disable} disabled={busy || !disableCode}>
                  Disable
                </button>
              </div>
            </div>
          )}

          {message && <div className="note">{message}</div>}
        </div>
      </div>
    </div>
  );
}
