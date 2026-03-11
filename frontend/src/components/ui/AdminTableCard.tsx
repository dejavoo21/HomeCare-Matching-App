import type { ReactNode } from 'react';

export default function AdminTableCard({
  title,
  subtitle,
  children,
  className = '',
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`adminTableCard ${className}`}>
      {(title || subtitle) && (
        <div className="adminTableCardHeader">
          {title ? <div className="adminTableCardTitle">{title}</div> : null}
          {subtitle ? <div className="adminTableCardSubtitle">{subtitle}</div> : null}
        </div>
      )}

      <div className="tableScroll">{children}</div>
    </section>
  );
}
