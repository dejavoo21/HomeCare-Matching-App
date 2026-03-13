import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  Radio,
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
  icon: React.ReactNode;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    title: 'Dashboard',
    icon: <LayoutDashboard size={18} />,
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
    icon: <AlertTriangle size={18} />,
    items: [
      { label: 'Escalations', to: '/admin/escalations', icon: <AlertTriangle size={18} />, permission: PERMISSIONS.DASHBOARD_READ },
      { label: 'Unresolved Items', to: '/admin/unresolved-items', icon: <AlertTriangle size={18} />, permission: PERMISSIONS.DASHBOARD_READ },
    ],
  },
  {
    title: 'Workforce',
    icon: <Users size={18} />,
    items: [
      { label: 'Team', to: '/admin/team', icon: <Users size={18} />, permission: PERMISSIONS.TEAM_READ },
      { label: 'Clinician Review', to: '/admin/clinician-review', icon: <ClipboardList size={18} />, permission: PERMISSIONS.NOTES_REVIEW },
    ],
  },
  {
    title: 'Compliance',
    icon: <ShieldCheck size={18} />,
    items: [
      { label: 'Audit', to: '/admin/audit', icon: <ShieldCheck size={18} />, permission: PERMISSIONS.AUDIT_READ },
      { label: 'Reliability', to: '/admin/integrations/reliability', icon: <Database size={18} />, permission: PERMISSIONS.RELIABILITY_READ },
      { label: 'FHIR API', to: '/admin/integrations/fhir', icon: <Files size={18} />, permission: PERMISSIONS.FHIR_READ },
    ],
  },
  {
    title: 'Platform',
    icon: <Plug size={18} />,
    items: [
      { label: 'Connected Systems', to: '/admin/integrations', icon: <Plug size={18} />, permission: PERMISSIONS.CONNECTED_SYSTEMS_READ, end: true },
      { label: 'Access Requests', to: '/admin/access', icon: <UserCheck size={18} />, permission: PERMISSIONS.ACCESS_REQUESTS_READ },
      { label: 'Settings', to: '/admin/settings', icon: <Settings size={18} />, permission: PERMISSIONS.DASHBOARD_READ },
    ],
  },
  {
    title: 'Internal',
    icon: <Radio size={18} />,
    items: [
      { label: 'Release Readiness', to: '/admin/release-readiness', icon: <ShieldCheck size={18} />, permission: PERMISSIONS.DASHBOARD_READ },
      { label: 'Delivery Roadmap', to: '/admin/delivery-roadmap', icon: <ClipboardList size={18} />, permission: PERMISSIONS.DASHBOARD_READ },
    ],
  },
];

function matchesPath(pathname: string, item: NavItem) {
  if (item.end) {
    return pathname === item.to;
  }

  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export default function AdminSidebar() {
  const [query, setQuery] = useState('');
  const [activeSectionTitle, setActiveSectionTitle] = useState('Dashboard');
  const initials = useMemo(() => 'HC', []);
  const { user } = useAuth();
  const location = useLocation();

  const allowedSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => hasPermission(user, item.permission)),
    }))
    .filter((section) => section.items.length > 0);

  useEffect(() => {
    const matchedSection = allowedSections.find((section) =>
      section.items.some((item) => matchesPath(location.pathname, item))
    );

    if (matchedSection) {
      setActiveSectionTitle(matchedSection.title);
      return;
    }

    if (!allowedSections.some((section) => section.title === activeSectionTitle) && allowedSections[0]) {
      setActiveSectionTitle(allowedSections[0].title);
    }
  }, [activeSectionTitle, allowedSections, location.pathname]);

  const activeSection =
    allowedSections.find((section) => section.title === activeSectionTitle) ?? allowedSections[0];

  const visibleItems = activeSection
    ? activeSection.items.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <aside className="appSidebar appSidebarShell">
      <div className="appSidebarCard">
        <div className="appSidebarRail">
          <div className="appSidebarRailBrand" aria-hidden="true">
            {initials}
          </div>

          <nav className="appSidebarRailNav" aria-label="Admin sections">
            {allowedSections.map((section) => {
              const isSelected = section.title === activeSection?.title;
              const containsActiveRoute = section.items.some((item) => matchesPath(location.pathname, item));

              return (
                <button
                  key={section.title}
                  type="button"
                  className={
                    isSelected
                      ? 'appSidebarRailItem appSidebarRailItem-selected'
                      : containsActiveRoute
                        ? 'appSidebarRailItem appSidebarRailItem-current'
                        : 'appSidebarRailItem'
                  }
                  onClick={() => setActiveSectionTitle(section.title)}
                  aria-label={section.title}
                  title={section.title}
                >
                  {section.icon}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="appSidebarPane">
          <div className="appSidebarPaneHeader">
            <div className="appSidebarPaneBrandRow">
              <div className="appSidebarPaneBrandMark">{initials}</div>
              <div className="appSidebarPaneBrandText">
                <div className="appSidebarPaneBrandName">Homecare Matching App</div>
                <div className="appSidebarPaneBrandMeta">Admin operations</div>
              </div>
            </div>

            <div className="appSidebarPaneContext">
              <div className="appSidebarPaneEyebrow">{activeSection?.title ?? 'Navigation'}</div>
              <div className="appSidebarPaneTitle">
                {activeSection?.items.find((item) => matchesPath(location.pathname, item))?.label ??
                  activeSection?.title ??
                  'Overview'}
              </div>
            </div>
          </div>

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

          <nav className="appSidebarNav" aria-label={`${activeSection?.title ?? 'Admin'} navigation`}>
            <div className="appSidebarSectionTitle">{activeSection?.title ?? 'Overview'}</div>
            <div className="appSidebarItemList">
              {visibleItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    isActive ? 'appSidebarItem appSidebarItem-active' : 'appSidebarItem'
                  }
                >
                  <span className="appSidebarItemIcon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="appSidebarItemLabel">{item.label}</span>
                  <span className="appSidebarItemStatus" aria-hidden="true" />
                </NavLink>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </aside>
  );
}
