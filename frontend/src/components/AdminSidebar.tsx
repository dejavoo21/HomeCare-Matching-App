import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/dispatch', label: 'Dispatch' },
  { to: '/admin/team', label: 'Team' },
  { to: '/admin/access', label: 'Access Management' },
  { to: '/admin/audit', label: 'Audit & Compliance' },
  { to: '/admin/analytics', label: 'Analytics' },
  { to: '/admin/integrations', label: 'Integrations' },
  { to: '/admin/integrations/reliability', label: 'Reliability' },
  { to: '/admin/integrations/fhir', label: 'FHIR API' },
];

export function AdminSidebar() {
  return (
    <aside className="adminSidebar" aria-label="Admin navigation">
      <h2 className="adminSidebarTitle">Admin Console</h2>
      <nav className="adminSidebarNav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => (isActive ? 'adminSidebarLink active' : 'adminSidebarLink')}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
