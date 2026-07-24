import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Boxes, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { DateField } from '../../components/ui/DateField';
import { vehicleStockApi } from '../../api/vehicleStockApi';

const cellCls = 'w-full border border-border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white';

const todayStr = () => new Date().toISOString().slice(0, 10);

const emptyRow = () => ({ vehicleModel: '', variant: '', color: '', chassisNumber: '', engineNumber: '', qty: 1, inDate: todayStr(), dealerName: '' });

export default function VehicleStockForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();

  const [rows, setRows] = useState([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    vehicleStockApi.get(id)
      .then(({ data }) => setRows([{
        vehicleModel: data.vehicleModel || '', variant: data.variant || '', color: data.color || '',
        chassisNumber: data.chassisNumber || '', engineNumber: data.engineNumber || '', qty: data.qty ?? 1,
        inDate: data.inDate ? String(data.inDate).slice(0, 10) : '', dealerName: data.dealerName || ''
      }]))
      .catch(() => toast({ title: 'Failed to load stock', variant: 'error' }))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const updateRow = (idx, field, val) => setRows(rs => rs.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  const addRow = () => setRows(rs => [...rs, emptyRow()]);
  const removeRow = (idx) => setRows(rs => rs.filter((_, i) => i !== idx));

  const handleSave = async () => {
    // 1 stock = 1 physical vehicle (unique chassis / engine no.) → qty is always 1.
    const filled = rows.filter(r => r.vehicleModel.trim()).map(r => ({ ...r, qty: 1 }));
    if (filled.length === 0) { setError('Add at least one vehicle with a Vehicle Model.'); return; }
    setError('');
    setSaving(true);
    try {
      if (isEdit) await vehicleStockApi.update(id, { ...rows[0], qty: 1 });
      else        await vehicleStockApi.createMany(filled);
      toast({ title: isEdit ? 'Stock updated' : 'Stock saved', variant: 'success' });
      navigate('/vehicle-stock');
    } catch (e) {
      toast({ title: 'Error', description: e.response?.data?.message || 'Save failed', variant: 'error' });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="py-16 text-center text-gray-400">Loading…</div>;

  const cols = ['#', 'Vehicle Model *', 'Variant Name', 'Color', 'Chassis Number', 'Engine Number', 'In Date', 'Dealer Name', 'Qty', ''];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-1">
            <button onClick={() => navigate('/vehicle-stock')} className="text-primary hover:underline">Stock Management</button>
            <span>›</span> <span className="text-gray-500">{isEdit ? 'Edit Stock' : 'Add Stock'}</span>
          </div>
          <h1 className="font-heading font-bold text-gray-800 text-2xl">{isEdit ? 'Edit Vehicle Stock' : 'Add Vehicle Stock'}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/vehicle-stock')}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Stock'}</Button>
        </div>
      </div>

      {/* Vehicle grid */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 text-sm mb-4 flex items-center gap-2">
          <Boxes size={15} className="text-primary" /> Vehicle Details
        </h3>
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm min-w-[1000px]">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                {cols.map((h, i) => (
                  <th key={i} className="text-left py-2.5 px-2 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx} className="border-b border-gray-100 align-top">
                  <td className="py-2 px-2 text-gray-500">{idx + 1}</td>
                  <td className="py-2 px-2"><input className={cellCls} value={r.vehicleModel} onChange={e => updateRow(idx, 'vehicleModel', e.target.value)} /></td>
                  <td className="py-2 px-2"><input className={cellCls} value={r.variant} onChange={e => updateRow(idx, 'variant', e.target.value)} /></td>
                  <td className="py-2 px-2"><input className={cellCls} value={r.color} onChange={e => updateRow(idx, 'color', e.target.value)} /></td>
                  <td className="py-2 px-2"><input className={cellCls} value={r.chassisNumber} onChange={e => updateRow(idx, 'chassisNumber', e.target.value)} /></td>
                  <td className="py-2 px-2"><input className={cellCls} value={r.engineNumber} onChange={e => updateRow(idx, 'engineNumber', e.target.value)} /></td>
                  <td className="py-2 px-2 w-36"><DateField value={r.inDate} onChange={e => updateRow(idx, 'inDate', e.target.value)} className={cellCls} /></td>
                  <td className="py-2 px-2"><input className={cellCls} value={r.dealerName} onChange={e => updateRow(idx, 'dealerName', e.target.value)} placeholder="Dealer / from whom" /></td>
                  <td className="py-2 px-2 w-20"><input type="number" readOnly value={1}
                    title="Each vehicle is a unique stock — quantity is fixed to 1."
                    className={`${cellCls} bg-gray-100 text-gray-500 cursor-not-allowed`} /></td>
                  <td className="py-2 px-2">
                    {!isEdit && (
                      <button onClick={() => removeRow(idx)} disabled={rows.length === 1}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

        {!isEdit && (
          <button onClick={addRow}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 border border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary hover:text-white transition-colors">
            <Plus size={15} /> Add Another Vehicle
          </button>
        )}
      </div>
    </div>
  );
}
