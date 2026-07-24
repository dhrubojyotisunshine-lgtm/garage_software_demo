import { useState, useEffect, useRef } from 'react';
import useAuthStore from '../../../store/authStore';
import { settingsApi } from '../../../api/settings';
import { useToast } from '../../../components/ui/Toast';

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}

const REMINDER_KM_OPTIONS = ['1000 KM', '2000 KM', '3000 KM', '4000 KM', '5000 KM', '6000 KM', '7000 KM', '8000 KM', '9000 KM', '10000 KM'];
const REMINDER_PERIOD_OPTIONS = ['1 Month', '2 Months', '3 Months', '4 Months', '5 Months', '6 Months', '7 Months', '8 Months', '9 Months', '10 Months', '11 Months', '12 Months'];
const BILL_FORMAT_OPTIONS = ['Complete', 'Summary', 'Compact'];

export default function BillingTab() {
  const { garage, updateGarage } = useAuthStore();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const defaults = garage?.billingSettings || {};
  const [settings, setSettings] = useState({
    reminderKm: defaults.reminderKm || '',
    reminderPeriod: defaults.reminderPeriod || '1 Month',
    billFormat: defaults.billFormat || 'Complete',
    gst: defaults.gst || false,
    billHeader: defaults.billHeader || '',
    tagLine: defaults.tagLine || '',
    billFooter: defaults.billFooter || '',
    termsAndConditions: defaults.termsAndConditions || '',
  });

  const initialized = useRef(false);
  useEffect(() => {
    if (garage?._id && !initialized.current) {
      initialized.current = true;
      const d = garage.billingSettings || {};
      setSettings({
        reminderKm: d.reminderKm || '',
        reminderPeriod: d.reminderPeriod || '1 Month',
        billFormat: d.billFormat || 'Complete',
        gst: d.gst || false,
        billHeader: d.billHeader || '',
        tagLine: d.tagLine || '',
        billFooter: d.billFooter || '',
        termsAndConditions: d.termsAndConditions || '',
      });
    }
  }, [garage?._id]);

  const set = (k, v) => setSettings(s => ({ ...s, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await settingsApi.updateBilling(settings);
      updateGarage({ billingSettings: data.billingSettings });
      toast({ title: 'Billing settings saved', variant: 'success' });
    } catch (err) {
      toast({ title: err.response?.data?.message || 'Save failed', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card space-y-6">
      {/* Dropdowns row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Reminder KM</label>
          <select className="input-field" value={settings.reminderKm} onChange={e => set('reminderKm', e.target.value)}>
            <option value="">None</option>
            {REMINDER_KM_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Reminder Period</label>
          <select className="input-field" value={settings.reminderPeriod} onChange={e => set('reminderPeriod', e.target.value)}>
            {REMINDER_PERIOD_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Bill Format</label>
          <select className="input-field" value={settings.billFormat} onChange={e => set('billFormat', e.target.value)}>
            {BILL_FORMAT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      {/* GST toggle */}
      <div className="flex items-center gap-3">
        <Toggle checked={settings.gst} onChange={v => set('gst', v)} />
        <span className="text-sm text-gray-700">Enable GST</span>
      </div>

      {/* Text areas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Bill Header</label>
          <textarea className="input-field resize-none" rows={3} value={settings.billHeader} onChange={e => set('billHeader', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tag Line</label>
          <textarea className="input-field resize-none" rows={3} value={settings.tagLine} onChange={e => set('tagLine', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Bill Footer</label>
          <textarea className="input-field resize-none" rows={3} value={settings.billFooter} onChange={e => set('billFooter', e.target.value)} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Terms And Conditions <span className="text-primary text-[10px]">(Please Add ; End Of Point)</span>
        </label>
        <textarea className="input-field resize-none" rows={4} value={settings.termsAndConditions} onChange={e => set('termsAndConditions', e.target.value)} />
      </div>

      <div className="flex justify-center">
        <button onClick={handleSave} disabled={saving} className="btn-primary px-10">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
