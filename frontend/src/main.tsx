import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './contexts/AuthContext';
import { CommunicationProvider } from './contexts/CommunicationContext';
import { RealTimeProvider } from './contexts/RealTimeContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <RealTimeProvider>
        <CommunicationProvider>
          <App />
        </CommunicationProvider>
      </RealTimeProvider>
    </AuthProvider>
  </React.StrictMode>
);
