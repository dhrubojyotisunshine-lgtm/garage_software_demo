import { useState, useEffect, useRef } from 'react';
import useAuthStore from '../../../store/authStore';
import { settingsApi } from '../../../api/settings';
import { useToast } from '../../../components/ui/Toast';

const TOGGLES = [
  { key: 'engineChassisNumber', label: 'Engine Chassis Number' },
  { key: 'vehicleColour', label: 'Vehicle Colour' },
  { key: 'customerMobileNo', label: 'Customer Mobile No.' },
  { key: 'customerEmail', label: 'Customer Email' },
  { key: 'customerBirthday', label: 'Customer Birthday' },
  { key: 'customerPickupAddr', label: 'Customer Pickup Addr.' },
  { key: 'customerDeliveryAddr', label: 'Customer Delivery Addr' },
  { key: 'driverDetails', label: 'Driver Details' },
  { key: 'jobwiseMechanic', label: 'Jobwise Mechanic' },
  { key: 'customerSignature', label: 'Customer Signature' },
  { key: 'customJobcardNo', label: 'Custom Jobcard No.' },
  { key: 'itemWiseDiscount', label: 'Item Wise Discount' },
  { key: 'jobcardSeries', label: 'Jobcard Series' },
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

export default function JobcardTab() {
  const { garage, updateGarage } = useAuthStore();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [staffList, setStaffList] = useState([]);

  const defaults = garage?.jobcardSettings || {};
  const [settings, setSettings] = useState({
    engineChassisNumber: defaults.engineChassisNumber || false,
    vehicleColour: defaults.vehicleColour || false,
    customerMobileNo: defaults.customerMobileNo || false,
    customerEmail: defaults.customerEmail || false,
    customerBirthday: defaults.customerBirthday || false,
    customerPickupAddr: defaults.customerPickupAddr || false,
    customerDeliveryAddr: defaults.customerDeliveryAddr || false,
    driverDetails: defaults.driverDetails || false,
    jobwiseMechanic: defaults.jobwiseMechanic || false,
    customerSignature: defaults.customerSignature || false,
    customJobcardNo: defaults.customJobcardNo || false,
    itemWiseDiscount: defaults.itemWiseDiscount || false,
    jobcardSeries: defaults.jobcardSeries || false,
    defaultMechanic: defaults.defaultMechanic || '',
  });

  const initialized = useRef(false);
  useEffect(() => {
    if (garage?._id && !initialized.current) {
      initialized.current = true;
      const d = garage.jobcardSettings || {};
      setSettings({
        engineChassisNumber: d.engineChassisNumber || false,
        vehicleColour: d.vehicleColour || false,
        customerMobileNo: d.customerMobileNo || false,
        customerEmail: d.customerEmail || false,
        customerBirthday: d.customerBirthday || false,
        customerPickupAddr: d.customerPickupAddr || false,
        customerDeliveryAddr: d.customerDeliveryAddr || false,
        driverDetails: d.driverDetails || false,
        jobwiseMechanic: d.jobwiseMechanic || false,
        customerSignature: d.customerSignature || false,
        customJobcardNo: d.customJobcardNo || false,
        itemWiseDiscount: d.itemWiseDiscount || false,
        jobcardSeries: d.jobcardSeries || false,
        defaultMechanic: d.defaultMechanic || '',
      });
    }
  }, [garage?._id]);

  useEffect(() => {
    settingsApi.getStaffUsers()
      .then(({ data }) => setStaffList(data.staff || []))
      .catch(() => {});
  }, []);

  const toggle = (key, val) => setSettings(s => ({ ...s, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await settingsApi.updateJobcard(settings);
      updateGarage({ jobcardSettings: data.jobcardSettings });
      toast({ title: 'Jobcard settings saved', variant: 'success' });
    } catch (err) {
      toast({ title: err.response?.data?.message || 'Save failed', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const rows = [];
  for (let i = 0; i < TOGGLES.length; i += 3) {
    rows.push(TOGGLES.slice(i, i + 3));
  }

  return (
    <div className="card">
      <div className="space-y-5">
        {rows.map((row, ri) => (
          <div key={ri} className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-5">
            {row.map(item => (
              <div key={item.key} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{item.label}</span>
                <Toggle checked={settings[item.key]} onChange={(v) => toggle(item.key, v)} />
              </div>
            ))}
          </div>
        ))}

        {/* Default Mechanic */}
        <div className="border-t border-border pt-4 flex items-center justify-between max-w-xs ml-auto">
          <div>
            <p className="text-sm text-gray-700 mb-1">Default Mechanic</p>
            <select
              className="input-field text-sm"
              value={settings.defaultMechanic}
              onChange={e => toggle('defaultMechanic', e.target.value)}
            >
              <option value="">None</option>
              {staffList.map(s => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <button onClick={handleSave} disabled={saving} className="btn-primary px-10">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
