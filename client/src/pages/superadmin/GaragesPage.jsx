import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, X, CheckCircle, XCircle, Eye, EyeOff, Settings, GripVertical, Camera, RotateCcw, KeyRound, Copy, Check, RefreshCw, LogIn, Database } from 'lucide-react';
import { superAdminApi } from '../../api/superAdmin';
import { useToast } from '../../components/ui/Toast';
import { assetUrl } from '../../utils/asset';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const BRAND_DEFAULTS = { primaryColor: '#E53935', headerColor: '#ffffff', menuColor: '#1C1F26' };

const DEFAULT_MENU = [
  { key: 'dashboard',    label: 'Dashboard',    enabled: true, order: 0 },
  { key: 'jobcards',     label: 'Jobcards',     enabled: true, order: 1 },
  { key: 'customers',   label: 'Customers',    enabled: true, order: 2 },
  { key: 'estimate',    label: 'Estimate',     enabled: true, order: 3 },
  { key: 'counter-sale',label: 'Counter-Sale', enabled: true, order: 4 },
  { key: 'inventory',   label: 'Inventory',    enabled: true, order: 5 },
  { key: 'sale',        label: 'Vehicle Sale', enabled: true, order: 6 },
  { key: 'ledger',      label: 'Ledger',       enabled: true, order: 7 },
  { key: 'reports',     label: 'Reports',      enabled: true, order: 8 },
  { key: 'cashbook',    label: 'Cashbook',     enabled: true, order: 9 },
  { key: 'appointment', label: 'Appointment',  enabled: true, order: 10 },
  { key: 'expenses',    label: 'Expenses',     enabled: true, order: 11 },
  { key: 'masters',     label: 'Masters',      enabled: true, order: 12 },
  { key: 'staff',       label: 'Staff',        enabled: true, order: 13 },
  { key: 'settings',    label: 'Settings',     enabled: true, order: 14 },
];

function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }

const EMPTY_FORM = { firstName: '', lastName: '', workshopName: '', mobile: '', password: '', city: '', state: '', email: '', vehicleTypes: ['2W'] };

/* ── Create Franchise Modal ────────────────────────────────── */
function CreateModal({ onClose, onCreated }) {
  const { toast } = useToast();
  const [form, setForm]     = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.firstName || !form.workshopName || !form.mobile || !form.password) {
      return toast({ title: 'Fill required fields', variant: 'error' });
    }
    setSaving(true);
    try {
      await superAdminApi.createGarage(form);
      toast({ title: 'Franchise created', variant: 'success' });
      onCreated();
    } catch (err) {
      toast({ title: err?.response?.data?.message || 'Create failed', variant: 'error' });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-200 z-10">
          <h3 className="font-semibold text-gray-800">Create New Franchise</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">First Name <span className="text-red-500">*</span></label>
              <input type="text" value={form.firstName} onChange={e => set('firstName', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Last Name</label>
              <input type="text" value={form.lastName} onChange={e => set('lastName', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Workshop Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.workshopName} onChange={e => set('workshopName', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Mobile <span className="text-red-500">*</span></label>
              <input type="tel" value={form.mobile} onChange={e => set('mobile', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              <button type="button" onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">City</label>
              <input type="text" value={form.city} onChange={e => set('city', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">State</label>
              <input type="text" value={form.state} onChange={e => set('state', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60"
            style={{ background: 'linear-gradient(to right, #dc2626, #991b1b)' }}>
            {saving ? 'Creating...' : 'Create Franchise'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Credentials Modal ────────────────────────────────────── */
function CredentialsModal({ garage, onClose }) {
  const { toast } = useToast();
  const [creds, setCreds]   = useState(null);
  const [loading, setLoad]  = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [copiedField, setCopied] = useState(null);

  useEffect(() => {
    superAdminApi.getCredentials(garage._id)
      .then(({ data }) => setCreds(data))
      .catch(() => toast({ title: 'Failed to load credentials', variant: 'error' }))
      .finally(() => setLoad(false));
  }, [garage._id]);

  const copy = (field, val) => {
    navigator.clipboard.writeText(val).then(() => {
      setCopied(field);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <KeyRound size={16} className="text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">Login Credentials</h3>
              <p className="text-xs text-gray-400">{garage.workshopName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-6">
          {loading && <p className="text-sm text-gray-400 text-center py-4">Loading...</p>}
          {!loading && creds && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Mobile (Username)</label>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                  <span className="flex-1 text-sm font-mono text-gray-800">{creds.mobile}</span>
                  <button onClick={() => copy('mobile', creds.mobile)}
                    className="text-gray-400 hover:text-gray-600 transition-colors">
                    {copiedField === 'mobile' ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Password</label>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                  <span className="flex-1 text-sm font-mono text-gray-800 tracking-wider">
                    {creds.plainPassword
                      ? (showPw ? creds.plainPassword : '•'.repeat(Math.min(creds.plainPassword.length, 10)))
                      : <span className="text-gray-400 italic text-xs">Not available</span>}
                  </span>
                  {creds.plainPassword && (
                    <>
                      <button onClick={() => setShowPw(p => !p)} className="text-gray-400 hover:text-gray-600">
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                      <button onClick={() => copy('password', creds.plainPassword)}
                        className="text-gray-400 hover:text-gray-600 transition-colors">
                        {copiedField === 'password' ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
                      </button>
                    </>
                  )}
                </div>
                {!creds.plainPassword && (
                  <p className="text-xs text-gray-400 mt-1.5">Password not stored — set a new one via the update route.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 pb-5">
          <button onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Reset Password Modal ─────────────────────────────────── */
function ResetPasswordModal({ garage, onClose }) {
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleReset = async () => {
    if (newPassword.length < 6) return toast({ title: 'Password must be at least 6 characters', variant: 'error' });
    setSaving(true);
    try {
      await superAdminApi.resetPassword(garage._id, { newPassword });
      toast({ title: 'Password reset successfully', variant: 'success' });
      onClose();
    } catch (err) {
      toast({ title: err?.response?.data?.message || 'Reset failed', variant: 'error' });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <RefreshCw size={16} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">Reset Password</h3>
              <p className="text-xs text-gray-400">{garage.workshopName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">New Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <button
            onClick={handleReset}
            disabled={saving}
            className="w-full py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60 bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            {saving ? 'Resetting...' : 'Reset Password'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Franchise Manage Modal (Branding + Menu) ──────────────── */
function GarageManageModal({ garage, onClose, onSaved }) {
  const { toast } = useToast();
  const [tab, setTab] = useState('branding');
  const [saving, setSaving] = useState(false);

  const [primaryColor, setPrimaryColor] = useState(garage?.branding?.primaryColor || BRAND_DEFAULTS.primaryColor);
  const [headerColor,  setHeaderColor]  = useState(garage?.branding?.headerColor  || BRAND_DEFAULTS.headerColor);
  const [menuColor,    setMenuColor]    = useState(garage?.branding?.menuColor    || BRAND_DEFAULTS.menuColor);
  const [logoUrl,      setLogoUrl]      = useState(garage?.branding?.logoUrl || '');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoRef = useRef();

  const logoSrc = logoUrl ? assetUrl(logoUrl) : null;

  const handleLogoFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const { data } = await superAdminApi.uploadLogo(garage._id, file);
      setLogoUrl(data.url);
      toast({ title: 'Logo uploaded', variant: 'success' });
    } catch { toast({ title: 'Logo upload failed', variant: 'error' }); }
    finally { setUploadingLogo(false); e.target.value = ''; }
  };

  const resetColors = () => {
    setPrimaryColor(BRAND_DEFAULTS.primaryColor);
    setHeaderColor(BRAND_DEFAULTS.headerColor);
    setMenuColor(BRAND_DEFAULTS.menuColor);
  };

  const [menuItems, setMenuItems] = useState(() => {
    const cfg = garage?.menuConfig;
    if (cfg && cfg.length > 0) {
      const existing = [...cfg].sort((a, b) => a.order - b.order);
      // Append any newly added modules that aren't in this garage's saved config yet.
      const have = new Set(existing.map(m => m.key));
      const missing = DEFAULT_MENU.filter(m => !have.has(m.key)).map(m => ({ ...m }));
      return [...existing, ...missing].map((m, idx) => ({ ...m, order: idx }));
    }
    return DEFAULT_MENU.map(m => ({ ...m }));
  });

  const dragIdx = useRef(null);

  const handleDragStart = (i) => { dragIdx.current = i; };
  const handleDragOver  = (e, i) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    const next = [...menuItems];
    const [moved] = next.splice(dragIdx.current, 1);
    next.splice(i, 0, moved);
    dragIdx.current = i;
    setMenuItems(next.map((m, idx) => ({ ...m, order: idx })));
  };
  const handleDrop = () => { dragIdx.current = null; };

  const toggleItem = (key) => {
    setMenuItems(prev => prev.map(m => m.key === key ? { ...m, enabled: !m.enabled } : m));
  };

  const saveBranding = async () => {
    setSaving(true);
    try {
      await superAdminApi.updateBranding(garage._id, { primaryColor, headerColor, menuColor, logoUrl });
      toast({ title: 'Branding saved', variant: 'success' });
      onSaved();
    } catch { toast({ title: 'Save failed', variant: 'error' }); }
    finally { setSaving(false); }
  };

  const saveMenu = async () => {
    setSaving(true);
    try {
      await superAdminApi.updateMenu(garage._id, { menuConfig: menuItems });
      toast({ title: 'Menu saved', variant: 'success' });
      onSaved();
    } catch { toast({ title: 'Save failed', variant: 'error' }); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="font-semibold text-gray-800">Manage Franchise</h3>
            <p className="text-xs text-gray-400 mt-0.5">{garage.workshopName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="flex border-b border-gray-200 px-6">
          {[['branding','Branding & Theme'],['menu','Menu Access']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`py-3 text-sm font-medium border-b-2 mr-6 -mb-px transition-colors ${
                tab === key ? 'text-red-600 border-red-500' : 'text-gray-400 border-transparent'
              }`}>{label}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'branding' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Brand Logo</label>
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16">
                    <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                      {logoSrc
                        ? <img src={logoSrc} alt="logo" className="w-full h-full object-contain" />
                        : <span className="text-[9px] text-gray-400 text-center px-1">No logo</span>}
                    </div>
                    <button type="button" onClick={() => logoRef.current?.click()} disabled={uploadingLogo}
                      className="absolute -bottom-1.5 -right-1.5 w-6 h-6 text-white rounded-full flex items-center justify-center shadow"
                      style={{ backgroundColor: primaryColor }}>
                      <Camera size={11} />
                    </button>
                    <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Shown in franchise sidebar. PNG/JPG/SVG, max 5MB.</p>
                    {uploadingLogo && <p className="text-xs text-red-500 mt-1">Uploading…</p>}
                    {logoUrl && !uploadingLogo && (
                      <button onClick={() => setLogoUrl('')} className="text-xs text-gray-400 hover:text-red-500 mt-1">Remove logo</button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[
                  ['Primary / Buttons', primaryColor, setPrimaryColor],
                  ['Header Color',      headerColor,  setHeaderColor],
                  ['Sidebar Color',     menuColor,    setMenuColor],
                ].map(([label, val, setter]) => (
                  <div key={label}>
                    <label className="block text-xs font-medium text-gray-700 mb-2">{label}</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={val} onChange={e => setter(e.target.value)}
                        className="w-10 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5 flex-shrink-0" />
                      <input type="text" value={val} onChange={e => setter(e.target.value)}
                        className="w-full min-w-0 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-red-300" />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Live Preview</p>
                  <button onClick={resetColors} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                    <RotateCcw size={11} /> Reset colors
                  </button>
                </div>
                <div className="rounded-xl overflow-hidden border border-gray-200 h-40 flex">
                  <div className="w-28 flex-shrink-0 p-2 flex flex-col gap-1" style={{ backgroundColor: menuColor }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {logoSrc
                        ? <img src={logoSrc} alt="" className="w-5 h-5 rounded object-contain bg-white/10" />
                        : <div className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: primaryColor }}><span className="text-white text-[8px] font-bold">{(garage.workshopName||'G')[0]}</span></div>}
                      <span className="text-white/80 text-[8px] font-semibold truncate">{garage.workshopName}</span>
                    </div>
                    <div className="text-white text-[9px] py-1 px-2 rounded truncate" style={{ backgroundColor: primaryColor }}>Dashboard</div>
                    {['Jobcards','Customers'].map(l => (
                      <div key={l} className="text-white/60 text-[9px] py-1 px-2 rounded truncate">{l}</div>
                    ))}
                  </div>
                  <div className="flex-1 flex flex-col">
                    <div className="h-8 flex-shrink-0 flex items-center px-3" style={{ backgroundColor: headerColor, borderBottom: '1px solid #e5e7eb' }}>
                      <span className="text-[10px] font-semibold text-gray-700">{garage.workshopName}</span>
                    </div>
                    <div className="flex-1 bg-gray-50 p-3 flex flex-col gap-2">
                      <div className="bg-white rounded-lg flex-1 border border-gray-100" />
                      <button className="self-start text-white text-[10px] font-medium px-3 py-1.5 rounded-lg" style={{ backgroundColor: primaryColor }}>
                        Primary Button
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <button onClick={saveBranding} disabled={saving}
                className="w-full py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60"
                style={{ background: 'linear-gradient(to right, #dc2626, #991b1b)' }}>
                {saving ? 'Saving...' : 'Save Branding'}
              </button>
            </div>
          )}

          {tab === 'menu' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-400">Drag to reorder. Uncheck to hide from franchise menu.</p>
              <div className="space-y-1">
                {menuItems.map((item, i) => (
                  <div
                    key={item.key}
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={e => handleDragOver(e, i)}
                    onDrop={handleDrop}
                    className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 cursor-grab active:cursor-grabbing hover:border-red-200 transition-colors"
                  >
                    <GripVertical size={14} className="text-gray-300 flex-shrink-0" />
                    <span className="w-5 h-5 flex items-center justify-center text-gray-400 text-xs font-mono flex-shrink-0">{i + 1}</span>
                    <span className="flex-1 text-sm text-gray-700 font-medium">{item.label}</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={() => toggleItem(item.key)}
                        className="w-4 h-4 accent-red-500"
                      />
                      <span className={`text-xs ${item.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                        {item.enabled ? 'Visible' : 'Hidden'}
                      </span>
                    </label>
                  </div>
                ))}
              </div>

              <button onClick={saveMenu} disabled={saving}
                className="w-full py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60"
                style={{ background: 'linear-gradient(to right, #dc2626, #991b1b)' }}>
                {saving ? 'Saving...' : 'Save Menu Config'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────── */
export default function GaragesPage() {
  const { toast } = useToast();
  const [garages, setGarages]     = useState([]);
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState('all');
  const [loading, setLoading]     = useState(false);
  const [showCreate, setCreate]   = useState(false);
  const [manageGarage, setManage] = useState(null);
  const [credGarage, setCred]     = useState(null);
  const [togglingId, setToggling] = useState(null);
  const [resetPwGarage, setResetPw] = useState(null);
  const [loginId, setLoginId] = useState(null);
  const [seedId, setSeedId]   = useState(null);

  // Backfill default masters (jobcard types/statuses, customer voices, labour, lubes,
  // vehicle makes/models, roles) for a franchise that was created without them.
  // Idempotent on the server — only fills what's missing, never duplicates.
  const handleSeedDefaults = async (g) => {
    if (!window.confirm(
      `Add missing default master data to "${g.workshopName}"?\n\nOnly master types this franchise has NONE of will be added. Existing data is not changed.`
    )) return;
    setSeedId(String(g._id));
    try {
      const { data } = await superAdminApi.seedDefaults(g._id);
      toast({ title: data.message || 'Defaults added', variant: 'success' });
    } catch (e) {
      toast({ title: e?.response?.data?.message || 'Failed to add defaults', variant: 'error' });
    } finally { setSeedId(null); }
  };

  // Log in as (impersonate) a franchise: store its token and open the garage app.
  // The super-admin session (ttn_sa_token) stays intact so we can return.
  const handleLoginAs = async (g) => {
    setLoginId(String(g._id));
    try {
      const { data } = await superAdminApi.loginAsGarage(g._id);
      localStorage.setItem('ttn_token', data.token);
      localStorage.setItem('ttn_impersonating', g.workshopName || 'Franchise');
      window.location.href = '/dashboard';
    } catch (e) {
      toast({ title: e?.response?.data?.message || 'Failed to log in as franchise', variant: 'error' });
      setLoginId(null);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (filter === 'active')   params.active = 'true';
      if (filter === 'inactive') params.active = 'false';
      const { data } = await superAdminApi.listGarages(params);
      setGarages(data);
    } catch { toast({ title: 'Failed to load franchises', variant: 'error' }); }
    finally { setLoading(false); }
  }, [search, filter]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (id) => {
    setToggling(id);
    try {
      const { data } = await superAdminApi.toggleGarage(id);
      setGarages(g => g.map(x => String(x._id) === String(id) ? { ...x, active: data.active } : x));
      toast({ title: data.active ? 'Franchise activated' : 'Franchise deactivated', variant: 'success' });
    } catch { toast({ title: 'Toggle failed', variant: 'error' }); }
    finally { setToggling(null); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Franchises</h1>
          <p className="text-sm text-gray-400 mt-0.5">{garages.length} total franchise locations</p>
        </div>
        <button onClick={() => setCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium"
          style={{ background: 'linear-gradient(to right, #dc2626, #991b1b)' }}>
          <Plus size={16} /> Create Franchise
        </button>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="flex items-center gap-2 flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2.5">
          <Search size={16} className="text-gray-400" />
          <input type="text" placeholder="Search by name, mobile, city..." value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 text-sm outline-none" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="border border-gray-200 bg-white rounded-xl px-3 py-2.5 text-sm focus:outline-none">
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* overflow-x-auto (not hidden) so the right-hand columns — Manage / Login /
          Defaults — stay reachable via horizontal scroll on narrow screens. */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[1250px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {['Workshop Name','Owner','Mobile','City','Status','Created','Credentials','Reset Pw','Action','Manage','Login','Defaults'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={12} className="text-center py-10 text-gray-400">Loading...</td></tr>}
            {!loading && garages.length === 0 && <tr><td colSpan={12} className="text-center py-10 text-gray-400">No franchises found</td></tr>}
            {garages.map(g => (
              <tr key={String(g._id)} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-800">{g.workshopName}</td>
                <td className="px-5 py-3 text-gray-600">{[g.firstName, g.lastName].filter(Boolean).join(' ')}</td>
                <td className="px-5 py-3 text-gray-600">{g.mobile}</td>
                <td className="px-5 py-3 text-gray-500">{g.city || '—'}</td>
                <td className="px-5 py-3">
                  {g.active !== false
                    ? <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle size={12} /> Active</span>
                    : <span className="flex items-center gap-1 text-red-500 text-xs font-medium"><XCircle size={12} /> Inactive</span>
                  }
                </td>
                <td className="px-5 py-3 text-gray-400 text-xs">{fmtDate(g.createdAt)}</td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => setCred(g)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors">
                    <KeyRound size={12} /> View
                  </button>
                </td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => setResetPw(g)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors">
                    <RefreshCw size={12} /> Reset
                  </button>
                </td>
                <td className="px-5 py-3">
                  <button
                    disabled={togglingId === String(g._id)}
                    onClick={() => handleToggle(g._id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                      g.active !== false
                        ? 'border-red-200 text-red-600 hover:bg-red-50'
                        : 'border-green-200 text-green-600 hover:bg-green-50'
                    }`}>
                    {togglingId === String(g._id) ? '...' : g.active !== false ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => setManage(g)}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                    <Settings size={12} /> Manage
                  </button>
                </td>
                <td className="px-5 py-3">
                  <button
                    disabled={loginId === String(g._id)}
                    onClick={() => handleLoginAs(g)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border border-green-200 text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50">
                    <LogIn size={12} /> {loginId === String(g._id) ? '...' : 'Login'}
                  </button>
                </td>
                <td className="px-5 py-3">
                  <button
                    disabled={seedId === String(g._id)}
                    onClick={() => handleSeedDefaults(g)}
                    title="Add missing default master data (types, statuses, etc.)"
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50">
                    <Database size={12} /> {seedId === String(g._id) ? '...' : 'Defaults'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && <CreateModal onClose={() => setCreate(false)} onCreated={() => { setCreate(false); load(); }} />}
      {credGarage && <CredentialsModal garage={credGarage} onClose={() => setCred(null)} />}
      {resetPwGarage && <ResetPasswordModal garage={resetPwGarage} onClose={() => setResetPw(null)} />}
      {manageGarage && (
        <GarageManageModal
          garage={manageGarage}
          onClose={() => setManage(null)}
          onSaved={() => { setManage(null); load(); }}
        />
      )}
    </div>
  );
}
