import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import StepIndicator from '../../components/VehicleSale/StepIndicator';
import WizardFooter from '../../components/VehicleSale/WizardFooter';
import Step2Customer from '../../components/VehicleSale/Step2Customer';
import Step3Vehicle from '../../components/VehicleSale/Step3Vehicle';
import Step7Payment from '../../components/VehicleSale/Step7Payment';
import Step8Narration from '../../components/VehicleSale/Step8Narration';
import { vehicleSaleApi } from '../../api/vehicleSaleApi';
import { emptySale, computeDerived, validateStep, STEPS } from './saleUtils';
import useAuthStore from '../../store/authStore';

const dateStr = (v) => (v ? String(v).slice(0, 10) : '');

// Map the logged-in garage profile to dealer/showroom fields.
const dealerFromGarage = (g) => ({
  name:    g?.workshopName || '',
  address: [g?.address, g?.city, g?.state, g?.zipcode].filter(Boolean).join(', '),
  phone:   [g?.mobile, g?.mobile2].filter(Boolean).join(' / '),
  email:   g?.email || '',
  gstin:   g?.gstNo || ''
});

export default function VehicleSaleWizard() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { garage } = useAuthStore();

  const [form, setForm] = useState(emptySale());
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  // New sale: auto-fill dealer/showroom from the logged-in garage profile.
  useEffect(() => {
    if (isEdit || !garage) return;
    setForm(f => ({ ...f, dealer: dealerFromGarage(garage) }));
  }, [garage, isEdit]);

  // Load existing sale in edit mode.
  const load = useCallback(async () => {
    if (!isEdit) return;
    setLoading(true);
    try {
      const { data } = await vehicleSaleApi.get(id);
      setForm({
        ...emptySale(),
        ...data,
        saleDate: dateStr(data.saleDate),
        bookingDate: dateStr(data.bookingDate),
        deliveryDate: dateStr(data.deliveryDate),
        payment: { ...emptySale().payment, ...data.payment, paymentDate: dateStr(data.payment?.paymentDate) },
        vehicles: data.vehicles?.length ? data.vehicles.map(v => ({ ...v, _saved: true })) : emptySale().vehicles
      });
    } catch { toast({ title: 'Failed to load sale', variant: 'error' }); }
    finally { setLoading(false); }
  }, [id, isEdit]);

  useEffect(() => { load(); }, [load]);

  const setTop = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const setNested = (section, field, value) => setForm(f => ({ ...f, [section]: { ...f[section], [field]: value } }));

  const goTo = (target) => { setStep(target); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const handleNext = () => { goTo(Math.min(step + 1, STEPS.length - 1)); };

  const handlePrev = () => { if (step > 0) goTo(step - 1); };

  // Any step is freely navigable at any time.
  const handleStepClick = (target) => goTo(target);

  const handleCancel = () => navigate('/sale/vehicle-sales');

  const handleSave = async () => {
    // Validate the required steps regardless of current position; jump to the first failure.
    for (const s of [0, 1, 2]) {   // Customer, Vehicle, Payment
      const errs = validateStep(s, form);
      if (Object.keys(errs).length) {
        setErrors(errs);
        goTo(s);
        toast({ title: 'Please complete the required fields', variant: 'error' });
        return;
      }
    }
    setSaving(true);
    try {
      const payload = computeDerived(form);
      // Sale Date field was removed — the sale date follows the Booking Date
      // (falls back to today). Existing sales keep their own saleDate.
      payload.saleDate = payload.saleDate || payload.bookingDate || new Date().toISOString().slice(0, 10);
      if (isEdit) await vehicleSaleApi.update(id, payload);
      else        await vehicleSaleApi.create(payload);
      toast({ title: isEdit ? 'Sale updated' : 'Sale created', variant: 'success' });
      navigate('/sale/vehicle-sales');
    } catch (e) {
      toast({ title: 'Error', description: e.response?.data?.message || 'Save failed', variant: 'error' });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="py-16 text-center text-gray-400">Loading…</div>;

  const stepProps = { form, setForm, setTop, setNested, errors };
  const STEP_COMPONENTS = [
    <Step2Customer {...stepProps} />,
    <Step3Vehicle {...stepProps} />,
    <Step7Payment {...stepProps} />,
    <Step8Narration {...stepProps} />
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-1">
            <span>Sale</span> <span>›</span>
            <button onClick={() => navigate('/sale/vehicle-sales')} className="text-primary hover:underline">Vehicle Sales</button>
            <span>›</span> <span className="text-gray-500">{isEdit ? 'Edit Sale' : 'Add Sale'}</span>
          </div>
          <h1 className="font-heading font-bold text-gray-800 text-2xl">{isEdit ? 'Edit Vehicle Sale' : 'Add Vehicle Sale'}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Sale'}</Button>
        </div>
      </div>

      {/* Step indicator */}
      <div className="bg-white rounded-2xl border border-border px-5 py-4 mb-5">
        <StepIndicator current={step} onStepClick={handleStepClick} />
      </div>

      {/* Active step */}
      {STEP_COMPONENTS[step]}

      {/* Footer nav */}
      <WizardFooter
        isFirst={step === 0}
        isLast={step === STEPS.length - 1}
        onPrev={handlePrev}
        onNext={handleNext}
        onCancel={handleCancel}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}
