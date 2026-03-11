import type { ReactNode } from 'react';

type AdminPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export default function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
  className = '',
}: AdminPageHeaderProps) {
  return (
    <section className={`adminPageHeader ${className}`}>
      <div className="adminPageHeaderTop">
        <div>
          {eyebrow ? <div className="adminPageHeaderEyebrow">{eyebrow}</div> : null}
          <h1 className="adminPageHeaderTitle">{title}</h1>
          {description ? <p className="adminPageHeaderDescription">{description}</p> : null}
        </div>

        {actions ? <div className="adminPageHeaderActions">{actions}</div> : null}
      </div>

      {children ? <div className="adminPageHeaderMeta">{children}</div> : null}
    </section>
  );
}
