import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRealTime } from '../contexts/RealTimeContext';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { VisitCard } from '../components/VisitCard';
import { CareVisit } from '../types/index';
import { api } from '../services/api';
import '../index.css';

export function ProfessionalDashboard() {
  const { user } = useAuth();
  const { on } = useRealTime();
  const [visits, setVisits] = useState<CareVisit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadVisits = useCallback(async () => {
    try {
      const response = (await api.getProfessionalVisits()) as any;
      setVisits(response?.data || []);
    } catch (err) {
      console.error('Failed to load visits:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  // Subscribe to real-time events that affect professional dashboard
  useEffect(() => {
    const unsub1 = on('OFFER_CREATED', loadVisits);
    const unsub2 = on('OFFER_EXPIRED', loadVisits);
    const unsub3 = on('OFFER_ACCEPTED', loadVisits);
    const unsub4 = on('OFFER_DECLINED', loadVisits);
    const unsub5 = on('VISIT_STATUS_CHANGED', loadVisits);

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
    };
  }, [on, loadVisits]);

  const handleAction = async (action: string, visitId: string) => {
    try {
      setMessage('');
      if (action === 'accept') {
        await api.acceptVisit(visitId);
      } else if (action === 'decline') {
        await api.declineVisit(visitId);
      } else if (action === 'en-route') {
        await api.markEnRoute(visitId);
      } else if (action === 'complete') {
        await api.completeVisit(visitId, 'Visit completed successfully');
      }
      setMessage(`Visit ${action} successful!`);
      loadVisits();
    } catch (err) {
      setMessage(`Failed to ${action} visit`);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="loading">Loading...</div>
      </DashboardLayout>
    );
  }

  const assignedVisits = visits.filter((v) => v.status === 'ASSIGNED');
  const activeVisits = visits.filter(
    (v) => v.status === 'ACCEPTED' || v.status === 'EN_ROUTE'
  );
  const completedVisits = visits.filter((v) => v.status === 'COMPLETED');

  return (
    <DashboardLayout>
      <div className="dashboard-page">
        <h1>Welcome, {user?.name}!</h1>
        <p className="subtitle">Professional Care Portal</p>

        {message && (
          <div className="alert alert-info">{message}</div>
        )}

        {assignedVisits.length > 0 && (
          <div className="dashboard-section">
            <h2>📋 New Assignments</h2>
            <div className="grid">
              {assignedVisits.map((visit) => (
                <VisitCard
                  key={visit.id}
                  visit={visit}
                  onAction={handleAction}
                />
              ))}
            </div>
          </div>
        )}

        {activeVisits.length > 0 && (
          <div className="dashboard-section">
            <h2>🚗 Active Visits</h2>
            <div className="grid">
              {activeVisits.map((visit) => (
                <VisitCard
                  key={visit.id}
                  visit={visit}
                  onAction={handleAction}
                />
              ))}
            </div>
          </div>
        )}

        {completedVisits.length > 0 && (
          <div className="dashboard-section">
            <h2>✅ Completed Visits</h2>
            <div className="grid">
              {completedVisits.map((visit) => (
                <VisitCard key={visit.id} visit={visit} />
              ))}
            </div>
          </div>
        )}

        {visits.length === 0 && (
          <div className="empty-state">
            <p>No visits assigned yet.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
