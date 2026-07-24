import { cn } from '../../utils/cn';

export function Badge({ children, variant = 'default', className }) {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    primary: 'bg-primary/10 text-primary',
    open: 'bg-red-100 text-red-700',
    completed: 'bg-amber-100 text-amber-700',
    closed: 'bg-green-100 text-green-700',
    info: 'bg-blue-100 text-blue-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700'
  };
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}
