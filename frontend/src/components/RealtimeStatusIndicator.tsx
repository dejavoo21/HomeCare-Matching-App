// import React from 'react';
import { useRealTime } from '../contexts/RealTimeContext';

export function RealtimeStatusIndicator() {
  const { state } = useRealTime();

  const getColor = (): string => {
    switch (state) {
      case 'connected':
        return '#4caf50'; // green
      case 'reconnecting':
        return '#ff9800'; // amber
      case 'disconnected':
        return '#d32f2f'; // red
      default:
        return '#999';
    }
  };

  const getLabel = (): string => {
    switch (state) {
      case 'connected':
        return 'Live';
      case 'reconnecting':
        return 'Reconnecting…';
      case 'disconnected':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        fontWeight: '500',
        color: getColor(),
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: getColor(),
          display: 'inline-block',
        }}
      />
      {getLabel()}
    </div>
  );
}
