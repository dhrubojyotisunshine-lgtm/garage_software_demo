import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DateField } from '../../components/ui/DateField';
import { ChevronLeft, ChevronRight, X, Search, Car, User, Clock, Calendar } from 'lucide-react';
import { appointmentsApi } from '../../api/appointments';
import { mastersApi } from '../../api/masters';
import { useToast } from '../../components/ui/Toast';

const TIME_SLOTS = ['08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM'];
const STATUS_COLORS = {
  Pending:   'bg-amber-100 text-amber-700 border-amber-200',
  Confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
  Completed: 'bg-green-100 text-green-700 border-green-200',
  Cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
};
const STATUS_DOT = {
  Pending:   'bg-amber-400',
  Confirmed: 'bg-blue-400',
  Completed: 'bg-green-500',
  Cancelled: 'bg-gray-400',
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function toDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function today() { return toDateKey(new Date()); }

function isSameDay(a, b) { return toDateKey(a) === toDateKey(b); }

function fmtDisplay(d) {
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/* ── Calendar Day Cell ───────────────────────────────────── */
function DayCell({ date, isCurrentMonth, isToday, appointments, onClickDate, onClickAppt }) {
  return (
    <div
      onClick={() => onClickDate(date)}
      className={`min-h-[110px] border-b border-r border-gray-100 p-1.5 cursor-pointer hover:bg-gray-50 transition-colors ${
        isToday ? 'bg-green-50' : ''
      } ${!isCurrentMonth ? 'opacity-40' : ''}`}
    >
      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium mb-1 ${
        isToday ? 'bg-green-500 text-white' : 'text-gray-700'
      }`}>{date.getDate()}</span>
      <div className="space-y-0.5">
        {appointments.slice(0, 3).map(a => (
          <div
            key={a._id}
            onClick={e => { e.stopPropagation(); onClickAppt(a); }}
            className={`text-xs px-1.5 py-0.5 rounded border truncate cursor-pointer ${STATUS_COLORS[a.status]}`}
          >
            <span className="font-medium">{a.appointmentTime}</span> · {a.customerName}
          </div>
        ))}
        {appointments.length > 3 && (
          <div className="text-xs text-gray-400 pl-1">+{appointments.length - 3} more</div>
        )}
      </div>
    </div>
  );
}

/* ── Month View ──────────────────────────────────────────── */
function MonthView({ year, month, appointmentMap, onClickDate, onClickAppt }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < firstDay; i++) {
    const d = new Date(year, month, 1 - (firstDay - i));
    cells.push({ date: d, isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), isCurrentMonth: true });
  }
  while (cells.length < 42) {
    cells.push({ date: new Date(year, month + 1, cells.length - firstDay - daysInMonth + 1), isCurrentMonth: false });
  }

  return (
    <div className="min-w-[720px]">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {DAYS.map(d => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>
      {/* Cells */}
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          const key = toDateKey(cell.date);
          return (
            <DayCell
              key={i}
              date={cell.date}
              isCurrentMonth={cell.isCurrentMonth}
              isToday={key === today()}
              appointments={appointmentMap[key] || []}
              onClickDate={onClickDate}
              onClickAppt={onClickAppt}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ── Week View ───────────────────────────────────────────── */
function WeekView({ currentDate, appointmentMap, onClickDate, onClickAppt }) {
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  return (
    <div className="min-w-[720px]">
      <div className="grid grid-cols-7 border-b border-gray-200">
        {days.map((d, i) => {
          const key = toDateKey(d);
          const isToday = key === today();
          return (
            <div key={i} className={`border-r border-gray-100 ${isToday ? 'bg-green-50' : ''}`}>
              <div className={`py-2 text-center border-b border-gray-100 ${isToday ? 'bg-green-100' : ''}`}>
                <div className="text-xs font-semibold text-gray-500 uppercase">{DAYS[i].slice(0,3)}</div>
                <div className={`text-lg font-bold ${isToday ? 'text-green-600' : 'text-gray-700'}`}>{d.getDate()}</div>
              </div>
              <div
                className="min-h-[400px] p-2 space-y-1 cursor-pointer hover:bg-gray-50"
                onClick={() => onClickDate(d)}
              >
                {(appointmentMap[key] || []).map(a => (
                  <div
                    key={a._id}
                    onClick={e => { e.stopPropagation(); onClickAppt(a); }}
                    className={`text-xs px-2 py-1.5 rounded border cursor-pointer ${STATUS_COLORS[a.status]}`}
                  >
                    <div className="font-semibold">{a.appointmentTime}</div>
                    <div className="truncate">{a.customerName}</div>
                    <div className="truncate text-[10px] opacity-70">{a.vehicleMake} {a.vehicleModel}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Day View ────────────────────────────────────────────── */
function DayView({ currentDate, appointmentMap, onClickDate, onClickAppt }) {
  const key = toDateKey(currentDate);
  const appts = appointmentMap[key] || [];
  const isToday = key === today();

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className={`rounded-xl border p-4 mb-4 ${isToday ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
        <div className="text-2xl font-bold text-gray-800">{DAYS[currentDate.getDay()]}</div>
        <div className="text-gray-500">{currentDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
      </div>
      {appts.length === 0 ? (
        <div
          onClick={() => onClickDate(currentDate)}
          className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-red-300 hover:text-red-400 transition-colors"
        >
          <Calendar size={32} className="mx-auto mb-2 opacity-40" />
          <p>No appointments. Click to book.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appts.map(a => (
            <div
              key={a._id}
              onClick={() => onClickAppt(a)}
              className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer hover:shadow-sm transition-shadow ${STATUS_COLORS[a.status]}`}
            >
              <div className="flex-shrink-0 text-center">
                <div className="text-sm font-bold">{a.appointmentTime}</div>
                <span className={`inline-block w-2 h-2 rounded-full mt-1 ${STATUS_DOT[a.status]}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-800">{a.customerName}</div>
                <div className="text-xs text-gray-500">{a.mobile1}</div>
                {(a.vehicleMake || a.vehicleNo) && (
                  <div className="text-xs mt-1">{[a.vehicleNo, a.vehicleMake, a.vehicleModel].filter(Boolean).join(' · ')}</div>
                )}
              </div>
              <div className="flex-shrink-0">
                <span className="text-xs font-medium">{a.type}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Appointment Detail Modal ────────────────────────────── */
function DetailModal({ appt, onClose, onEdit, onDelete, onStatusChange }) {
  const [updatingStatus, setUpdating] = useState(false);
  const { toast } = useToast();

  const handleStatus = async (status) => {
    setUpdating(true);
    try {
      await onStatusChange(appt._id, status);
    } finally { setUpdating(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-red-500 rounded-full" />
            <h3 className="font-semibold text-gray-800">Appointment Details</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* Status badge */}
          <div className="flex items-center justify-between">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[appt.status]}`}>{appt.status}</span>
            <span className="text-xs text-gray-400">{appt.type}</span>
          </div>

          {/* Date/Time */}
          <div className="flex gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar size={14} className="text-red-400" />
              {fmtDisplay(appt.appointmentDate)}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock size={14} className="text-red-400" />
              {appt.appointmentTime}
            </div>
          </div>

          {/* Customer */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-2"><User size={12} /> Customer</div>
            <div className="font-semibold text-gray-800">{appt.customerName}</div>
            <div className="text-sm text-gray-600">{appt.mobile1}{appt.mobile2 ? ` · ${appt.mobile2}` : ''}</div>
            {appt.email && <div className="text-sm text-gray-500">{appt.email}</div>}
            {appt.pickupAddress && <div className="text-xs text-gray-500 mt-1">Pickup: {appt.pickupAddress}</div>}
            {appt.dropAddress  && <div className="text-xs text-gray-500">Drop: {appt.dropAddress}</div>}
          </div>

          {/* Vehicle */}
          {(appt.vehicleNo || appt.vehicleMake) && (
            <div className="bg-gray-50 rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-2"><Car size={12} /> Vehicle</div>
              {appt.vehicleNo && <div className="font-semibold text-gray-800">{appt.vehicleNo}</div>}
              {(appt.vehicleMake || appt.vehicleModel) && (
                <div className="text-sm text-gray-600">{[appt.vehicleMake, appt.vehicleModel].filter(Boolean).join(' ')}</div>
              )}
            </div>
          )}

          {/* Notes */}
          {appt.notes && (
            <div className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">
              <span className="font-semibold text-gray-500 text-xs block mb-1">Notes</span>
              {appt.notes}
            </div>
          )}

          {/* Status update */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Update Status</p>
            <div className="flex gap-2 flex-wrap">
              {['Pending','Confirmed','Completed','Cancelled'].map(s => (
                <button
                  key={s}
                  disabled={updatingStatus || appt.status === s}
                  onClick={() => handleStatus(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    appt.status === s ? STATUS_COLORS[s] + ' opacity-100' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={() => onEdit(appt)}
            className="flex-1 py-2 rounded-lg border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(appt._id)}
            className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Book / Edit Modal ───────────────────────────────────── */
function BookModal({ initialDate, appointment, vehicleMakes, vehicleModels, onClose, onSaved }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type:            appointment?.type            || 'Visit',
    appointmentDate: appointment?.appointmentDate ? appointment.appointmentDate.slice(0,10) : (initialDate || today()),
    appointmentTime: appointment?.appointmentTime || '',
    customTime:      '',
    vehicleNo:       appointment?.vehicleNo       || '',
    vehicleMake:     appointment?.vehicleMake     || '',
    vehicleModel:    appointment?.vehicleModel    || '',
    customerName:    appointment?.customerName    || '',
    mobile1:         appointment?.mobile1         || '',
    mobile2:         appointment?.mobile2         || '',
    email:           appointment?.email           || '',
    pickupAddress:   appointment?.pickupAddress   || '',
    dropAddress:     appointment?.dropAddress     || '',
    notes:           appointment?.notes           || '',
  });
  const [sameAsPickup, setSameAsPickup] = useState(false);
  const [vehicleQuery, setVehicleQuery] = useState(
    appointment ? [appointment.vehicleMake, appointment.vehicleModel].filter(Boolean).join(' ') : ''
  );
  const [showVehicleDrop, setShowVehicleDrop] = useState(false);
  const vehicleRef = useRef();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Combined vehicle search options
  const vehicleOptions = useMemo(() => {
    if (!vehicleQuery.trim()) return [];
    const q = vehicleQuery.toLowerCase();
    const results = [];
    vehicleModels.forEach(m => {
      const full = `${m.makeName || ''} ${m.name}`.toLowerCase();
      if (full.includes(q) || (m.makeName||'').toLowerCase().includes(q) || m.name.toLowerCase().includes(q)) {
        results.push({ label: `${m.makeName || ''} ${m.name}`.trim(), make: m.makeName || '', model: m.name });
      }
    });
    vehicleMakes.forEach(mk => {
      if (mk.name.toLowerCase().includes(q) && !results.some(r => r.make === mk.name && !r.model)) {
        results.push({ label: mk.name, make: mk.name, model: '' });
      }
    });
    return results.slice(0, 10);
  }, [vehicleQuery, vehicleMakes, vehicleModels]);

  useEffect(() => {
    const h = e => { if (vehicleRef.current && !vehicleRef.current.contains(e.target)) setShowVehicleDrop(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const selectVehicle = (opt) => {
    set('vehicleMake', opt.make);
    set('vehicleModel', opt.model);
    setVehicleQuery(opt.label);
    setShowVehicleDrop(false);
  };

  const handleSlotClick = (slot) => {
    set('appointmentTime', slot);
    set('customTime', '');
  };

  const handleSameAsPickup = (checked) => {
    setSameAsPickup(checked);
    if (checked) set('dropAddress', form.pickupAddress);
  };

  const handlePickupChange = (v) => {
    set('pickupAddress', v);
    if (sameAsPickup) set('dropAddress', v);
  };

  const handleSave = async () => {
    const time = form.appointmentTime || form.customTime;
    if (!form.customerName.trim()) return toast({ title: 'Customer name required', variant: 'error' });
    if (!form.mobile1.trim())      return toast({ title: 'Mobile number required', variant: 'error' });
    if (!time)                     return toast({ title: 'Select appointment time', variant: 'error' });
    if (!form.appointmentDate)     return toast({ title: 'Select appointment date', variant: 'error' });

    setSaving(true);
    try {
      const payload = { ...form, appointmentTime: time };
      delete payload.customTime;
      if (appointment?._id) {
        await appointmentsApi.update(appointment._id, payload);
        toast({ title: 'Appointment updated', variant: 'success' });
      } else {
        await appointmentsApi.create(payload);
        toast({ title: 'Appointment booked', variant: 'success' });
      }
      onSaved();
    } catch (err) {
      toast({ title: err?.response?.data?.message || 'Save failed', variant: 'error' });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-red-500 rounded-full" />
            <h3 className="text-lg font-semibold text-gray-800">
              {appointment?._id ? 'Edit Appointment' : 'Appointment'}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Type tabs */}
          <div className="flex gap-6 border-b border-gray-200 pb-4">
            {['Visit','Pick'].map(t => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="apptType"
                  checked={form.type === t}
                  onChange={() => set('type', t)}
                  className="accent-red-500"
                />
                <span className={`font-medium text-sm ${form.type === t ? 'text-gray-800' : 'text-gray-400'}`}>{t}</span>
              </label>
            ))}
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Select Date <span className="text-red-500">*</span></label>
              <DateField
                value={form.appointmentDate}
                onChange={e => set('appointmentDate', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Time — Pick: just text input */}
            {form.type === 'Pick' && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Select Time <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. 9:00 AM"
                  value={form.customTime || form.appointmentTime}
                  onChange={e => { set('customTime', e.target.value); set('appointmentTime', ''); }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            )}
          </div>

          {/* Time slots — Visit only */}
          {form.type === 'Visit' && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Select Time <span className="text-red-500">*</span></label>
              <div className="flex items-center gap-2 flex-wrap">
                {TIME_SLOTS.map(slot => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => handleSlotClick(slot)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                      form.appointmentTime === slot
                        ? 'bg-red-500 border-red-500 text-white'
                        : 'border-gray-300 text-gray-600 hover:border-red-300'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
                <span className="text-gray-400 text-sm mx-1">OR</span>
                <input
                  type="text"
                  placeholder="Custom time"
                  value={form.customTime}
                  onChange={e => { set('customTime', e.target.value); set('appointmentTime', ''); }}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          )}

          {/* Vehicle Details */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Car size={16} className="text-red-400" />
              <span className="font-semibold text-gray-700 text-sm underline underline-offset-2">Vehicle Details</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Vehicle Number</label>
                <input
                  type="text"
                  value={form.vehicleNo}
                  onChange={e => set('vehicleNo', e.target.value.toUpperCase())}
                  placeholder="MH01AB1234"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 uppercase"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Search and Select Vehicle</label>
                <div className="relative" ref={vehicleRef}>
                  <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2.5 gap-2 focus-within:ring-2 focus-within:ring-red-400">
                    <Search size={14} className="text-gray-400 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="Search Brand, Model"
                      value={vehicleQuery}
                      onChange={e => { setVehicleQuery(e.target.value); setShowVehicleDrop(true); set('vehicleMake',''); set('vehicleModel',''); }}
                      className="flex-1 text-sm outline-none bg-transparent"
                    />
                  </div>
                  {showVehicleDrop && vehicleOptions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                      {vehicleOptions.map((opt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => selectVehicle(opt)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <User size={16} className="text-red-400" />
              <span className="font-semibold text-gray-700 text-sm underline underline-offset-2">Customer Details</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm text-gray-600 mb-1">Customer Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.customerName}
                  onChange={e => set('customerName', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Mobile No. 1 <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  value={form.mobile1}
                  onChange={e => set('mobile1', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Mobile No. 2</label>
                <input
                  type="tel"
                  value={form.mobile2}
                  onChange={e => set('mobile2', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Pick-only fields */}
              {form.type === 'Pick' && (
                <>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Pickup Address</label>
                    <input
                      type="text"
                      value={form.pickupAddress}
                      onChange={e => handlePickupChange(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Drop Address</label>
                    <input
                      type="text"
                      value={form.dropAddress}
                      disabled={sameAsPickup}
                      onChange={e => set('dropAddress', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:bg-gray-100"
                    />
                  </div>
                  <div className="flex items-center gap-2 self-end pb-2">
                    <input
                      id="samePickup"
                      type="checkbox"
                      checked={sameAsPickup}
                      onChange={e => handleSameAsPickup(e.target.checked)}
                      className="accent-red-500"
                    />
                    <label htmlFor="samePickup" className="text-sm text-gray-600 cursor-pointer">Same as Pickup Address</label>
                  </div>
                </>
              )}

              {/* Notes */}
              <div className="col-span-2">
                <label className="block text-sm text-gray-600 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-50 transition-opacity"
            style={{ background: 'linear-gradient(to right, #ef4444, #b91c1c)' }}
          >
            {saving ? 'Saving...' : appointment?._id ? 'Update Appointment' : 'Book Appointment'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────── */
export default function AppointmentPage() {
  const { toast } = useToast();
  const [view, setView]             = useState('month'); // month | week | day
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppts]    = useState([]);
  const [vehicleMakes, setMakes]    = useState([]);
  const [vehicleModels, setModels]  = useState([]);
  const [bookModal, setBookModal]   = useState(false);
  const [bookDate, setBookDate]     = useState(null);
  const [editAppt, setEditAppt]     = useState(null);
  const [detailAppt, setDetailAppt] = useState(null);
  const [loading, setLoading]       = useState(false);

  // Date range for current view
  const dateRange = useMemo(() => {
    if (view === 'month') {
      const y = currentDate.getFullYear(), m = currentDate.getMonth();
      return {
        startDate: new Date(y, m - 1, 20).toISOString().slice(0,10),
        endDate:   new Date(y, m + 1, 10).toISOString().slice(0,10),
      };
    }
    if (view === 'week') {
      const d = new Date(currentDate);
      const sun = new Date(d); sun.setDate(d.getDate() - d.getDay());
      const sat = new Date(sun); sat.setDate(sun.getDate() + 6);
      return { startDate: toDateKey(sun), endDate: toDateKey(sat) };
    }
    return { date: toDateKey(currentDate) };
  }, [view, currentDate]);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await appointmentsApi.list(dateRange);
      setAppts(data);
    } catch {
      toast({ title: 'Failed to load appointments', variant: 'error' });
    } finally { setLoading(false); }
  }, [dateRange]);

  // Load vehicle masters once
  useEffect(() => {
    Promise.all([
      mastersApi.list('vehicle-makes'),
      mastersApi.list('vehicle-models'),
    ]).then(([makes, models]) => {
      setMakes(makes.data);
      setModels(models.data);
    }).catch(() => {});
  }, []);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  // Build appointmentMap: { dateKey: [appt, ...] }
  const appointmentMap = useMemo(() => {
    const map = {};
    appointments.forEach(a => {
      const key = toDateKey(new Date(a.appointmentDate));
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return map;
  }, [appointments]);

  // Navigation
  const navigate = (dir) => {
    const d = new Date(currentDate);
    if (view === 'month')  d.setMonth(d.getMonth() + dir);
    if (view === 'week')   d.setDate(d.getDate() + dir * 7);
    if (view === 'day')    d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  // Title
  const title = useMemo(() => {
    if (view === 'month') return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    if (view === 'week') {
      const sun = new Date(currentDate); sun.setDate(currentDate.getDate() - currentDate.getDay());
      const sat = new Date(sun); sat.setDate(sun.getDate() + 6);
      return `${sun.toLocaleDateString('en-IN', { day:'2-digit', month:'short' })} – ${sat.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}`;
    }
    return currentDate.toLocaleDateString('en-IN', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
  }, [view, currentDate]);

  const handleClickDate = (date) => {
    setBookDate(toDateKey(date));
    setEditAppt(null);
    setBookModal(true);
  };

  const handleClickAppt = (appt) => { setDetailAppt(appt); };

  const handleEdit = (appt) => {
    setDetailAppt(null);
    setEditAppt(appt);
    setBookDate(null);
    setBookModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this appointment?')) return;
    try {
      await appointmentsApi.remove(id);
      toast({ title: 'Deleted', variant: 'success' });
      setDetailAppt(null);
      loadAppointments();
    } catch {
      toast({ title: 'Delete failed', variant: 'error' });
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const { data } = await appointmentsApi.updateStatus(id, status);
      setDetailAppt(data);
      loadAppointments();
    } catch {
      toast({ title: 'Status update failed', variant: 'error' });
    }
  };

  const handleSaved = () => {
    setBookModal(false);
    setEditAppt(null);
    setBookDate(null);
    loadAppointments();
  };

  return (
    <div className="flex flex-col h-full -m-6">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 px-4 sm:px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
        {/* Book button */}
        <button
          onClick={() => { setEditAppt(null); setBookDate(today()); setBookModal(true); }}
          className="px-4 py-2 rounded-lg text-white text-sm font-semibold"
          style={{ background: 'linear-gradient(to right, #ef4444, #b91c1c)' }}
        >
          Book Appointment
        </button>

        {/* Navigation */}
        <div className="flex items-center gap-1 ml-4">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">
            <ChevronLeft size={18} />
          </button>
          <button onClick={goToday} className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">
            Today
          </button>
          <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Title */}
        <div className="flex-1 text-center font-semibold text-gray-700">{title}</div>

        {/* View toggle */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {['month','week','day'].map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                view === v ? 'bg-red-500 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar body */}
      <div className="flex-1 overflow-auto bg-white">
        {loading && (
          <div className="flex items-center justify-center py-10 text-gray-400 text-sm">Loading...</div>
        )}
        {!loading && view === 'month' && (
          <MonthView
            year={currentDate.getFullYear()}
            month={currentDate.getMonth()}
            appointmentMap={appointmentMap}
            onClickDate={handleClickDate}
            onClickAppt={handleClickAppt}
          />
        )}
        {!loading && view === 'week' && (
          <WeekView
            currentDate={currentDate}
            appointmentMap={appointmentMap}
            onClickDate={handleClickDate}
            onClickAppt={handleClickAppt}
          />
        )}
        {!loading && view === 'day' && (
          <DayView
            currentDate={currentDate}
            appointmentMap={appointmentMap}
            onClickDate={handleClickDate}
            onClickAppt={handleClickAppt}
          />
        )}
      </div>

      {/* Book/Edit modal */}
      {bookModal && (
        <BookModal
          initialDate={bookDate}
          appointment={editAppt}
          vehicleMakes={vehicleMakes}
          vehicleModels={vehicleModels}
          onClose={() => { setBookModal(false); setEditAppt(null); }}
          onSaved={handleSaved}
        />
      )}

      {/* Detail modal */}
      {detailAppt && (
        <DetailModal
          appt={detailAppt}
          onClose={() => setDetailAppt(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
