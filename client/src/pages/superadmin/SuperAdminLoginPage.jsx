import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Shield } from 'lucide-react';
import useSuperAdminStore from '../../store/superAdminStore';
import { fetchPublicBranding } from '../../api/superAdmin';
import { assetUrlOrDefault } from '../../utils/asset';

// Shown until (or unless) a brand name / logo is set in Super Admin → Profile.
const DEFAULT_BRAND = 'RECKON MOTORS';

export default function SuperAdminLoginPage() {
  const navigate = useNavigate();
  const { login } = useSuperAdminStore();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // Branding from Super Admin → Profile. Failure is non-fatal — the built-in
  // Shield icon + DEFAULT_BRAND remain so login always renders.
  const [brand, setBrand] = useState({ brandName: '', logoUrl: '' });
  useEffect(() => {
    fetchPublicBranding()
      .then(({ data }) => setBrand({ brandName: data?.brandName || '', logoUrl: data?.logoUrl || '' }))
      .catch(() => {});
  }, []);

  const brandName = brand.brandName || DEFAULT_BRAND;
  // Uploaded branding logo → shipped default image → Shield icon.
  const brandLogo = assetUrlOrDefault(brand.logoUrl);
  const [logoBroken, setLogoBroken] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await login(form.email, form.password);
    setLoading(false);
    if (res.ok) navigate('/superadmin/dashboard');
    else setError(res.message);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-3 overflow-hidden">
            {logoBroken
              ? <Shield size={32} className="text-white" />
              : <img src={brandLogo} alt="" onError={() => setLogoBroken(true)}
                     className="w-full h-full object-cover" />}
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Super Admin</h1>
          <p className="text-gray-500 text-sm mt-1">{brandName} Franchise Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="Enter email"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                required
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Enter password"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button type="button" onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-60 transition-opacity mt-2"
            style={{ background: 'linear-gradient(to right, #dc2626, #991b1b)' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          This portal is for authorized administrators only.
        </p>
      </div>
    </div>
  );
}
