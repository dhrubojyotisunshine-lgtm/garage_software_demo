import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={cn('relative bg-white rounded-2xl shadow-2xl w-full mx-4 max-h-[90vh] overflow-y-auto', sizes[size])}>
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-white z-10">
          <h3 className="font-heading font-semibold text-gray-800 text-lg">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Drawer({ isOpen, onClose, title, children, width = 'w-full sm:w-96' }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className={cn(
        'fixed top-0 right-0 h-full bg-white shadow-2xl z-50 flex flex-col',
        width
      )}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-heading font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </>
  );
}
