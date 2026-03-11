import type { ReactNode } from 'react';

export default function AdminTableCard({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="adminTableCard">
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
