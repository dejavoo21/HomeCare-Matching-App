// import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { RealtimeStatusIndicator } from './RealtimeStatusIndicator';
import '../index.css';

export function Navbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <h1 className="navbar-title">🏥 Homecare Matching App</h1>
        <div className="navbar-user">
          <RealtimeStatusIndicator />
          <span>
            {user.name} ({user.role})
          </span>
          <button onClick={logout} className="btn-logout">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
