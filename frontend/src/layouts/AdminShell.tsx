import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { AssistantWidget } from '../components/AssistantWidget';
import AdminSidebar from '../components/layout/AdminSidebar';
import '../index.css';

export function AdminShell() {
  return (
    <div className="adminShell">
      <a href="#main-content" className="skipLink">
        Skip to main content
      </a>

      <Navbar />

      <div className="adminShellLayout">
        <AdminSidebar />
        <main id="main-content" className="adminContent">
          <Outlet />
        </main>
      </div>

      <AssistantWidget />
    </div>
  );
}
