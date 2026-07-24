import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Wrench, ArrowRight, ArrowLeft } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { useToast } from '../../components/ui/Toast';

const step1Schema = z.object({
  firstName: z.string().min(2, 'First name required'),
  lastName: z.string().optional(),
  workshopName: z.string().min(2, 'Workshop name required'),
  email: z.string().email('Valid email required'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipcode: z.string().optional(),
  country: z.string().optional(),
  rtoNo: z.string().min(2, 'RTO No. required'),
  phone: z.string().min(10, 'Valid phone required').max(10),
  phone2: z.string().optional(),
  vehicleTypes: z.array(z.string()).optional(),
  acceptedTerms: z.literal(true, { errorMap: () => ({ message: 'You must accept terms' }) })
});

const VEHICLE_TYPES = ['2W'];

export default function SignupPage() {
  const navigate = useNavigate();
  const { register: registerGarage, verifyOtp, isLoading } = useAuthStore();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [selectedVehicleTypes, setSelectedVehicleTypes] = useState(['2W']);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    resolver: zodResolver(step1Schema),
    defaultValues: { country: 'India', vehicleTypes: ['2W'], acceptedTerms: false }
  });

  const toggleVehicleType = (type) => {
    const updated = selectedVehicleTypes.includes(type)
      ? selectedVehicleTypes.filter(t => t !== type)
      : [...selectedVehicleTypes, type];
    setSelectedVehicleTypes(updated);
    setValue('vehicleTypes', updated);
  };

  const onStep1Submit = async (data) => {
    setPhone(data.phone);
    const result = await registerGarage(data);
    if (result.success) {
      toast({ title: 'OTP sent!', description: `OTP sent to +91 ${data.phone}`, variant: 'success' });
      setStep(2);
    } else {
      toast({ title: 'Registration failed', description: result.message, variant: 'error' });
    }
  };

  const onOtpVerify = async () => {
    if (otp.length !== 6) {
      toast({ title: 'Enter 6-digit OTP', variant: 'error' }); return;
    }
    const result = await verifyOtp({ phone, otp, password });
    if (result.success) {
      toast({ title: 'Account created!', description: 'Welcome to RECKON MOTORS', variant: 'success' });
      navigate('/dashboard');
    } else {
      toast({ title: 'Verification failed', description: result.message, variant: 'error' });
    }
  };

  const Field = ({ label, required, error, children }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );

  const inputCls = (err) => `w-full border ${err ? 'border-red-400' : 'border-border'} rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white`;

  return (
    <div className="min-h-screen bg-page flex items-start justify-center py-8 px-4">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
            <Wrench size={18} className="text-white" />
          </div>
          <span className="font-heading font-bold text-gray-800 text-xl">RECKON MOTORS</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border p-8">
          {/* Steps */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= s ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>{s}</div>
                {s === 1 && <div className={`h-0.5 w-16 ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`} />}
              </div>
            ))}
            <span className="ml-2 text-sm text-gray-500">{step === 1 ? 'Workshop Details' : 'Verify OTP'}</span>
          </div>

          {step === 1 ? (
            <form onSubmit={handleSubmit(onStep1Submit)}>
              <h2 className="font-heading font-bold text-gray-800 text-2xl mb-6">Register Your Garage</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="First Name" required error={errors.firstName?.message}>
                  <input {...register('firstName')} className={inputCls(errors.firstName)} placeholder="First name" />
                </Field>
                <Field label="Last Name" error={errors.lastName?.message}>
                  <input {...register('lastName')} className={inputCls(false)} placeholder="Last name" />
                </Field>
                <Field label="Workshop Name" required error={errors.workshopName?.message}>
                  <input {...register('workshopName')} className={inputCls(errors.workshopName)} placeholder="e.g. Singh Auto Works" />
                </Field>
                <Field label="Email" required error={errors.email?.message}>
                  <input {...register('email')} type="email" className={inputCls(errors.email)} placeholder="garage@example.com" />
                </Field>
                <Field label="Address" error={errors.address?.message}>
                  <input {...register('address')} className={inputCls(false)} placeholder="Street address" />
                </Field>
                <Field label="City">
                  <input {...register('city')} className={inputCls(false)} placeholder="City" />
                </Field>
                <Field label="State">
                  <input {...register('state')} className={inputCls(false)} placeholder="State" />
                </Field>
                <Field label="Zipcode">
                  <input {...register('zipcode')} className={inputCls(false)} placeholder="Zipcode" />
                </Field>
                <Field label="RTO No." required error={errors.rtoNo?.message}>
                  <input {...register('rtoNo')} className={inputCls(errors.rtoNo)} placeholder="e.g. MH50" />
                </Field>
                <Field label="Country">
                  <input {...register('country')} className={inputCls(false)} placeholder="Country" />
                </Field>
                <Field label="Phone Number" required error={errors.phone?.message}>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1.5 border border-border rounded-lg px-3 py-2 bg-gray-50 text-sm text-gray-600 whitespace-nowrap">
                      🇮🇳 +91
                    </div>
                    <input {...register('phone')} type="tel" className={`flex-1 ${inputCls(errors.phone)}`} placeholder="10-digit mobile" maxLength={10} />
                  </div>
                </Field>
                <Field label="Phone Number 2">
                  <input {...register('phone2')} type="tel" className={inputCls(false)} placeholder="Optional" maxLength={10} />
                </Field>
              </div>

              {/* Vehicle type fixed to 2W */}

              {/* Terms */}
              <div className="mt-5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('acceptedTerms')}
                    className="mt-0.5 w-4 h-4 accent-primary"
                  />
                  <span className="text-sm text-gray-600">
                    I accept the <span className="text-primary font-medium">Terms and Conditions</span>
                  </span>
                </label>
                {errors.acceptedTerms && <p className="mt-1 text-xs text-red-500">{errors.acceptedTerms.message}</p>}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700">Already have an account?</Link>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-primary text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading ? 'Sending OTP...' : <><ArrowRight size={15} /> Send OTP</>}
                </button>
              </div>
            </form>
          ) : (
            <div className="max-w-sm mx-auto">
              <h2 className="font-heading font-bold text-gray-800 text-2xl mb-2">Verify OTP</h2>
              <p className="text-gray-500 text-sm mb-6">Enter the 6-digit OTP sent to +91 {phone}</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">OTP</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm text-center tracking-[0.5em] text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="______"
                    maxLength={6}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Set Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Create a password (min 6 chars)"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-4 py-2.5 border border-border rounded-xl"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  onClick={onOtpVerify}
                  disabled={isLoading}
                  className="flex-1 bg-primary text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-primary-600 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Register'}
                </button>
              </div>

              <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-xs text-amber-600 text-center">
                  Check the server console for the OTP (SMS integration coming soon)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
