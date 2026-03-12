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
  Search,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { hasPermission } from '../../lib/auth/access';
import { PERMISSIONS } from '../../lib/auth/permissions';

type NavItem = {
  label: string;
  to: string;
  icon: React.ReactNode;
  permission: string;
  end?: boolean;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    title: 'Dashboard',
    items: [
      { label: 'Dashboard', to: '/admin/dashboard', icon: <LayoutDashboard size={18} />, permission: PERMISSIONS.DASHBOARD_READ },
      { label: 'Dispatch Center', to: '/admin/dispatch', icon: <Ambulance size={18} />, permission: PERMISSIONS.DISPATCH_READ },
      { label: 'Request Queue', to: '/admin/requests', icon: <ClipboardList size={18} />, permission: PERMISSIONS.DISPATCH_READ },
      { label: 'Scheduling Board', to: '/admin/scheduling', icon: <Calendar size={18} />, permission: PERMISSIONS.SCHEDULING_READ },
      { label: 'Analytics', to: '/admin/analytics', icon: <BarChart3 size={18} />, permission: PERMISSIONS.ANALYTICS_READ },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Escalations', to: '/admin/escalations', icon: <AlertTriangle size={18} />, permission: PERMISSIONS.DASHBOARD_READ },
      { label: 'Unresolved Items', to: '/admin/unresolved-items', icon: <AlertTriangle size={18} />, permission: PERMISSIONS.DASHBOARD_READ },
    ],
  },
  {
    title: 'Workforce',
    items: [
      { label: 'Team', to: '/admin/team', icon: <Users size={18} />, permission: PERMISSIONS.TEAM_READ },
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
  {
    title: 'Internal',
    items: [
      { label: 'Release Readiness', to: '/admin/release-readiness', icon: <ShieldCheck size={18} />, permission: PERMISSIONS.DASHBOARD_READ },
      { label: 'Delivery Roadmap', to: '/admin/delivery-roadmap', icon: <ClipboardList size={18} />, permission: PERMISSIONS.DASHBOARD_READ },
    ],
  },
];

export default function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const initials = useMemo(() => 'HC', []);
  const { user } = useAuth();

  const filteredSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          hasPermission(user, item.permission) &&
          item.label.toLowerCase().includes(query.toLowerCase())
      ),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside className={collapsed ? 'appSidebar appSidebar-collapsed' : 'appSidebar'}>
      <div className="appSidebarCard">
        <div className="appSidebarBrandRow">
          <div className="appSidebarBrandMark">{initials}</div>

          {!collapsed ? (
            <div className="appSidebarBrandBlock">
              <div className="appSidebarBrandName">Homecare Matching App</div>
              <div className="appSidebarBrandSubtext">Admin operations</div>
            </div>
          ) : null}

          <button
            type="button"
            className="appSidebarCollapseBtn"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>

        {!collapsed ? (
          <div className="appSidebarSearchWrap">
            <label className="srOnly" htmlFor="admin-sidebar-search">
              Search navigation
            </label>
            <div className="appSidebarSearchShell">
              <Search size={16} aria-hidden="true" />
              <input
                id="admin-sidebar-search"
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
                className="appSidebarSearch"
                aria-label="Search navigation"
              />
            </div>
          </div>
        ) : null}

        <nav className="appSidebarNav" aria-label="Admin sidebar navigation">
          {filteredSections.map((section) => (
            <div key={section.title} className="appSidebarSection">
              {!collapsed ? <div className="appSidebarSectionTitle">{section.title}</div> : null}

              <div className="appSidebarItemList">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      isActive ? 'appSidebarItem appSidebarItem-active' : 'appSidebarItem'
                    }
                  >
                    <span className="appSidebarItemIcon" aria-hidden="true">
                      {item.icon}
                    </span>
                    {!collapsed ? <span className="appSidebarItemLabel">{item.label}</span> : null}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
