export default function ContentGrid({
  main,
  rail,
  railWidth = '360px',
  railPosition = 'right',
}: {
  main: React.ReactNode;
  rail: React.ReactNode;
  railWidth?: string;
  railPosition?: 'left' | 'right';
}) {
  return (
    <div
      className="grid items-start gap-6 xl:[grid-template-columns:minmax(0,1fr)_var(--content-grid-rail-width)]"
      style={{ ['--content-grid-rail-width' as string]: railWidth }}
    >
      <div className={`min-w-0 space-y-6 ${railPosition === 'left' ? 'xl:order-2' : ''}`}>
        {main}
      </div>
      <div className={`space-y-6 self-start ${railPosition === 'left' ? 'xl:order-1' : ''}`}>
        {rail}
      </div>
    </div>
  );
}
