import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Ambulance,
  Calendar,
  Users,
  ClipboardList,
  ShieldCheck,
  Database,
  Plug,
  Settings,
  UserCheck,
  BarChart3,
  Files,
  AlertTriangle,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { AssistantWidget } from '../components/AssistantWidget';
import { useCommunication } from '../contexts/CommunicationContext';
import { useAuth } from '../contexts/AuthContext';
import { hasPermission } from '../lib/auth/access';
import { PERMISSIONS } from '../lib/auth/permissions';
import '../index.css';

type NavItemProps = {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
  badge?: string;
  permission: string;
};

type NavSection = {
  label: string;
  items: NavItemProps[];
};

function AdminNavItem({ to, icon, label, end, badge }: NavItemProps) {
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
      {badge ? <span className="adminNavBadge">{badge}</span> : null}
    </NavLink>
  );
}

const navSections: NavSection[] = [
  {
    label: 'Operations',
    items: [
      { to: '/admin/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard', permission: PERMISSIONS.DASHBOARD_READ },
      { to: '/admin/unresolved-items', icon: <AlertTriangle size={18} />, label: 'Unresolved Items', permission: PERMISSIONS.DASHBOARD_READ },
      { to: '/admin/dispatch', icon: <Ambulance size={18} />, label: 'Dispatch Center', permission: PERMISSIONS.DISPATCH_READ },
      { to: '/admin/requests', icon: <ClipboardList size={18} />, label: 'Request Queue', permission: PERMISSIONS.DISPATCH_READ },
      { to: '/admin/scheduling', icon: <Calendar size={18} />, label: 'Scheduling Board', permission: PERMISSIONS.SCHEDULING_READ },
      { to: '/admin/analytics', icon: <BarChart3 size={18} />, label: 'Analytics', permission: PERMISSIONS.ANALYTICS_READ },
    ],
  },
  {
    label: 'Workforce',
    items: [
      { to: '/admin/team', icon: <Users size={18} />, label: 'Team', permission: PERMISSIONS.TEAM_READ },
      { to: '/admin/clinician-review', icon: <ClipboardList size={18} />, label: 'Clinician Review', permission: PERMISSIONS.NOTES_REVIEW },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { to: '/admin/audit', icon: <ShieldCheck size={18} />, label: 'Audit', permission: PERMISSIONS.AUDIT_READ },
      {
        to: '/admin/integrations/reliability',
        icon: <Database size={18} />,
        label: 'Reliability',
        permission: PERMISSIONS.RELIABILITY_READ,
      },
      { to: '/admin/integrations/fhir', icon: <Files size={18} />, label: 'FHIR API', permission: PERMISSIONS.FHIR_READ },
    ],
  },
  {
    label: 'Platform',
    items: [
      { to: '/admin/integrations', icon: <Plug size={18} />, label: 'Connected Systems', end: true, permission: PERMISSIONS.CONNECTED_SYSTEMS_READ },
      { to: '/admin/access', icon: <UserCheck size={18} />, label: 'Access Requests', permission: PERMISSIONS.ACCESS_REQUESTS_READ },
      { to: '/admin/settings', icon: <Settings size={18} />, label: 'Settings', permission: PERMISSIONS.DASHBOARD_READ },
    ],
  },
];

export function AdminShell() {
  const { summary } = useCommunication();
  const { user } = useAuth();

  return (
    <div className="adminShell">
      <Navbar />

      <div className="adminShellBody">
        <aside className="adminSidebar" aria-label="Admin navigation">
          <div className="adminSidebarInner">
            <div className="adminSidebarHeader">
              <div className="adminSidebarEyebrow">Admin Console</div>
              <div className="adminSidebarTitle">Operations Hub</div>
            </div>

            <nav className="adminSidebarNav">
              {navSections.map((section) => (
                (() => {
                  const visibleItems = section.items.filter((item) =>
                    hasPermission(user, item.permission)
                  );

                  if (!visibleItems.length) return null;

                  return (
                    <div key={section.label} className="adminNavSection">
                      <div className="adminNavSectionLabel">{section.label}</div>

                      <div className="adminNav">
                        {visibleItems.map((item) => (
                          <AdminNavItem
                            key={item.to}
                            to={item.to}
                            icon={item.icon}
                            label={item.label}
                            end={item.end}
                            permission={item.permission}
                            badge={
                              item.to === '/admin/team' && summary.unreadMessages > 0
                                ? String(summary.unreadMessages)
                                : undefined
                            }
                          />
                        ))}
                      </div>
                    </div>
                  );
                })()
              ))}
            </nav>
          </div>
        </aside>

        <section className="adminContent">
          <Outlet />
        </section>
      </div>

      <AssistantWidget />
    </div>
  );
}
