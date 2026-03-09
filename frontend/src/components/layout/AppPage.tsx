import { cn } from '../../lib/ui/cn';

export default function AppPage({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('mx-auto w-full max-w-[1600px] space-y-5 p-6', className)}>{children}</div>;
}
