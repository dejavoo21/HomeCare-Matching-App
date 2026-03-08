import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  Users,
  ShieldCheck,
  FileSearch,
  BarChart3,
  Plug,
  ActivitySquare,
  Files,
  Settings,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import '../index.css';

type NavItemProps = {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
};

function AdminNavItem({ to, icon, label, end }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        isActive ? 'adminNavItem adminNavItem-active' : 'adminNavItem'
      }
    >
      <span className="adminNavIcon" aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
    </NavLink>
  );
}

export function AdminShell() {
  return (
    <div className="adminShell">
      <Navbar />

      <div className="adminShellBody">
        <aside className="adminSidebar" aria-label="Admin navigation">
          <div className="adminSidebarInner">
            <div className="adminSidebarHeader">
              <div className="adminSidebarEyebrow">Admin Console</div>
              <div className="adminSidebarTitle">Operations</div>
            </div>

            <nav className="adminNav">
              <AdminNavItem
                to="/admin/dashboard"
                icon={<LayoutDashboard size={18} />}
                label="Dashboard"
              />
              <AdminNavItem
                to="/admin/dispatch"
                icon={<ClipboardList size={18} />}
                label="Dispatch"
              />
              <AdminNavItem
                to="/admin/scheduling"
                icon={<CalendarDays size={18} />}
                label="Scheduling"
              />
              <AdminNavItem
                to="/admin/team"
                icon={<Users size={18} />}
                label="Team"
              />
              <AdminNavItem
                to="/admin/access"
                icon={<ShieldCheck size={18} />}
                label="Access Management"
              />
              <AdminNavItem
                to="/admin/audit"
                icon={<FileSearch size={18} />}
                label="Audit & Compliance"
              />
              <AdminNavItem
                to="/admin/analytics"
                icon={<BarChart3 size={18} />}
                label="Analytics"
              />

              <div className="adminNavGroupLabel">Integrations</div>

              <AdminNavItem
                to="/admin/integrations"
                icon={<Plug size={18} />}
                label="Connected Systems"
                end
              />
              <AdminNavItem
                to="/admin/integrations/reliability"
                icon={<ActivitySquare size={18} />}
                label="Reliability"
              />
              <AdminNavItem
                to="/admin/integrations/fhir"
                icon={<Files size={18} />}
                label="FHIR API"
              />

              <div className="adminNavGroupLabel">Configuration</div>

              <AdminNavItem
                to="/admin/settings"
                icon={<Settings size={18} />}
                label="Settings"
              />
            </nav>
          </div>
        </aside>

        <section className="adminContent">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
