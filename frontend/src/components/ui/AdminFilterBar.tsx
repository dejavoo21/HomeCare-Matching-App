import type { ReactNode } from 'react';

export default function AdminFilterBar({
  children,
  rightContent,
}: {
  children: ReactNode;
  rightContent?: ReactNode;
}) {
  return (
    <section className="adminFilterBar">
      <div className="adminFilterBarMain">{children}</div>
      {rightContent ? <div className="adminFilterBarRight">{rightContent}</div> : null}
    </section>
  );
}
