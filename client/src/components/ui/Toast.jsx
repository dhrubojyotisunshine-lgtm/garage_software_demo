import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import useToastStore from '../../store/toastStore';

const icons = {
  default: <Info size={16} className="text-blue-500 flex-shrink-0" />,
  success: <CheckCircle size={16} className="text-green-500 flex-shrink-0" />,
  error: <XCircle size={16} className="text-red-500 flex-shrink-0" />,
  warning: <Info size={16} className="text-amber-500 flex-shrink-0" />
};

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={cn(
            'flex items-start gap-3 bg-white rounded-xl shadow-lg border p-4 animate-in slide-in-from-right',
            toast.variant === 'error' && 'border-red-200',
            toast.variant === 'success' && 'border-green-200',
            toast.variant === 'warning' && 'border-amber-200',
            toast.variant === 'default' && 'border-border'
          )}
        >
          {icons[toast.variant || 'default']}
          <div className="flex-1 min-w-0">
            {toast.title && <p className="text-sm font-semibold text-gray-800">{toast.title}</p>}
            {toast.description && <p className="text-xs text-gray-500 mt-0.5">{toast.description}</p>}
          </div>
          <button onClick={() => dismiss(toast.id)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const { toast } = useToastStore();
  return { toast };
}
