// import React from 'react';
import { CareVisit } from '../types/index';

interface VisitCardProps {
  visit: CareVisit;
  onAction?: (action: string, visitId: string) => void;
  showProfessional?: boolean;
}

export function VisitCard({ visit, onAction, showProfessional }: VisitCardProps) {
  const statusColors: Record<string, string> = {
    PENDING: '#ffc107',
    ASSIGNED: '#17a2b8',
    ACCEPTED: '#28a745',
    EN_ROUTE: '#007bff',
    COMPLETED: '#6c757d',
    CANCELLED: '#dc3545',
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3>Visit #{visit.id.substring(0, 8)}</h3>
        <span
          className="badge"
          style={{ backgroundColor: statusColors[visit.status] }}
        >
          {visit.status}
        </span>
      </div>
      <div className="card-body">
        <p>
          <strong>Request ID:</strong> {visit.requestId.substring(0, 8)}
        </p>
        <p>
          <strong>Scheduled:</strong>{' '}
          {new Date(visit.scheduledDateTime).toLocaleString()}
        </p>
        {showProfessional && (
          <p>
            <strong>Professional:</strong> {visit.professionalId}
          </p>
        )}
        {visit.completedDateTime && (
          <p>
            <strong>Completed:</strong>{' '}
            {new Date(visit.completedDateTime).toLocaleString()}
          </p>
        )}
        {visit.notes && (
          <p>
            <strong>Notes:</strong> {visit.notes}
          </p>
        )}
      </div>
      {onAction && (
        <div className="card-footer">
          {visit.status === 'ASSIGNED' && (
            <button
              onClick={() => onAction('accept', visit.id)}
              className="btn-primary"
            >
              Accept
            </button>
          )}
          {visit.status === 'ACCEPTED' && (
            <button
              onClick={() => onAction('en-route', visit.id)}
              className="btn-primary"
            >
              Mark En Route
            </button>
          )}
          {visit.status === 'EN_ROUTE' && (
            <button
              onClick={() => onAction('complete', visit.id)}
              className="btn-primary"
            >
              Complete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
