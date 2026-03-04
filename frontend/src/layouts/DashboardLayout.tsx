import React from 'react';
import { Navbar } from '../components/Navbar';
import { CommandBar } from '../components/CommandBar';
import { AiHelper } from '../components/AiHelper';
import '../index.css';

interface SearchItem {
  kind: 'request' | 'user' | 'event';
  id: string;
  title: string;
  subtitle?: string;
  meta?: any;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  stats?: {
    queuedRequests: number;
    offeredRequests: number;
    acceptedRequests: number;
    enRouteRequests: number;
  };
  isConnected?: boolean;
  onSearchSelect?: (item: SearchItem) => void;
  searchScope?: 'admin';
}

export function DashboardLayout({
  children,
  stats,
  isConnected,
  onSearchSelect,
  searchScope = 'admin',
}: DashboardLayoutProps) {
  return (
    <div className="dashboard-layout">
      <Navbar />
      <CommandBar
        stats={stats}
        isConnected={isConnected}
        onSearchSelect={onSearchSelect}
        searchScope={searchScope}
      />
      <div className="dashboard-container">
        <div className="dashboard-content">{children}</div>
      </div>
      <AiHelper />
    </div>
  );
}
