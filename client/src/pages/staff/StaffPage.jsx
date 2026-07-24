import { useState, useEffect } from 'react';
import {
  Plus, Pencil, Trash2, Phone, User, Shield, KeyRound,
  Eye, EyeOff, Copy, Check, RefreshCw, X, ShieldCheck,
  LayoutGrid, Users
} from 'lucide-react';
import { staffApi } from '../../api/staff';
import { useToast } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import useAuthStore from '../../store/authStore';
import { getInitials } from '../../utils/format';

const inp = 'w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white';

const MENU_ITEMS = [
  { key: 'dashboard',    label: 'Dashboard' },
  { key: 'jobcards',     label: 'Jobcards' },
  { key: 'reminders',    label: 'Reminders' },
  { key: 'customers',    label: 'Customers' },
  { key: 'estimate',     label: 'Estimate' },
  { key: 'counter-sale', label: 'Counter Sale' },
  { key: 'inventory',    label: 'Inventory' },
  { key: 'sale',          label: 'Vehicle Sale' },
  { key: 'ledger',        label: 'Ledger' },
  { key: 'reports',      label: 'Reports' },
  { key: 'cashbook',     label: 'Cashbook' },
  { key: 'appointment',  label: 'Appointment' },
  { key: 'expenses',     label: 'Expenses' },
  { key: 'masters',      label: 'Masters' },
  { key: 'staff',        label: 'Staff' },
  { key: 'settings',     label: 'Settings' },
];

const JC_PERMISSIONS = [
  { key: 'canCreate',       label: 'Create new jobcard' },
  { key: 'canEdit',         label: 'Edit jobcard details' },
  { key: 'canChangeStatus', label: 'Change jobcard status' },
  { key: 'canAddItems',     label: 'Add / edit items (jobs, spare, lube)' },
  { key: 'canAddPayment',   label: 'Record payment / advance' },
  { key: 'canApplyDiscount', label: 'Apply / edit discount' },
  { key: 'canDelete',       label: 'Delete jobcard' },
  { key: 'canEditClosed',   label: 'Edit a CLOSED jobcard' },
];

const STOCK_PERMISSIONS = [
  { key: 'canAdd',       label: 'Add stock item (spare, lube, job)' },
  { key: 'canEdit',      label: 'Edit stock item' },
  { key: 'canUploadCsv', label: 'Upload stock via CSV' },
];

const VEHICLE_SALE_PERMISSIONS = [
  { key: 'canEditVehicle',   label: 'Edit a saved vehicle (Vehicle Sale edit)' },
  { key: 'canDeleteVehicle', label: 'Delete a saved vehicle (Vehicle Sale edit)' },
];

const REPORT_PERMISSIONS = [
  { key: 'canViewProfit', label: 'View Profit report' },
];

const EMPTY_ROLE = {
  name: '',
  menuAccess: ['dashboard', 'jobcards'],
  jobcardPermissions: {
    canCreate: false, canEdit: false, canChangeStatus: false,
    canAddItems: false, canAddPayment: false, canApplyDiscount: false, canDelete: false,
    canEditClosed: false,
  },
  stockPermissions: {
    canAdd: false, canEdit: false, canUploadCsv: false,
  },
  vehicleSalePermissions: {
    canEditVehicle: false, canDeleteVehicle: false,
  },
  reportPermissions: {
    canViewProfit: false,
  },
};

const EMPTY_STAFF = { name: '', roleId: '', mobile: '', username: '', password: '' };

/* ── Copy button ─────────────────────────────────────────────── */
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const doCopy = () => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };
  return (
    <button onClick={doCopy} className="text-gray-400 hover:text-gray-600 transition-colors">
      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
    </button>
  );
}

/* ── Credentials Modal ───────────────────────────────────────── */
function CredentialsModal({ staffId, onClose }) {
  const { toast } = useToast();
  const [creds, setCreds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    staffApi.getCredentials(staffId)
      .then(({ data }) => setCreds(data))
      .catch(() => toast({ title: 'Failed to load credentials', variant: 'error' }))
      .finally(() => setLoading(false));
  }, [staffId]);

  return (
    <Modal isOpen onClose={onClose} title="Login Credentials">
      {loading && <p className="text-sm text-gray-400 text-center py-6">Loading...</p>}
      {!loading && creds && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400 mb-0.5">Staff Member</p>
            <p className="font-semibold text-gray-800">{creds.name}</p>
            <p className="text-xs text-gray-500">{creds.role}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Username</label>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
              <span className="flex-1 text-sm font-mono text-gray-800">
                {creds.username || <span className="text-gray-400 italic">Not set</span>}
              </span>
              {creds.username && <CopyBtn text={creds.username} />}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Password</label>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
              <span className="flex-1 text-sm font-mono text-gray-800 tracking-wider">
                {creds.plainPassword
                  ? (showPw ? creds.plainPassword : '•'.repeat(Math.min(creds.plainPassword.length, 10)))
                  : <span className="text-gray-400 italic text-xs">Not set</span>}
              </span>
              {creds.plainPassword && (
                <>
                  <button onClick={() => setShowPw(p => !p)} className="text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <CopyBtn text={creds.plainPassword} />
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-end mt-6">
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}

/* ── Reset Password Modal ────────────────────────────────────── */
function ResetPasswordModal({ staffMember, onClose, onDone }) {
  const { toast } = useToast();
  const [pwd, setPwd] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleReset = async () => {
    if (!pwd.trim()) return toast({ title: 'Enter new password', variant: 'error' });
    setSaving(true);
    try {
      await staffApi.resetPassword(staffMember._id, pwd.trim());
      toast({ title: 'Password reset', variant: 'success' });
      onDone();
    } catch (e) {
      toast({ title: e.response?.data?.message || 'Reset failed', variant: 'error' });
    } finally { setSaving(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title="Reset Password">
      <p className="text-sm text-gray-500 mb-4">
        Reset password for <strong>{staffMember.name}</strong>
        {staffMember.username && <> · username: <span className="font-mono">{staffMember.username}</span></>}
      </p>
      <div className="relative">
        <input
          type={showPw ? 'text' : 'password'}
          value={pwd}
          onChange={e => setPwd(e.target.value)}
          placeholder="New password"
          className={inp + ' pr-10'}
          autoFocus
        />
        <button type="button" onClick={() => setShowPw(p => !p)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleReset} disabled={saving}>
          <RefreshCw size={14} /> {saving ? 'Resetting…' : 'Reset Password'}
        </Button>
      </div>
    </Modal>
  );
}

/* ── Role Form Modal ─────────────────────────────────────────── */
function RoleModal({ editRole, onClose, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState(() => editRole
    ? {
        name: editRole.name,
        menuAccess: [...(editRole.menuAccess || [])],
        jobcardPermissions: { ...EMPTY_ROLE.jobcardPermissions, ...(editRole.jobcardPermissions || {}) },
        stockPermissions: { ...EMPTY_ROLE.stockPermissions, ...(editRole.stockPermissions || {}) },
        vehicleSalePermissions: { ...EMPTY_ROLE.vehicleSalePermissions, ...(editRole.vehicleSalePermissions || {}) },
        reportPermissions: { ...EMPTY_ROLE.reportPermissions, ...(editRole.reportPermissions || {}) },
      }
    : { ...EMPTY_ROLE, menuAccess: [...EMPTY_ROLE.menuAccess], jobcardPermissions: { ...EMPTY_ROLE.jobcardPermissions }, stockPermissions: { ...EMPTY_ROLE.stockPermissions }, vehicleSalePermissions: { ...EMPTY_ROLE.vehicleSalePermissions }, reportPermissions: { ...EMPTY_ROLE.reportPermissions } }
  );
  const [saving, setSaving] = useState(false);

  const toggleMenu = (key) => {
    setForm(f => ({
      ...f,
      menuAccess: f.menuAccess.includes(key)
        ? f.menuAccess.filter(k => k !== key)
        : [...f.menuAccess, key],
    }));
  };

  const togglePerm = (key) => {
    setForm(f => ({
      ...f,
      jobcardPermissions: { ...f.jobcardPermissions, [key]: !f.jobcardPermissions[key] },
    }));
  };

  const toggleStockPerm = (key) => {
    setForm(f => ({
      ...f,
      stockPermissions: { ...f.stockPermissions, [key]: !f.stockPermissions[key] },
    }));
  };

  const toggleVehicleSalePerm = (key) => {
    setForm(f => ({
      ...f,
      vehicleSalePermissions: { ...f.vehicleSalePermissions, [key]: !f.vehicleSalePermissions[key] },
    }));
  };

  const toggleReportPerm = (key) => {
    setForm(f => ({
      ...f,
      reportPermissions: { ...f.reportPermissions, [key]: !f.reportPermissions[key] },
    }));
  };

  const toggleAllMenu = () => {
    const allKeys = MENU_ITEMS.map(m => m.key);
    const allOn = allKeys.every(k => form.menuAccess.includes(k));
    setForm(f => ({ ...f, menuAccess: allOn ? [] : allKeys }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast({ title: 'Role name required', variant: 'error' });
    setSaving(true);
    try {
      if (editRole) await staffApi.updateRole(editRole._id, form);
      else          await staffApi.createRole(form);
      toast({ title: editRole ? 'Role updated' : 'Role created', variant: 'success' });
      onSaved();
    } catch (e) {
      toast({ title: e.response?.data?.message || 'Save failed', variant: 'error' });
    } finally { setSaving(false); }
  };

  const allMenuOn = MENU_ITEMS.every(m => form.menuAccess.includes(m.key));

  return (
    <Modal isOpen onClose={onClose} title={editRole ? 'Edit Role' : 'Create Role'}>
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role Name <span className="text-red-500">*</span>
          </label>
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className={inp}
            placeholder="e.g. Service Advisor"
            autoFocus
          />
        </div>

        {/* Menu access */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Menu Access</label>
            <button
              type="button"
              onClick={toggleAllMenu}
              className="text-xs text-primary font-medium hover:underline"
            >
              {allMenuOn ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {MENU_ITEMS.map(m => {
              const on = form.menuAccess.includes(m.key);
              return (
                <label key={m.key} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer transition-colors ${
                  on ? 'bg-primary/5 border-primary/30' : 'border-border hover:bg-gray-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleMenu(m.key)}
                    className="accent-primary w-3.5 h-3.5 flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700">{m.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Jobcard permissions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Jobcard Permissions</label>
          <div className="space-y-1.5">
            {JC_PERMISSIONS.map(p => {
              const on = form.jobcardPermissions[p.key];
              return (
                <label key={p.key} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                  on ? 'bg-green-50 border-green-200' : 'border-border hover:bg-gray-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => togglePerm(p.key)}
                    className="accent-green-600 w-3.5 h-3.5 flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700">{p.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Stock permissions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Stock Permissions</label>
          <div className="space-y-1.5">
            {STOCK_PERMISSIONS.map(p => {
              const on = form.stockPermissions[p.key];
              return (
                <label key={p.key} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                  on ? 'bg-green-50 border-green-200' : 'border-border hover:bg-gray-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleStockPerm(p.key)}
                    className="accent-green-600 w-3.5 h-3.5 flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700">{p.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Vehicle Sale permissions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Sale Permissions</label>
          <div className="space-y-1.5">
            {VEHICLE_SALE_PERMISSIONS.map(p => {
              const on = form.vehicleSalePermissions[p.key];
              return (
                <label key={p.key} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                  on ? 'bg-green-50 border-green-200' : 'border-border hover:bg-gray-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleVehicleSalePerm(p.key)}
                    className="accent-green-600 w-3.5 h-3.5 flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700">{p.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Report permissions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Report Permissions</label>
          <div className="space-y-1.5">
            {REPORT_PERMISSIONS.map(p => {
              const on = form.reportPermissions[p.key];
              return (
                <label key={p.key} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                  on ? 'bg-green-50 border-green-200' : 'border-border hover:bg-gray-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleReportPerm(p.key)}
                    className="accent-green-600 w-3.5 h-3.5 flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700">{p.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : editRole ? 'Save Changes' : 'Create Role'}
        </Button>
      </div>
    </Modal>
  );
}

/* ── Staff Form Modal ────────────────────────────────────────── */
function StaffModal({ editStaff, roles, onClose, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState(() => editStaff
    ? { name: editStaff.name, roleId: String(editStaff.roleId?._id || editStaff.roleId || ''), mobile: editStaff.mobile || '', username: editStaff.username || '', password: '' }
    : { ...EMPTY_STAFF }
  );
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return toast({ title: 'Name required', variant: 'error' });
    if (!editStaff && !form.roleId) return toast({ title: 'Role required', variant: 'error' });
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password; // don't overwrite if blank on edit
      if (editStaff) await staffApi.update(editStaff._id, payload);
      else           await staffApi.create(payload);
      toast({ title: editStaff ? 'Staff updated' : 'Staff added', variant: 'success' });
      onSaved();
    } catch (e) {
      toast({ title: e.response?.data?.message || 'Save failed', variant: 'error' });
    } finally { setSaving(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={editStaff ? 'Edit Staff Member' : 'Add Staff Member'}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input value={form.name} onChange={e => set('name', e.target.value)} className={inp} placeholder="e.g. Ramesh Kumar" autoFocus />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role <span className="text-red-500">*</span>
          </label>
          <select value={form.roleId} onChange={e => set('roleId', e.target.value)} className={inp}>
            <option value="">— Select role —</option>
            {roles.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
          </select>
          {roles.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">No roles yet. Create a role first in the Roles tab.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
          <input value={form.mobile} onChange={e => set('mobile', e.target.value)} className={inp} placeholder="10-digit mobile" maxLength={10} />
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Login Credentials</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input value={form.username} onChange={e => set('username', e.target.value)} className={inp} placeholder="e.g. ramesh.kumar" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password {editStaff && <span className="text-gray-400 font-normal">(leave blank to keep current)</span>}
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  className={inp + ' pr-10'}
                  placeholder={editStaff ? 'Enter to change password' : 'Set password'}
                />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : editStaff ? 'Save Changes' : 'Add Staff'}
        </Button>
      </div>
    </Modal>
  );
}

/* ── Main Page ───────────────────────────────────────────────── */
export default function StaffPage() {
  const { garage } = useAuthStore();
  const { toast }  = useToast();
  const [tab, setTab]       = useState('staff');

  // Staff state
  const [staff, setStaff]       = useState([]);
  const [page, setPage]         = useState(1);
  const [limit, setLimit]       = useState(20);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffModal, setStaffModal]     = useState(false);
  const [editStaff, setEditStaff]       = useState(null);
  const [credStaff, setCredStaff]       = useState(null);
  const [resetStaff, setResetStaff]     = useState(null);

  // Roles state
  const [roles, setRoles]       = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [roleModal, setRoleModal]       = useState(false);
  const [editRole, setEditRole]         = useState(null);

  const loadStaff = async () => {
    setStaffLoading(true);
    try { const { data } = await staffApi.list(); setStaff(data); }
    catch { toast({ title: 'Failed to load staff', variant: 'error' }); }
    finally { setStaffLoading(false); }
  };

  const loadRoles = async () => {
    setRolesLoading(true);
    try { const { data } = await staffApi.listRoles(); setRoles(data); }
    catch { toast({ title: 'Failed to load roles', variant: 'error' }); }
    finally { setRolesLoading(false); }
  };

  useEffect(() => { loadStaff(); loadRoles(); }, []);

  const handleDeleteStaff = async (id) => {
    if (!confirm('Remove this staff member?')) return;
    try { await staffApi.remove(id); toast({ title: 'Staff removed', variant: 'success' }); loadStaff(); }
    catch { toast({ title: 'Delete failed', variant: 'error' }); }
  };

  // Delete Role disabled — see the commented-out button in the roles list.
  /* const handleDeleteRole = async (id) => {
    if (!confirm('Delete this role?')) return;
    try { await staffApi.deleteRole(id); toast({ title: 'Role deleted', variant: 'success' }); loadRoles(); }
    catch (e) { toast({ title: e.response?.data?.message || 'Delete failed', variant: 'error' }); }
  }; */

  const permCount = (role) => Object.values(role.jobcardPermissions || {}).filter(Boolean).length;

  const staffTotal = staff.length;
  const staffPages = Math.max(1, Math.ceil(staffTotal / limit));
  const pagedStaff = staff.slice((page - 1) * limit, page * limit);
  useEffect(() => { setPage(1); }, [limit, tab]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading font-bold text-gray-800 text-2xl">Staff Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage team members, roles and access permissions</p>
        </div>
        <Button onClick={() => { setEditStaff(null); setStaffModal(true); }}>
          <Plus size={15} /> Add Staff
        </Button>
      </div>

      {/* Admin card */}
      <div className="card mb-5 flex items-center gap-4 bg-gradient-to-r from-purple-50 to-white border-purple-100">
        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-base font-bold text-purple-700 flex-shrink-0">
          {getInitials(garage?.workshopName || garage?.firstName || 'A')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-800">{garage?.workshopName || `${garage?.firstName} ${garage?.lastName}`}</div>
          <div className="text-xs text-gray-400 mt-0.5">{garage?.firstName} {garage?.lastName} · {garage?.mobile} · {garage?.city}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Shield size={14} className="text-purple-500" />
          <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2.5 py-1 rounded-full">Admin</span>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <span className="font-heading font-bold text-blue-700 text-xl">{staff.length}</span>
          </div>
          <div>
            <div className="font-semibold text-gray-800">Staff Members</div>
            <div className="text-xs text-gray-400 mt-0.5">{staff.length === 0 ? 'None added yet' : staff.map(s => s.name).join(', ')}</div>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <span className="font-heading font-bold text-green-700 text-xl">{roles.length}</span>
          </div>
          <div>
            <div className="font-semibold text-gray-800">Roles Defined</div>
            <div className="text-xs text-gray-400 mt-0.5">{roles.length === 0 ? 'None created yet' : roles.map(r => r.name).join(', ')}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-border">
        {[
          { key: 'staff', label: 'Staff Members', icon: Users },
          { key: 'roles', label: 'Roles & Permissions', icon: ShieldCheck },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key ? 'text-primary border-primary' : 'text-gray-400 border-transparent hover:text-gray-600'
            }`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ── STAFF TAB ── */}
      {tab === 'staff' && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sr No</th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Mobile</th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Username</th>
                  <th className="text-center py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffLoading ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : staff.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-14">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <User size={22} className="text-gray-300" />
                      </div>
                      <p className="text-gray-400 text-sm font-medium">No staff members yet</p>
                      <p className="text-gray-300 text-xs mt-1">Add mechanics and supervisors to assign them to jobcards</p>
                      <button onClick={() => { setEditStaff(null); setStaffModal(true); }}
                        className="mt-4 text-primary text-sm font-semibold hover:underline">
                        + Add your first staff member
                      </button>
                    </td>
                  </tr>
                ) : pagedStaff.map((item, idx) => (
                  <tr key={item._id} className="border-b border-border hover:bg-gray-50 last:border-0">
                    <td className="py-3.5 px-5 text-gray-500 text-xs">{(page - 1) * limit + idx + 1}</td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                          {getInitials(item.name)}
                        </div>
                        <span className="font-medium text-gray-800">{item.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                        {item.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-gray-500">
                      {item.mobile
                        ? <span className="flex items-center gap-1.5"><Phone size={12} className="text-gray-400" />{item.mobile}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-3.5 px-5">
                      {item.username
                        ? <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{item.username}</span>
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => { setEditStaff(item); setStaffModal(true); }}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500" title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setCredStaff(item)}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500" title="View credentials">
                          <KeyRound size={14} />
                        </button>
                        <button onClick={() => setResetStaff(item)}
                          className="p-1.5 rounded-lg hover:bg-green-50 text-green-600" title="Reset password">
                          <RefreshCw size={14} />
                        </button>
                        <button onClick={() => handleDeleteStaff(item._id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Remove">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab === 'staff' && (
        <Pagination page={page} pages={staffPages} total={staffTotal} limit={limit} onPage={setPage} onLimit={setLimit} />
      )}

      {/* ── ROLES TAB ── */}
      {tab === 'roles' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setEditRole(null); setRoleModal(true); }}>
              <Plus size={15} /> Create Role
            </Button>
          </div>

          {rolesLoading && <p className="text-center py-10 text-gray-400">Loading...</p>}

          {!rolesLoading && roles.length === 0 && (
            <div className="card text-center py-14">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShieldCheck size={22} className="text-gray-300" />
              </div>
              <p className="text-gray-400 text-sm font-medium">No roles defined yet</p>
              <p className="text-gray-300 text-xs mt-1">Create roles to control what staff members can see and do</p>
              <button onClick={() => { setEditRole(null); setRoleModal(true); }}
                className="mt-4 text-primary text-sm font-semibold hover:underline">
                + Create your first role
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {roles.map(role => {
              const pc = permCount(role);
              const sc = Object.values(role.stockPermissions || {}).filter(Boolean).length;
              const mc = (role.menuAccess || []).length;
              return (
                <div key={role._id} className="card">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <ShieldCheck size={18} className="text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{role.name}</div>
                        {role.isDefault && (
                          <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Default</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditRole(role); setRoleModal(true); }}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500" title="Edit role">
                        <Pencil size={14} />
                      </button>
                      {/* Delete Role disabled — removing a role that staff are assigned
                          to causes knock-on issues. Restore this block, the
                          handleDeleteRole handler, staffApi.deleteRole and the
                          DELETE /staff/roles/:id route together to re-enable.
                      <button onClick={() => handleDeleteRole(role._id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Delete role">
                        <Trash2 size={14} />
                      </button>
                      */}
                    </div>
                  </div>

                  {/* Menu access */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-medium text-gray-500 uppercase">Menu Access</p>
                      <span className="text-xs text-gray-400">{mc} / {MENU_ITEMS.length}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {MENU_ITEMS.map(m => {
                        const on = (role.menuAccess || []).includes(m.key);
                        return (
                          <span key={m.key} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            on ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400 line-through'
                          }`}>
                            {m.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Jobcard permissions */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-medium text-gray-500 uppercase">Jobcard Permissions</p>
                      <span className="text-xs text-gray-400">{pc} / {JC_PERMISSIONS.length}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {JC_PERMISSIONS.map(p => {
                        const on = role.jobcardPermissions?.[p.key];
                        return (
                          <span key={p.key} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            on ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {on ? '✓' : '✗'} {p.label.split(' ').slice(0, 2).join(' ')}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stock permissions */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-medium text-gray-500 uppercase">Stock Permissions</p>
                      <span className="text-xs text-gray-400">{sc} / {STOCK_PERMISSIONS.length}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {STOCK_PERMISSIONS.map(p => {
                        const on = role.stockPermissions?.[p.key];
                        return (
                          <span key={p.key} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            on ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {on ? '✓' : '✗'} {p.label.split(' ').slice(0, 2).join(' ')}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Staff using this role */}
                  {(() => {
                    const using = staff.filter(s => String(s.roleId?._id || s.roleId) === String(role._id));
                    return using.length > 0 ? (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs text-gray-400">{using.length} staff: {using.map(s => s.name).join(', ')}</p>
                      </div>
                    ) : null;
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      {staffModal && (
        <StaffModal
          editStaff={editStaff}
          roles={roles}
          onClose={() => setStaffModal(false)}
          onSaved={() => { setStaffModal(false); loadStaff(); }}
        />
      )}
      {credStaff && (
        <CredentialsModal
          staffId={credStaff._id}
          onClose={() => setCredStaff(null)}
        />
      )}
      {resetStaff && (
        <ResetPasswordModal
          staffMember={resetStaff}
          onClose={() => setResetStaff(null)}
          onDone={() => { setResetStaff(null); loadStaff(); }}
        />
      )}
      {roleModal && (
        <RoleModal
          editRole={editRole}
          onClose={() => setRoleModal(false)}
          onSaved={() => { setRoleModal(false); loadRoles(); }}
        />
      )}
    </div>
  );
}
