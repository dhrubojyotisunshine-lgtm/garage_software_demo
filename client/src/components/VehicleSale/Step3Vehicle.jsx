import { useState, useEffect, useRef } from 'react';
import { Car, Plus, Trash2, Search } from 'lucide-react';
import { SectionCard, inputCls, errorCls } from './parts';
import { emptyVehicle, num } from '../../pages/VehicleSale/saleUtils';
import { vehicleStockApi } from '../../api/vehicleStockApi';
import { formatCurrency } from '../../utils/format';
import { listItems } from '../../utils/list';
import useAuthStore from '../../store/authStore';

const cellCls = 'w-full border border-border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white';
const roCellCls = 'w-full border border-border rounded-md px-2 py-1.5 text-sm bg-gray-50 text-gray-600';

export default function Step3Vehicle({ form, setForm, errors }) {
  const vehicles = form.vehicles || [];

  // Owner always may delete a saved vehicle; staff need the vehicle-sale permission.
  const { isStaff, staffUser } = useAuthStore();
  const canDeleteSaved = !isStaff || !!staffUser?.roleId?.vehicleSalePermissions?.canDeleteVehicle;
  const canEditSaved   = !isStaff || !!staffUser?.roleId?.vehicleSalePermissions?.canEditVehicle;

  const updateVehicle = (idx, field, value) =>
    setForm(f => ({ ...f, vehicles: f.vehicles.map((v, i) => i === idx ? { ...v, [field]: value } : v) }));
  const addVehicle = () => setForm(f => ({ ...f, vehicles: [...f.vehicles, emptyVehicle()] }));
  const removeVehicle = (idx) => setForm(f => ({ ...f, vehicles: f.vehicles.filter((_, i) => i !== idx) }));

  // Stock vehicle picker — fill a row from Stock Management inventory.
  const [stock, setStock] = useState([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const pickerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    vehicleStockApi.list({ all: 1, stock: 'available' }).then(({ data }) => setStock(listItems(data))).catch(() => {});
  }, [open]);

  useEffect(() => {
    const onDown = (e) => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const filteredStock = stock.filter(s => {
    // Match across model + variant + color + chassis + engine combined, and require
    // every search term to be present (so "activa std white" matches). "·" is ignored.
    const hay = [s.vehicleModel, s.variant, s.color, s.chassisNumber, s.engineNumber]
      .map(v => (v || '')).join(' ').toLowerCase();
    const terms = query.toLowerCase().replace(/·/g, ' ').split(/\s+/).filter(Boolean);
    return terms.every(t => hay.includes(t));
  });

  const pickStock = (s) => {
    // Guard: no remaining stock, or this exact vehicle is already on the sale (qty is 1 per vehicle).
    if ((s.remaining ?? s.qty) <= 0) return;
    setForm(f => {
      if (f.vehicles.some(v => v.stockId === s._id)) return f;
      const rows = [...f.vehicles];
      const filled = {
        ...emptyVehicle(), stockId: s._id,
        vehicleModel: s.vehicleModel || '', variant: s.variant || '', color: s.color || '',
        chassisNumber: s.chassisNumber || '', engineNumber: s.engineNumber || ''
      };
      const emptyIdx = rows.findIndex(v => !v.vehicleModel?.trim() && !v.chassisNumber?.trim());
      if (emptyIdx >= 0) rows[emptyIdx] = { ...rows[emptyIdx], ...filled, price: rows[emptyIdx].price };
      else rows.push(filled);
      return { ...f, vehicles: rows };
    });
    setOpen(false); setQuery('');
  };

  const cols = ['#', 'Vehicle Model *', 'Variant / Grade', 'Color', 'Chassis Number', 'Engine Number', 'Price (₹)', 'Total (₹)', ''];

  return (
    <>
      <SectionCard title="Vehicle Details" icon={Car}>
        {/* Search vehicle from Stock Management */}
        <div className="relative mb-4 max-w-md" ref={pickerRef}>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onFocus={() => setOpen(true)}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            placeholder="Search vehicle from stock (model, chassis, engine)"
            className={`${inputCls} pl-9`}
          />
          {open && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
              {filteredStock.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-gray-400">
                  {stock.length === 0 ? 'No stock vehicles found' : 'No match'}
                </div>
              ) : filteredStock.map(s => {
                const remaining = s.remaining ?? s.qty;
                const already   = vehicles.some(v => v.stockId === s._id);
                const disabled  = remaining <= 0 || already;
                return (
                <button key={s._id} type="button" disabled={disabled} onClick={() => pickStock(s)}
                  className={`w-full text-left px-3 py-2 text-sm border-b border-gray-100 last:border-0 ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'hover:bg-gray-50'}`}>
                  <div className="font-medium text-gray-800">
                    {s.vehicleModel} {s.variant ? `· ${s.variant}` : ''} {s.color ? `· ${s.color}` : ''}
                    {remaining <= 0 && <span className="ml-2 text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Out of stock</span>}
                    {remaining > 0 && already && <span className="ml-2 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Already added</span>}
                  </div>
                  <div className="text-xs text-gray-400">
                    Chassis: {s.chassisNumber || '-'} · Engine: {s.engineNumber || '-'}
                    <span className="ml-1">· Qty: {s.qty} · Used: {s.used ?? 0} · </span>
                    <span className={`font-semibold ${remaining <= 0 ? 'text-red-500' : 'text-green-600'}`}>Remaining: {remaining}</span>
                  </div>
                </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                {cols.map((h, i) => (
                  <th key={i} className="text-left py-2.5 px-2 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v, idx) => (
                <tr key={idx} className="border-b border-gray-100 align-top">
                  <td className="py-2 px-2 text-gray-500">{idx + 1}</td>
                  <td className="py-2 px-2"><input className={roCellCls} value={v.vehicleModel} readOnly /></td>
                  <td className="py-2 px-2"><input className={roCellCls} value={v.variant} readOnly /></td>
                  <td className="py-2 px-2"><input className={roCellCls} value={v.color} readOnly /></td>
                  <td className="py-2 px-2"><input className={roCellCls} value={v.chassisNumber} readOnly /></td>
                  <td className="py-2 px-2"><input className={roCellCls} value={v.engineNumber} readOnly /></td>
                  <td className="py-2 px-2">
                    {(() => {
                      const priceEditable = !v._saved || canEditSaved;
                      return (
                        <input type="number" className={priceEditable ? cellCls : roCellCls} value={v.price} readOnly={!priceEditable}
                          onChange={priceEditable ? (e => updateVehicle(idx, 'price', e.target.value)) : undefined} />
                      );
                    })()}
                  </td>
                  <td className="py-2 px-2 font-medium text-gray-800 whitespace-nowrap">{formatCurrency(num(v.price))}</td>
                  <td className="py-2 px-2">
                    {(!v._saved || canDeleteSaved) && (
                      <button onClick={() => removeVehicle(idx)}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {errors['vehicles'] && <p className={errorCls}>{errors['vehicles']}</p>}
        {errors['vehicles.0.vehicleModel'] && <p className={errorCls}>{errors['vehicles.0.vehicleModel']}</p>}

        <button onClick={addVehicle}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 border border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary hover:text-white transition-colors">
          <Plus size={15} /> Add Another Vehicle
        </button>
      </SectionCard>
    </>
  );
}
