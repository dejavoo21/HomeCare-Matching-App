import { cn } from '../../lib/ui/cn';

export default function TwoColumnPage({
  left,
  right,
  className = '',
  rightWidth = '380px',
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  className?: string;
  rightWidth?: string;
}) {
  return (
    <div
      className={cn('grid gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]', className)}
      style={{ gridTemplateColumns: `minmax(0,1fr) ${rightWidth}` }}
    >
      <div className="space-y-6">{left}</div>
      <div className="space-y-6">{right}</div>
    </div>
  );
}
