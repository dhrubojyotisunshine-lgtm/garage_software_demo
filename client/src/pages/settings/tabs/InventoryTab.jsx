import { useState, useEffect, useRef } from 'react';
import useAuthStore from '../../../store/authStore';
import { settingsApi } from '../../../api/settings';
import { useToast } from '../../../components/ui/Toast';

const TOGGLES = [
  { key: 'billDetails', label: 'Bill Details' },
  { key: 'purchaseOrderDetails', label: 'Purchase Order Details' },
  { key: 'account', label: 'Account' },
  { key: 'negativeInventory', label: 'Negative Inventory' },
  { key: 'lowerLimit', label: 'Lower Limit' },
];

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

export default function InventoryTab() {
  const { garage, updateGarage } = useAuthStore();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const defaults = garage?.inventorySettings || {};
  const [settings, setSettings] = useState({
    billDetails: defaults.billDetails || false,
    purchaseOrderDetails: defaults.purchaseOrderDetails || false,
    account: defaults.account || false,
    negativeInventory: defaults.negativeInventory || false,
    lowerLimit: defaults.lowerLimit || false,
  });

  const initialized = useRef(false);
  useEffect(() => {
    if (garage?._id && !initialized.current) {
      initialized.current = true;
      const d = garage.inventorySettings || {};
      setSettings({
        billDetails: d.billDetails || false,
        purchaseOrderDetails: d.purchaseOrderDetails || false,
        account: d.account || false,
        negativeInventory: d.negativeInventory || false,
        lowerLimit: d.lowerLimit || false,
      });
    }
  }, [garage?._id]);

  const toggle = (key, val) => setSettings(s => ({ ...s, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await settingsApi.updateInventory(settings);
      updateGarage({ inventorySettings: data.inventorySettings });
      toast({ title: 'Inventory settings saved', variant: 'success' });
    } catch (err) {
      toast({ title: err.response?.data?.message || 'Save failed', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const rows = [];
  for (let i = 0; i < TOGGLES.length; i += 2) {
    rows.push(TOGGLES.slice(i, i + 2));
  }

  return (
    <div className="card">
      <div className="space-y-5">
        {rows.map((row, ri) => (
          <div key={ri} className="grid grid-cols-1 sm:grid-cols-2 gap-x-16 gap-y-5">
            {row.map(item => (
              <div key={item.key} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{item.label}</span>
                <Toggle checked={settings[item.key]} onChange={(v) => toggle(item.key, v)} />
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-center">
        <button onClick={handleSave} disabled={saving} className="btn-primary px-10">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
