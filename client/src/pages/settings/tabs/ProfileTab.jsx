import { useState, useRef, useEffect } from 'react';
import { Camera, ChevronDown, ChevronUp } from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import { settingsApi } from '../../../api/settings';
import { useToast } from '../../../components/ui/Toast';
import { assetUrl } from '../../../utils/asset';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const VEHICLE_TYPES = ['2W', '3W', '4W', '6W'];

function ImageUploadBox({ label, field, imageUrl, onUploaded }) {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const typeMap = { logoUrl: 'logo', signatureUrl: 'signature', profilePicUrl: 'profile-pic' };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data } = await settingsApi.uploadImage(typeMap[field], file);
      onUploaded(field, data.url);
    } catch {
      // error handled by parent
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-medium text-gray-600">{label}</p>
      <div className="relative w-20 h-20">
        <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border bg-gray-50 flex items-center justify-center overflow-hidden">
          {imageUrl ? (
            <img
              src={assetUrl(imageUrl)}
              alt={label}
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="text-[10px] text-gray-400 text-center px-1">No image</span>
          )}
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center shadow"
        >
          <Camera size={11} />
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      {uploading && <span className="text-[10px] text-primary">Uploading…</span>}
    </div>
  );
}

export default function ProfileTab() {
  const { garage, updateGarage } = useAuthStore();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);

  const [form, setForm] = useState({
    workshopName: garage?.workshopName || '',
    firstName: garage?.firstName || '',
    lastName: garage?.lastName || '',
    email: garage?.email || '',
    mobile2: garage?.mobile2 || '',
    rtoNo: garage?.rtoNo || '',
    zipcode: garage?.zipcode || '',
    city: garage?.city || '',
    address: garage?.address || '',
    state: garage?.state || '',
    gstNo: garage?.gstNo || '',
    vehicleTypes: garage?.vehicleTypes || [],
    logoUrl: garage?.logoUrl || '',
    signatureUrl: garage?.signatureUrl || '',
    profilePicUrl: garage?.profilePicUrl || '',
  });

  useEffect(() => {
    if (garage?._id) {
      setForm({
        workshopName: garage.workshopName || '',
        firstName: garage.firstName || '',
        lastName: garage.lastName || '',
        email: garage.email || '',
        mobile2: garage.mobile2 || '',
        rtoNo: garage.rtoNo || '',
        zipcode: garage.zipcode || '',
        city: garage.city || '',
        address: garage.address || '',
        state: garage.state || '',
        gstNo: garage.gstNo || '',
        vehicleTypes: garage.vehicleTypes || [],
        logoUrl: garage.logoUrl || '',
        signatureUrl: garage.signatureUrl || '',
        profilePicUrl: garage.profilePicUrl || '',
      });
    }
  }, [garage?._id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleVehicle = (type) => {
    setForm(f => ({
      ...f,
      vehicleTypes: f.vehicleTypes.includes(type)
        ? f.vehicleTypes.filter(v => v !== type)
        : [...f.vehicleTypes, type]
    }));
  };

  const handleImageUploaded = (field, url) => {
    setForm(f => ({ ...f, [field]: url }));
    updateGarage({ [field]: url });
    toast({ title: 'Image uploaded', variant: 'success' });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await settingsApi.updateProfile({
        workshopName: form.workshopName,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        mobile2: form.mobile2,
        rtoNo: form.rtoNo,
        zipcode: form.zipcode,
        city: form.city,
        address: form.address,
        state: form.state,
        gstNo: form.gstNo,
        vehicleTypes: form.vehicleTypes,
      });
      updateGarage(data.garage);
      toast({ title: 'Profile saved', variant: 'success' });
    } catch (err) {
      toast({ title: err.response?.data?.message || 'Save failed', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSave = async () => {
    if (!passwords.newPass || passwords.newPass !== passwords.confirm) {
      toast({ title: 'New passwords do not match', variant: 'error' });
      return;
    }
    if (passwords.newPass.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'error' });
      return;
    }
    setSavingPw(true);
    try {
      await settingsApi.updatePassword({ currentPassword: passwords.current, newPassword: passwords.newPass });
      toast({ title: 'Password updated', variant: 'success' });
      setPasswords({ current: '', newPass: '', confirm: '' });
      setShowPasswordSection(false);
    } catch (err) {
      toast({ title: err.response?.data?.message || 'Failed to update password', variant: 'error' });
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Image uploads */}
      <div className="card">
        <div className="flex justify-around py-4">
          <ImageUploadBox label="Workshop Logo" field="logoUrl" imageUrl={form.logoUrl} onUploaded={handleImageUploaded} />
          <ImageUploadBox label="Workshop Signature" field="signatureUrl" imageUrl={form.signatureUrl} onUploaded={handleImageUploaded} />
          <ImageUploadBox label="Profile Picture" field="profilePicUrl" imageUrl={form.profilePicUrl} onUploaded={handleImageUploaded} />
        </div>
      </div>

      {/* Profile fields */}
      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Workshop Name <span className="text-red-500">*</span></label>
            <input className="input-field" value={form.workshopName} onChange={e => set('workshopName', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">First Name <span className="text-red-500">*</span></label>
            <input className="input-field" value={form.firstName} onChange={e => set('firstName', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
            <input className="input-field" value={form.lastName} onChange={e => set('lastName', e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input className="input-field" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number 1 <span className="text-red-500">*</span></label>
            <input className="input-field bg-gray-50" value={garage?.mobile || ''} disabled />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number 2</label>
            <input className="input-field" value={form.mobile2} onChange={e => set('mobile2', e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">RTO Code <span className="text-red-500">*</span></label>
            <input className="input-field" value={form.rtoNo} onChange={e => set('rtoNo', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">City <span className="text-red-500">*</span></label>
            <input className="input-field" value={form.city} onChange={e => set('city', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Zip Code</label>
            <input className="input-field" value={form.zipcode} onChange={e => set('zipcode', e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
            <input className="input-field" value={form.state} onChange={e => set('state', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">GST IN</label>
            <input className="input-field" value={form.gstNo} onChange={e => set('gstNo', e.target.value.toUpperCase())} placeholder="e.g. 27ABCDE1234F1Z5" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
            <textarea className="input-field resize-none" rows={2} value={form.address} onChange={e => set('address', e.target.value)} />
          </div>
        </div>

        {/* Vehicle types */}
        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-600 mb-2">Vehicle Types</label>
          <div className="flex gap-3">
            {VEHICLE_TYPES.map(type => (
              <label key={type} className="flex flex-col items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.vehicleTypes.includes(type)}
                  onChange={() => toggleVehicle(type)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-xs text-gray-600">{type}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <button onClick={handleSave} disabled={saving} className="btn-primary px-10">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Reset Password */}
      <div className="card">
        <button
          onClick={() => setShowPasswordSection(!showPasswordSection)}
          className="flex items-center justify-between w-full text-sm font-medium text-gray-700"
        >
          <span>Reset Password</span>
          {showPasswordSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showPasswordSection && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Current Password</label>
              <input
                type="password"
                className="input-field"
                value={passwords.current}
                onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))}
                placeholder="Enter current password"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
              <input
                type="password"
                className="input-field"
                value={passwords.newPass}
                onChange={e => setPasswords(p => ({ ...p, newPass: e.target.value }))}
                placeholder="At least 6 characters"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Confirm Password</label>
              <input
                type="password"
                className="input-field"
                value={passwords.confirm}
                onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                placeholder="Repeat new password"
              />
            </div>
            <div className="sm:col-span-3 flex justify-center">
              <button onClick={handlePasswordSave} disabled={savingPw} className="btn-primary px-10">
                {savingPw ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
