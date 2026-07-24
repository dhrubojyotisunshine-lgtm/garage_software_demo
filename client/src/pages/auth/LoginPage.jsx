import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Wrench, Eye, EyeOff, ArrowRight, Building2, Users } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { firstAllowedPath } from '../../components/Layout/Sidebar';
import { useToast } from '../../components/ui/Toast';
import { fetchPublicBranding } from '../../api/superAdmin';
import { assetUrlOrDefault } from '../../utils/asset';

// Shown until (or unless) the Super Admin sets a brand name / logo in their Profile.
const DEFAULT_BRAND = 'RECKON MOTORS';

const garageSchema = z.object({
  mobile:   z.string().min(10, 'Enter a valid mobile number'),
  password: z.string().min(1, 'Password is required'),
});

const inp = 'w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white';

export default function LoginPage() {
  const navigate   = useNavigate();
  const { login, staffLogin, isLoading } = useAuthStore();
  const { toast }  = useToast();
  const [mode, setMode]         = useState('garage'); // 'garage' | 'staff'
  const [showPw, setShowPw]     = useState(false);
  const [staffForm, setStaffForm] = useState({ login: '', password: '' });

  // Branding managed from Super Admin → Profile. Failure is non-fatal: the
  // built-in icon + DEFAULT_BRAND stay in place so login always renders.
  const [brand, setBrand] = useState({ brandName: '', logoUrl: '' });
  useEffect(() => {
    fetchPublicBranding()
      .then(({ data }) => setBrand({ brandName: data?.brandName || '', logoUrl: data?.logoUrl || '' }))
      .catch(() => {});
  }, []);

  const brandName = brand.brandName || DEFAULT_BRAND;
  // Uploaded branding logo → shipped default image → Wrench icon.
  const brandLogo = assetUrlOrDefault(brand.logoUrl);
  const [logoBroken, setLogoBroken] = useState(false);

  /* ── Garage login (react-hook-form) ── */
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(garageSchema),
  });

  const onGarageSubmit = async (data) => {
    const result = await login(data);
    if (result.success) {
      toast({ title: 'Welcome back!', variant: 'success' });
      navigate('/dashboard');
    } else {
      toast({ title: 'Login failed', description: result.message, variant: 'error' });
    }
  };

  /* ── Staff login ── */
  const onStaffSubmit = async (e) => {
    e.preventDefault();
    if (!staffForm.login.trim() || !staffForm.password.trim()) {
      return toast({ title: 'Enter username/mobile and password', variant: 'error' });
    }
    const result = await staffLogin(staffForm);
    if (result.success) {
      toast({ title: 'Welcome!', variant: 'success' });
      // Staff may not have Dashboard access — land them on their first allowed menu.
      const menuAccess = useAuthStore.getState().staffUser?.roleId?.menuAccess;
      navigate(firstAllowedPath(menuAccess));
    } else {
      toast({ title: 'Login failed', description: result.message, variant: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-page flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-sidebar-bg flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center overflow-hidden">
            {logoBroken
              ? <Wrench size={20} className="text-white" />
              : <img src={brandLogo} alt="" onError={() => setLogoBroken(true)}
                     className="w-full h-full object-cover" />}
          </div>
          <div>
            <div className="font-heading font-bold text-white text-xl">{brandName}</div>
          </div>
        </div>
        <div>
          <h1 className="font-heading font-bold text-white text-4xl leading-tight mb-4">
            Run your garage<br />
            <span className="text-primary">smarter.</span>
          </h1>
          <p className="text-sidebar-text/70 text-lg">
            Manage jobcards, inventory, billing, and customers — all in one place.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[['Jobcards', '100%'], ['Inventory', 'Live'], ['Reports', 'Auto']].map(([label, val]) => (
              <div key={label} className="bg-white/5 rounded-xl p-4">
                <div className="text-primary font-heading font-bold text-xl">{val}</div>
                <div className="text-sidebar-text/70 text-sm">{label}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sidebar-text/40 text-sm">© {new Date().getFullYear()} {brandName}</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="font-heading font-bold text-gray-800 text-3xl mb-2">Welcome back</h2>
            <p className="text-gray-500 text-sm">Sign in to your account</p>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6">
            {[
              { key: 'garage', label: 'Garage Owner', icon: Building2 },
              { key: 'staff',  label: 'Staff Member',  icon: Users },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === key
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {/* ── Garage login ── */}
          {mode === 'garage' && (
            <form onSubmit={handleSubmit(onGarageSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mobile Number</label>
                <input
                  {...register('mobile')}
                  type="text"
                  placeholder="Enter your mobile number"
                  className={inp}
                />
                {errors.mobile && <p className="mt-1 text-xs text-red-500">{errors.mobile.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPw ? 'text' : 'password'}
                    placeholder="Enter your password"
                    className={inp + ' pr-11'}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
              </div>

              <button type="submit" disabled={isLoading}
                className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {isLoading ? 'Signing in...' : <> Sign In <ArrowRight size={16} /> </>}
              </button>
            </form>
          )}

          {/* ── Staff login ── */}
          {mode === 'staff' && (
            <form onSubmit={onStaffSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Username or Mobile</label>
                <input
                  type="text"
                  value={staffForm.login}
                  onChange={e => setStaffForm(f => ({ ...f, login: e.target.value }))}
                  placeholder="Enter your username or mobile"
                  className={inp}
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={staffForm.password}
                    onChange={e => setStaffForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Enter your password"
                    className={inp + ' pr-11'}
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={isLoading}
                className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {isLoading ? 'Signing in...' : <> Sign In as Staff <ArrowRight size={16} /> </>}
              </button>
            </form>
          )}

          {/* Self-registration is disabled — garages are created from the Super Admin panel.
              Restore this block (and the /signup route in App.jsx) to re-enable it.
          {mode === 'garage' && (
            <p className="mt-6 text-center text-sm text-gray-500">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary font-semibold hover:underline">
                Register your garage
              </Link>
            </p>
          )}
          */}
        </div>
      </div>
    </div>
  );
}
