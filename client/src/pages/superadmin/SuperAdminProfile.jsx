import { useEffect, useRef, useState } from 'react';
import { Shield, Upload, Save, KeyRound } from 'lucide-react';
import { superAdminApi } from '../../api/superAdmin';
import useSuperAdminStore from '../../store/superAdminStore';
import { useToast } from '../../components/ui/Toast';
import { assetUrlOrDefault } from '../../utils/asset';

// Toggle for the Super Admin ACCOUNT section — Admin Name, Email and the whole
// Change Password card. false = hidden AND not submitted, so the client can only
// update the brand logo + brand name and cannot alter the login credentials.
// Set to true to show and allow editing again.
const SHOW_ACCOUNT_FIELDS = false;

export default function SuperAdminProfile() {
  const { admin, setAdmin, fetchMe } = useSuperAdminStore();
  const { toast } = useToast();
  const fileRef = useRef(null);

  const [form, setForm]   = useState({ name: '', brandName: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwdSaving, setPwdSaving] = useState(false);

  useEffect(() => {
    if (!admin) { fetchMe(); return; }
    setForm({ name: admin.name || '', brandName: admin.brandName || '', email: admin.email || '' });
  }, [admin]);

  const saveProfile = async (e) => {
    e.preventDefault();

    // When the account section is hidden, only the brand name is sent — name and
    // email are left untouched on the server.
    let payload = { brandName: form.brandName };

    if (SHOW_ACCOUNT_FIELDS) {
      if (!form.name.trim())  return toast({ title: 'Admin name cannot be empty', variant: 'error' });
      if (!form.email.trim()) return toast({ title: 'Email cannot be empty', variant: 'error' });

      // Email is the super-admin login id — confirm before changing it.
      const emailChanged = form.email.trim().toLowerCase() !== (admin?.email || '').toLowerCase();
      if (emailChanged && !window.confirm(
        `You will log in with "${form.email.trim()}" from now on.\n\nYour password stays the same. Continue?`
      )) return;

      payload = form;
    }

    setSaving(true);
    try {
      const { data } = await superAdminApi.updateProfile(payload);
      setAdmin(data);
      toast({ title: 'Profile updated', variant: 'success' });
    } catch (err) {
      toast({ title: err?.response?.data?.message || 'Update failed', variant: 'error' });
    } finally { setSaving(false); }
  };

  const onPickLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (/svg/i.test(file.type) || /\.svg$/i.test(file.name)) {
      toast({ title: 'SVG not allowed. Use JPG, PNG, GIF or WEBP.', variant: 'error' });
      e.target.value = '';
      return;
    }
    setUploading(true);
    try {
      await superAdminApi.uploadProfileLogo(file);
      await fetchMe();               // refresh admin (logoUrl)
      toast({ title: 'Logo updated', variant: 'success' });
    } catch (err) {
      toast({ title: err?.response?.data?.message || 'Upload failed', variant: 'error' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwd.newPassword.length < 6) return toast({ title: 'New password must be at least 6 characters', variant: 'error' });
    if (pwd.newPassword !== pwd.confirm) return toast({ title: 'New passwords do not match', variant: 'error' });
    setPwdSaving(true);
    try {
      await superAdminApi.changePassword({ currentPassword: pwd.currentPassword, newPassword: pwd.newPassword });
      toast({ title: 'Password updated', variant: 'success' });
      setPwd({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast({ title: err?.response?.data?.message || 'Password change failed', variant: 'error' });
    } finally { setPwdSaving(false); }
  };

  // Shows the uploaded logo, else the shipped default.
  const logoSrc = assetUrlOrDefault(admin?.logoUrl);
  const [logoBroken, setLogoBroken] = useState(false);
  const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500';
  const label = 'block text-xs font-medium text-gray-600 mb-1';

  return (
    <div className="max-w-6xl">
      <h1 className="text-xl font-bold text-gray-800 mb-1">Super Admin Profile</h1>
      <p className="text-sm text-gray-500 mb-6">
        {SHOW_ACCOUNT_FIELDS
          ? 'Manage your brand name, logo, email and password.'
          : 'Manage the brand name and logo shown on the login page.'}
      </p>

      <div className={`grid gap-6 items-start ${SHOW_ACCOUNT_FIELDS ? 'lg:grid-cols-2' : 'max-w-xl'}`}>
      {/* Brand / Profile */}
      <form onSubmit={saveProfile} className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">{SHOW_ACCOUNT_FIELDS ? 'Brand & Account' : 'Brand'}</h2>

        {/* Logo */}
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-xl bg-red-600 flex items-center justify-center overflow-hidden flex-shrink-0">
            {logoBroken
              ? <Shield size={26} className="text-white" />
              : <img src={logoSrc} alt="logo" onError={() => setLogoBroken(true)}
                     className="w-full h-full object-cover" />}
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden onChange={onPickLogo} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-60"
            >
              <Upload size={15} />
              {uploading ? 'Uploading…' : 'Upload logo'}
            </button>
            <p className="text-[11px] text-gray-400 mt-1">JPG, PNG, GIF or WEBP. Max 5 MB. SVG not allowed.</p>
          </div>
        </div>

        <div className="grid gap-4">
          <div>
            <label className={label}>Brand Name (sidebar title)</label>
            <input className={input} value={form.brandName}
              onChange={e => setForm({ ...form, brandName: e.target.value })} placeholder="RECKON MOTORS" />
          </div>
          {SHOW_ACCOUNT_FIELDS && (
            <>
              <div>
                <label className={label}>Admin Name</label>
                <input className={input} value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
              </div>
              <div>
                <label className={label}>Email</label>
                <input type="email" className={input} value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })} placeholder="admin@example.com" />
              </div>
            </>
          )}
        </div>

        <div className="mt-5">
          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60">
            <Save size={15} />
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      {/* Password */}
      {SHOW_ACCOUNT_FIELDS && (
      <form onSubmit={changePassword} className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Change Password</h2>
        <div className="grid gap-4">
          <div>
            <label className={label}>Current Password</label>
            <input type="password" className={input} value={pwd.currentPassword}
              onChange={e => setPwd({ ...pwd, currentPassword: e.target.value })} />
          </div>
          <div>
            <label className={label}>New Password</label>
            <input type="password" className={input} value={pwd.newPassword}
              onChange={e => setPwd({ ...pwd, newPassword: e.target.value })} />
          </div>
          <div>
            <label className={label}>Confirm New Password</label>
            <input type="password" className={input} value={pwd.confirm}
              onChange={e => setPwd({ ...pwd, confirm: e.target.value })} />
          </div>
        </div>
        <div className="mt-5">
          <button type="submit" disabled={pwdSaving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-gray-800 text-white hover:bg-gray-900 disabled:opacity-60">
            <KeyRound size={15} />
            {pwdSaving ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </form>
      )}
      </div>
    </div>
  );
}
