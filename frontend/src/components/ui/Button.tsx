const variants = {
  primary: 'bg-sky-600 text-white hover:bg-sky-700',
  secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  warning: 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100',
  danger: 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
} as const;

const sizes = {
  sm: 'rounded-xl px-3 py-2 text-xs font-semibold',
  md: 'rounded-2xl px-4 py-3 text-sm font-semibold',
  lg: 'rounded-2xl px-5 py-3.5 text-sm font-semibold',
} as const;

type Variant = keyof typeof variants;
type Size = keyof typeof sizes;

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
