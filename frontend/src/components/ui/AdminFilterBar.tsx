import type { ReactNode } from 'react';

export default function AdminFilterBar({
  children,
  rightContent,
  className = '',
}: {
  children: ReactNode;
  rightContent?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`adminFilterBar ${className}`}>
      <div className="adminFilterBarMain">{children}</div>
      {rightContent ? <div className="adminFilterBarRight">{rightContent}</div> : null}
    </section>
  );
}
