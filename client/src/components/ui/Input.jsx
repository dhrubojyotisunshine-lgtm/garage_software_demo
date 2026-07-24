import { cn } from '../../utils/cn';
import { forwardRef } from 'react';

export const Input = forwardRef(({ className, label, error, ...props }, ref) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <input
      ref={ref}
      className={cn(
        'w-full border border-border rounded-lg px-3 py-2 text-sm',
        'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
        'bg-white placeholder-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed',
        error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
        className
      )}
      {...props}
    />
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
));
Input.displayName = 'Input';

export const Select = forwardRef(({ className, label, error, children, ...props }, ref) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <select
      ref={ref}
      className={cn(
        'w-full border border-border rounded-lg px-3 py-2 text-sm',
        'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
        'bg-white disabled:bg-gray-50 disabled:cursor-not-allowed',
        error && 'border-red-500',
        className
      )}
      {...props}
    >
      {children}
    </select>
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
));
Select.displayName = 'Select';

export const Textarea = forwardRef(({ className, label, error, ...props }, ref) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <textarea
      ref={ref}
      className={cn(
        'w-full border border-border rounded-lg px-3 py-2 text-sm',
        'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
        'bg-white placeholder-gray-400 resize-none',
        error && 'border-red-500',
        className
      )}
      {...props}
    />
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
));
Textarea.displayName = 'Textarea';
