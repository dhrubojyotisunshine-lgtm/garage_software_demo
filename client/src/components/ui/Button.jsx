import { cn } from '../../utils/cn';

const variants = {
  primary: 'bg-primary text-white hover:bg-primary-600 shadow-sm',
  outline: 'border border-primary text-primary hover:bg-primary hover:text-white',
  ghost: 'text-gray-600 hover:bg-gray-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-5 py-2.5 text-base rounded-lg',
  icon: 'p-2 rounded-lg'
};

export function Button({ children, variant = 'primary', size = 'md', className, disabled, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
