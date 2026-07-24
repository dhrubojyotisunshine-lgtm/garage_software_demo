import { Check } from 'lucide-react';
import { STEPS } from '../../pages/VehicleSale/saleUtils';

// Horizontal numbered step navigation. Current step highlighted, completed steps
// show a check. Every step is freely clickable at any time.
export default function StepIndicator({ current, onStepClick }) {
  return (
    <div className="overflow-x-auto">
      <div className="flex items-center min-w-max py-1">
        {STEPS.map((label, i) => {
          const isDone = i < current;
          const isActive = i === current;
          return (
            <div key={i} className="flex items-center">
              <button
                type="button"
                onClick={() => onStepClick(i)}
                className="flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold border transition-colors ${
                  isActive ? 'bg-primary text-white border-primary'
                  : isDone ? 'bg-primary/10 text-primary border-primary'
                  : 'bg-white text-gray-400 border-gray-300'
                }`}>
                  {isDone ? <Check size={13} /> : i + 1}
                </span>
                <span className={`text-xs font-medium ${
                  isActive ? 'text-primary' : isDone ? 'text-gray-700' : 'text-gray-400'
                }`}>{label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-px mx-2 ${i < current ? 'bg-primary' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
