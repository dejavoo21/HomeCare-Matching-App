import { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  AlertTriangle,
  Ambulance,
  BarChart3,
  Calendar,
  ClipboardList,
  Database,
  Files,
  LayoutDashboard,
  Plug,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import { useCommunication } from '../../contexts/CommunicationContext';
import { useAuth } from '../../contexts/AuthContext';
import { hasPermission } from '../../lib/auth/access';
import { PERMISSIONS } from '../../lib/auth/permissions';

type NavItem = {
  label: string;
  to: string;
  icon: React.ReactNode;
  permission: string;
  end?: boolean;
  badge?: 'messages';
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    title: 'Operations',
    items: [
      { label: 'Dashboard', to: '/admin/dashboard', icon: <LayoutDashboard size={18} />, permission: PERMISSIONS.DASHBOARD_READ },
      { label: 'Release Readiness', to: '/admin/release-readiness', icon: <ShieldCheck size={18} />, permission: PERMISSIONS.DASHBOARD_READ },
      { label: 'Delivery Roadmap', to: '/admin/delivery-roadmap', icon: <ClipboardList size={18} />, permission: PERMISSIONS.DASHBOARD_READ },
      { label: 'Escalations', to: '/admin/escalations', icon: <AlertTriangle size={18} />, permission: PERMISSIONS.DASHBOARD_READ },
      { label: 'Unresolved Items', to: '/admin/unresolved-items', icon: <AlertTriangle size={18} />, permission: PERMISSIONS.DASHBOARD_READ },
      { label: 'Dispatch Center', to: '/admin/dispatch', icon: <Ambulance size={18} />, permission: PERMISSIONS.DISPATCH_READ },
      { label: 'Request Queue', to: '/admin/requests', icon: <ClipboardList size={18} />, permission: PERMISSIONS.DISPATCH_READ },
      { label: 'Scheduling Board', to: '/admin/scheduling', icon: <Calendar size={18} />, permission: PERMISSIONS.SCHEDULING_READ },
      { label: 'Analytics', to: '/admin/analytics', icon: <BarChart3 size={18} />, permission: PERMISSIONS.ANALYTICS_READ },
    ],
  },
  {
    title: 'Workforce',
    items: [
      { label: 'Team', to: '/admin/team', icon: <Users size={18} />, permission: PERMISSIONS.TEAM_READ, badge: 'messages' },
      { label: 'Clinician Review', to: '/admin/clinician-review', icon: <ClipboardList size={18} />, permission: PERMISSIONS.NOTES_REVIEW },
    ],
  },
  {
    title: 'Compliance',
    items: [
      { label: 'Audit', to: '/admin/audit', icon: <ShieldCheck size={18} />, permission: PERMISSIONS.AUDIT_READ },
      { label: 'Reliability', to: '/admin/integrations/reliability', icon: <Database size={18} />, permission: PERMISSIONS.RELIABILITY_READ },
      { label: 'FHIR API', to: '/admin/integrations/fhir', icon: <Files size={18} />, permission: PERMISSIONS.FHIR_READ },
    ],
  },
  {
    title: 'Platform',
    items: [
      { label: 'Connected Systems', to: '/admin/integrations', icon: <Plug size={18} />, permission: PERMISSIONS.CONNECTED_SYSTEMS_READ, end: true },
      { label: 'Access Requests', to: '/admin/access', icon: <UserCheck size={18} />, permission: PERMISSIONS.ACCESS_REQUESTS_READ },
      { label: 'Settings', to: '/admin/settings', icon: <Settings size={18} />, permission: PERMISSIONS.DASHBOARD_READ },
    ],
  },
];

export default function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const initials = useMemo(() => 'HC', []);
  const { summary } = useCommunication();
  const { user } = useAuth();

  return (
    <aside className={collapsed ? 'adminSidebar adminSidebar-collapsed' : 'adminSidebar'} aria-label="Admin navigation">
      <div className="adminSidebarInner">
        <div className="adminSidebarBrand">
          <div className="adminSidebarBrandMark">{initials}</div>

          {!collapsed ? (
            <div className="adminSidebarBrandText">
              <div className="adminSidebarBrandEyebrow">Admin Console</div>
              <div className="adminSidebarBrandName">Operations Hub</div>
            </div>
          ) : null}

          <button
            type="button"
            className="adminSidebarToggle"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="adminSidebarNav">
          {navSections.map((section) => {
            const visibleItems = section.items.filter((item) => hasPermission(user, item.permission));

            if (!visibleItems.length) return null;

            return (
              <div key={section.title} className="adminSidebarSection">
                {!collapsed ? <div className="adminSidebarSectionTitle">{section.title}</div> : null}

                <div className="adminSidebarSectionItems">
                  {visibleItems.map((item) => {
                    const badge =
                      item.badge === 'messages' && summary.unreadMessages > 0
                        ? String(summary.unreadMessages)
                        : undefined;

                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                          isActive ? 'adminSidebarLink adminSidebarLink-active' : 'adminSidebarLink'
                        }
                        title={collapsed ? item.label : undefined}
                      >
                        <span className="adminSidebarIcon" aria-hidden="true">
                          {item.icon}
                        </span>
                        {!collapsed ? <span className="adminSidebarLabel">{item.label}</span> : null}
                        {!collapsed && badge ? <span className="adminSidebarBadge">{badge}</span> : null}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
