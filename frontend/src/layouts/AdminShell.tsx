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
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { AssistantWidget } from '../components/AssistantWidget';
import { useCommunication } from '../contexts/CommunicationContext';
import '../index.css';

type NavItemProps = {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
  badge?: string;
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
      { to: '/admin/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
      { to: '/admin/dispatch', icon: <Ambulance size={18} />, label: 'Dispatch' },
      { to: '/admin/scheduling', icon: <Calendar size={18} />, label: 'Scheduling Board' },
      { to: '/admin/analytics', icon: <BarChart3 size={18} />, label: 'Analytics' },
    ],
  },
  {
    label: 'Workforce',
    items: [
      { to: '/admin/team', icon: <Users size={18} />, label: 'Team' },
      { to: '/admin/clinician-review', icon: <ClipboardList size={18} />, label: 'Clinician Review' },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { to: '/admin/audit', icon: <ShieldCheck size={18} />, label: 'Audit' },
      {
        to: '/admin/integrations/reliability',
        icon: <Database size={18} />,
        label: 'Reliability',
      },
      { to: '/admin/integrations/fhir', icon: <Files size={18} />, label: 'FHIR API' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { to: '/admin/integrations', icon: <Plug size={18} />, label: 'Connected Systems', end: true },
      { to: '/admin/access', icon: <UserCheck size={18} />, label: 'Access Requests' },
      { to: '/admin/settings', icon: <Settings size={18} />, label: 'Settings' },
    ],
  },
];

export function AdminShell() {
  const { summary } = useCommunication();

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
                <div key={section.label} className="adminNavSection">
                  <div className="adminNavSectionLabel">{section.label}</div>

                  <div className="adminNav">
                    {section.items.map((item) => (
                      <AdminNavItem
                        key={item.to}
                        to={item.to}
                        icon={item.icon}
                        label={item.label}
                        end={item.end}
                        badge={
                          item.to === '/admin/team' && summary.unreadMessages > 0
                            ? String(summary.unreadMessages)
                            : undefined
                        }
                      />
                    ))}
                  </div>
                </div>
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
