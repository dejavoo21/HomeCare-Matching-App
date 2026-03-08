import { ConnectedSystemsPanel } from '../components/ConnectedSystemsPanel';
import '../index.css';

export function AdminIntegrationsPage() {
  return (
    <div className="pageStack">
      <div className="pageHeaderBlock">
        <h1 className="pageTitle">Connected Systems</h1>
        <p className="subtitle">Hospitals, dispatch agencies, and partner integrations</p>
      </div>
      <ConnectedSystemsPanel />
    </div>
  );
}
