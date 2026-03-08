import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/admin/dashboard', label: 'Overview' },
  { to: '/admin/access', label: 'Access Requests' },
  { to: '/admin/audit', label: 'Audit' },
];

export function AdminNavTabs() {
  return (
    <div className="adminTabs" role="tablist" aria-label="Admin sections">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            isActive ? 'adminTab adminTab-active' : 'adminTab'
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  );
}
