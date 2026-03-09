import { cn } from '../../lib/ui/cn';

export default function AppPage({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('space-y-6 p-6', className)}>{children}</div>;
}
