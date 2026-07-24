import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isSameMonth, format, parse, isValid,
} from 'date-fns';
import { cn } from '../../utils/cn';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** Parse a yyyy-MM-dd string into a local Date (avoids UTC shift of new Date('yyyy-mm-dd')). */
function parseValue(value) {
  if (!value) return null;
  const str = String(value).slice(0, 10);
  const d = parse(str, 'yyyy-MM-dd', new Date());
  return isValid(d) ? d : null;
}

const toISO = (d) => format(d, 'yyyy-MM-dd');

/**
 * Drop-in replacement for <input type="date"> that always opens a full calendar.
 * Emits onChange({ target: { value } }) with a yyyy-MM-dd string so existing
 * `e => ...e.target.value` handlers keep working unchanged.
 */
export const DateField = forwardRef(function DateField(
  { value, onChange, onBlur, className, disabled, min, max, placeholder = 'Select date',
    displayFormat = 'dd MMM yyyy', clearable = true, name, id, type: _type, ...rest },
  ref,
) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const selected = parseValue(value);
  const [viewMonth, setViewMonth] = useState(() => selected || new Date());
  const triggerRef = useRef(null);
  const popRef = useRef(null);

  const minDate = parseValue(min);
  const maxDate = parseValue(max);

  useEffect(() => { if (selected) setViewMonth(selected); }, [value]); // eslint-disable-line

  const position = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const popH = 340, gap = 6;
    const below = window.innerHeight - r.bottom;
    const openUp = below < popH + gap && r.top > below;
    setCoords({
      left: Math.min(r.left, window.innerWidth - 288 - 8),
      top: openUp ? undefined : r.bottom + gap,
      bottom: openUp ? window.innerHeight - r.top + gap : undefined,
    });
  };

  useLayoutEffect(() => { if (open) position(); }, [open]);

  useEffect(() => {
    if (!open) return;
    const reposition = () => position();
    const onDown = (e) => {
      if (popRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
      close();
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]); // eslint-disable-line

  const close = () => { setOpen(false); onBlur?.({ target: { name, value: value ?? '' } }); };
  const emit = (v) => onChange?.({ target: { name, value: v } });

  const isDisabledDay = (d) =>
    (minDate && d < minDate && !isSameDay(d, minDate)) ||
    (maxDate && d > maxDate && !isSameDay(d, maxDate));

  const pick = (d) => { if (isDisabledDay(d)) return; emit(toISO(d)); setOpen(false); onBlur?.({ target: { name, value: toISO(d) } }); };

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewMonth)),
    end: endOfWeek(endOfMonth(viewMonth)),
  });

  return (
    <>
      <button
        type="button"
        ref={(node) => { triggerRef.current = node; if (typeof ref === 'function') ref(node); else if (ref) ref.current = node; }}
        id={id}
        name={name}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          'inline-flex items-center gap-2 border border-border rounded-lg px-3 py-2 text-sm text-left',
          'bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
          'disabled:bg-gray-50 disabled:cursor-not-allowed',
          className,
        )}
        {...rest}
      >
        <CalendarIcon size={15} className="shrink-0 text-gray-400" />
        <span className={cn('flex-1 truncate', !selected && 'text-gray-400')}>
          {selected ? format(selected, displayFormat) : placeholder}
        </span>
        {clearable && selected && !disabled && (
          <X
            size={14}
            className="shrink-0 text-gray-400 hover:text-gray-600"
            onClick={(e) => { e.stopPropagation(); emit(''); }}
          />
        )}
      </button>

      {open && coords && createPortal(
        <div
          ref={popRef}
          style={{ position: 'fixed', left: coords.left, top: coords.top, bottom: coords.bottom, zIndex: 60 }}
          className="w-72 rounded-xl border border-border bg-white shadow-2xl p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setViewMonth((m) => subMonths(m, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <ChevronLeft size={16} />
            </button>
            <div className="font-heading font-semibold text-sm text-gray-800">
              {format(viewMonth, 'MMMM yyyy')}
            </div>
            <button type="button" onClick={() => setViewMonth((m) => addMonths(m, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-[11px] font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {days.map((d) => {
              const inMonth = isSameMonth(d, viewMonth);
              const isSel = selected && isSameDay(d, selected);
              const isToday = isSameDay(d, new Date());
              const off = isDisabledDay(d);
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  disabled={off}
                  onClick={() => pick(d)}
                  className={cn(
                    'h-8 w-full rounded-lg text-sm transition-colors',
                    !inMonth && 'text-gray-300',
                    inMonth && !isSel && 'text-gray-700 hover:bg-primary/10',
                    isSel && 'bg-primary text-white font-semibold hover:bg-primary',
                    isToday && !isSel && 'ring-1 ring-primary/40',
                    off && 'text-gray-200 cursor-not-allowed hover:bg-transparent',
                  )}
                >
                  {format(d, 'd')}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
            <button type="button" onClick={() => pick(new Date())}
              className="text-xs font-medium text-primary hover:underline">Today</button>
            {clearable && selected && (
              <button type="button" onClick={() => { emit(''); setOpen(false); }}
                className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
});

export default DateField;
