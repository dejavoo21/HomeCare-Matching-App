import React, { useEffect, useState } from 'react';
import { Navbar } from '../components/Navbar';
import { CommandBar } from '../components/CommandBar';
import { AiHelper } from '../components/AiHelper';
import { CommandPalette } from '../components/CommandPalette';
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
  paletteContextRequestId?: string | null;
}

export function DashboardLayout({
  children,
  stats,
  isConnected,
  onSearchSelect,
  searchScope = 'admin',
  paletteContextRequestId,
}: DashboardLayoutProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Ctrl+K (Cmd+K on Mac) / Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === 'Escape') setPaletteOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="appShell">
      <Navbar />

      <div className="appBody">
        <CommandBar
          stats={stats}
          isConnected={isConnected}
          onSearchSelect={onSearchSelect}
          searchScope={searchScope}
        />

        <div className="container">
          <div className="content">{children}</div>
        </div>
      </div>

      <AiHelper />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSearchSelect={onSearchSelect}
        contextRequestId={paletteContextRequestId || null}
      />
    </div>
  );
}
