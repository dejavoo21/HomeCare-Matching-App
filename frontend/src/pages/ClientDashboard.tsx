import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRealTime } from '../contexts/RealTimeContext';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { RequestCard } from '../components/RequestCard';
import { CareRequest } from '../types/index';
import { api } from '../services/api';
import '../index.css';

export function ClientDashboard() {
  const { user } = useAuth();
  const { on } = useRealTime();
  const [requests, setRequests] = useState<CareRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadRequests = useCallback(async () => {
    try {
      const response = (await api.getClientRequests()) as any;
      setRequests(response?.data || []);
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Subscribe to real-time events affecting client dashboard
  useEffect(() => {
    const unsub1 = on('REQUEST_STATUS_CHANGED', loadRequests);
    const unsub2 = on('VISIT_STATUS_CHANGED', loadRequests);

    return () => {
      unsub1();
      unsub2();
    };
  }, [on, loadRequests]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="loading">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="dashboard-page">
        <h1>Welcome, {user?.name}!</h1>
        <p className="subtitle">Manage your care requests</p>

        <div className="dashboard-section">
          <h2>Your Care Requests</h2>
          <a href="/create-request" className="btn-primary">
            + Create New Request
          </a>

          {requests.length === 0 ? (
            <div className="empty-state">
              <p>No care requests yet.</p>
              <a href="/create-request" className="btn-primary">
                Create Your First Request
              </a>
            </div>
          ) : (
            <div className="grid">
              {requests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
