// import React from 'react';
import { CareRequest } from '../types/index';

interface RequestCardProps {
  request: CareRequest;
  onViewDetails?: (request: CareRequest) => void;
}

export function RequestCard({ request, onViewDetails }: RequestCardProps) {
  const statusColors: Record<string, string> = {
    PENDING: '#ffc107',
    ASSIGNED: '#17a2b8',
    ACCEPTED: '#28a745',
    EN_ROUTE: '#007bff',
    COMPLETED: '#6c757d',
    CANCELLED: '#dc3545',
  };

  const urgencyColors: Record<string, string> = {
    LOW: '#28a745',
    MEDIUM: '#ffc107',
    HIGH: '#fd7e14',
    CRITICAL: '#dc3545',
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3>{request.description}</h3>
        <span
          className="badge"
          style={{ backgroundColor: statusColors[request.status] }}
        >
          {request.status}
        </span>
      </div>
      <div className="card-body">
        <p>
          <strong>Service:</strong> {request.serviceType}
        </p>
        <p>
          <strong>Address:</strong> {request.address}
        </p>
        <p>
          <strong>Scheduled:</strong>{' '}
          {new Date(request.scheduledDateTime).toLocaleString()}
        </p>
        <p>
          <strong>Urgency:</strong>{' '}
          <span style={{ color: urgencyColors[request.urgency] }}>
            {request.urgency}
          </span>
        </p>
        {request.medication && (
          <p>
            <strong>Medication:</strong> {request.medication}
          </p>
        )}
      </div>
      <div className="card-footer">
        {onViewDetails && (
          <button
            onClick={() => onViewDetails(request)}
            className="btn-primary"
          >
            View Details
          </button>
        )}
      </div>
    </div>
  );
}
