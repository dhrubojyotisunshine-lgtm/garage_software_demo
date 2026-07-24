// Shared presentational bits for the Vehicle Sale wizard steps.

export const inputCls = 'w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white';
export const readonlyCls = 'w-full border border-border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700 font-medium';
export const labelCls = 'text-xs font-medium text-gray-500 mb-1 block';
export const errorCls = 'text-red-500 text-xs mt-0.5';

export function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="card mb-5">
      <h3 className="font-semibold text-gray-700 text-sm mb-4 flex items-center gap-2">
        {Icon && <Icon size={15} className="text-primary" />} {title}
      </h3>
      {children}
    </div>
  );
}

export function Field({ label, required, error, children }) {
  return (
    <div>
      {label && (
        <label className={labelCls}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {error && <p className={errorCls}>{error}</p>}
    </div>
  );
}
