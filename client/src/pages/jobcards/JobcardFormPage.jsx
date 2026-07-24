import { useState, useEffect, useRef } from 'react';
import { DateField } from '../../components/ui/DateField';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  X, Plus, Pencil, Search, Camera, Wrench,
  MessageSquare, Package, Save, Printer,
  User, Car, MessageCircle, AlertTriangle,
  CheckCircle, Lock, Trash2, ClipboardList
} from 'lucide-react';
import { jobcardsApi } from '../../api/jobcards';
import { buildInvoiceWhatsappUrl } from '../../utils/whatsapp';
import { customerFlag } from '../../utils/customerFlag';
import { mastersApi } from '../../api/masters';
import { customersApi } from '../../api/customers';
import { useToast } from '../../components/ui/Toast';
import { Badge } from '../../components/ui/Badge';
import QuickAddItemModal from '../../components/QuickAddItemModal';
import { Button } from '../../components/ui/Button';
import VehicleModelPicker from '../../components/ui/VehicleModelPicker';
import { Modal, Drawer } from '../../components/ui/Modal';
import { formatCurrency, formatDateInput, getInitials } from '../../utils/format';
import useAuthStore from '../../store/authStore';
import LastHistoryDrawer from './LastHistoryDrawer';

const PAYMENT_TYPES = ['Cash', 'UPI', 'Card', 'Cheque'];
const TRANSACTION_TYPES = ['Advance', 'Payment', 'Refund'];
const REMINDER_KM = ['No KM Reminder', '1000 km', '2000 km', '3000 km', '4000 km', '5000 km', '6000 km', '7000 km', '8000 km', '9000 km', '10000 km'];
const REMINDER_PERIODS = ['1 Month', '2 Months', '3 Months', '4 Months', '5 Months', '6 Months', '7 Months', '8 Months', '9 Months', '10 Months', '11 Months', '12 Months'];

export default function JobcardFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isShortInvoice = searchParams.get('type') === 'short';
  // Return to the same list filter we came from (e.g. Open) instead of All.
  const returnStatus = searchParams.get('from') || '';
  const backToList = () => navigate(returnStatus ? `/jobcards?status=${returnStatus}` : '/jobcards');
  const { garage, isStaff, staffUser } = useAuthStore();
  const { toast } = useToast();
  const isEdit = !!id && id !== 'new';
  const perm = (key) => !isStaff || !!staffUser?.roleId?.jobcardPermissions?.[key];
  const s = garage?.jobcardSettings || {};

  // Masters
  const [jobcardTypes, setJobcardTypes] = useState([]);
  const [jobcardStatuses, setJobcardStatuses] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [staffLoaded, setStaffLoaded] = useState(false);
  const [customerVoiceOptions, setCustomerVoiceOptions] = useState([]);
  const [labourItems, setLabourItems] = useState([]);
  const [spareItems, setSpareItems] = useState([]);
  const [lubeItems, setLubeItems] = useState([]);
  const [packages, setPackages] = useState([]);
  const [vehicleMakes, setVehicleMakes] = useState([]);
  const [vehicleModels, setVehicleModels] = useState([]);

  // Customer
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', mobile: '', customerType: '', vehicleNo: '', makeId: '', makeName: '', modelId: '', modelName: '', engineNo: '', chassisNo: '', color: '' });

  // Form state
  const [form, setForm] = useState({
    type: '',
    typeLabel: '',
    status: '',
    statusLabel: '',
    statusCategory: 'Open',
    jobcardNumber: '',
    kmReading: '',
    fuelLevel: 50,
    mechanicId: '',
    mechanicName: '',
    supervisorId: '',
    supervisorName: '',
    customerVoice: [],
    customerVoiceLabels: [],
    accessories: [],
    workNotes: [],
    dentMarksArr: [],
    photos: [],
    items: [],
    discount: 0,
    discountType: 'amount',
    costEstimate: '',
    deliveryDate: '',
    deliveryTime: '',
    reminderKm: '',
    reminderPeriod: '',
    reminderPriority: '',
    exitNote: '',
    transactions: [],
    vehicleColour: '',
    customerEmail: '',
    customerBirthday: '',
    customerPickupAddr: '',
    customerDeliveryAddr: '',
    driverName: '',
    driverMobile: ''
  });

  // Items
  const [activeItemTab, setActiveItemTab] = useState('Labour');
  const [itemSearch, setItemSearch] = useState('');
  const [itemSearchResults, setItemSearchResults] = useState([]);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Drawers
  const [drawerOpen, setDrawerOpen] = useState(null);
  const [cvSearch, setCvSearch] = useState('');
  const [addingCv, setAddingCv] = useState(false);

  // Transaction
  const [txnForm, setTxnForm] = useState({ type: 'Payment', amount: '', paymentType: 'Cash', details: '', date: formatDateInput(new Date()) });

  const [rightTab, setRightTab] = useState('billing');

  // Package modal
  const [packageModalOpen, setPackageModalOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [editJcNumMode, setEditJcNumMode] = useState(false);
  const [openJobcardWarning, setOpenJobcardWarning] = useState(null);
  // False until the existing jobcard has been fetched. The form starts out as
  // statusCategory:'Open', so without this the action buttons would flash before
  // we know the real status (e.g. Update showing briefly on a Closed jobcard).
  const [jcLoaded, setJcLoaded] = useState(!isEdit);

  // Load masters
  useEffect(() => {
    Promise.all([
      mastersApi.list('jobcard-types'),
      mastersApi.list('jobcard-statuses'),
      mastersApi.list('staff'),
      mastersApi.list('customer-voice'),
      mastersApi.list('labour'),
      mastersApi.list('spares'),
      mastersApi.list('lubes'),
      mastersApi.list('packages'),
      mastersApi.list('vehicle-makes'),
      mastersApi.list('vehicle-models')
    ]).then(([types, statuses, staff, cv, labour, spares, lubes, pkgs, makes, models]) => {
      setJobcardTypes(types.data);
      setJobcardStatuses(statuses.data);
      setMechanics(staff.data.filter(s => s.role === 'Mechanic'));
      setSupervisors(staff.data.filter(s => s.role === 'Supervisor'));
      setStaffLoaded(true);
      setCustomerVoiceOptions(cv.data);
      setLabourItems(labour.data);
      setSpareItems(spares.data);
      setLubeItems(lubes.data);
      setPackages(pkgs.data);
      setVehicleMakes(makes.data);
      setVehicleModels(models.data);

      // Jobcard Type is deliberately left unselected — the user must pick one.
      if (!isEdit && statuses.data.length > 0) {
        const defaultStatus = isShortInvoice
          ? (statuses.data.find(s => s.category === 'Closed') || statuses.data[statuses.data.length - 1])
          : (statuses.data.find(s => s.category === 'Open') || statuses.data[0]);
        setForm(f => ({ ...f, status: defaultStatus._id, statusLabel: defaultStatus.name, statusCategory: defaultStatus.category }));
      }
    }).catch(console.error);
  }, []);

  // Load existing jobcard
  useEffect(() => {
    if (!isEdit) return;
    jobcardsApi.getById(id).then(({ data }) => {
      setForm({
        type: data.type || '',
        typeLabel: data.typeLabel || '',
        status: data.status || '',
        statusLabel: data.statusLabel || '',
        statusCategory: data.statusCategory || 'Open',
        jobcardNumber: data.jobcardNumber || '',
        kmReading: data.kmReading || '',
        fuelLevel: data.fuelLevel || 50,
        mechanicId: data.mechanicId || '',
        mechanicName: data.mechanicName || '',
        supervisorId: data.supervisorId || '',
        supervisorName: data.supervisorName || '',
        customerVoice: data.customerVoice || [],
        customerVoiceLabels: data.customerVoiceLabels || [],
        accessories: data.accessories || [],
        workNotes: data.workNotes || [],
        dentMarksArr: (() => { try { return JSON.parse(data.dentMarks || '[]'); } catch { return []; } })(),
        photos: data.photos || [],
        items: data.items || [],
        discount: data.discount || 0,
        discountType: data.discountType || 'amount',
        costEstimate: data.costEstimate || '',
        deliveryDate: formatDateInput(data.deliveryDate),
        deliveryTime: data.deliveryTime || '',
        reminderKm: data.reminderKm || '',
        reminderPeriod: data.reminderPeriod || '',
        reminderPriority: data.reminderPriority || '',
        exitNote: data.exitNote || '',
        transactions: data.transactions || [],
        vehicleColour: data.vehicleColour || '',
        customerEmail: data.customerEmail || '',
        customerBirthday: data.customerBirthday ? data.customerBirthday.slice(0, 10) : '',
        customerPickupAddr: data.customerPickupAddr || '',
        customerDeliveryAddr: data.customerDeliveryAddr || '',
        driverName: data.driverName || '',
        driverMobile: data.driverMobile || ''
      });
      if (data.customerId) {
        setSelectedCustomer({ _id: data.customerId, name: data.customerName, mobile: data.customerMobile, email: data.customerEmail, customerType: data.customerType });
        setSelectedVehicle({ vehicleNo: data.vehicleNo, makeName: data.vehicleMake, modelName: data.vehicleModel });
      }
    })
      .catch(() => toast({ title: 'Failed to load jobcard', variant: 'error' }))
      .finally(() => setJcLoaded(true));
  }, [id, isEdit]);

  // Customer search
  useEffect(() => {
    if (customerSearch.length < 2) { setCustomerResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await customersApi.search(customerSearch);
      setCustomerResults(data);
      setShowCustomerDropdown(true);
    }, 300);
    return () => clearTimeout(t);
  }, [customerSearch]);

  // Detect open jobcard for selected vehicle
  useEffect(() => {
    if (isEdit || !selectedVehicle?.vehicleNo) { setOpenJobcardWarning(null); return; }
    jobcardsApi.list({ vehicleNoExact: selectedVehicle.vehicleNo, limit: 20 })
      .then(({ data }) => {
        const match = (data.jobcards || []).find(
          jc => jc.vehicleNo?.toUpperCase() === selectedVehicle.vehicleNo.toUpperCase() && jc.statusCategory !== 'Closed'
        );
        setOpenJobcardWarning(match
          ? `Jobcard #${match.jobcardNumber} for vehicle ${selectedVehicle.vehicleNo} is not closed yet. Close it before creating a new one.`
          : null
        );
      })
      .catch(() => {});
  }, [selectedVehicle, isEdit]);

  // Item search — searches only the ACTIVE tab's item type (Jobs / Spare / Lube),
  // so the Spare tab lists spares only, the Lube tab lubes only, etc.
  useEffect(() => {
    if (itemSearch.length < 1) { setItemSearchResults([]); return; }
    const q = itemSearch.toLowerCase();
    const tag = (arr, t) => arr.map(i => ({ ...i, _type: t }));
    const source =
      activeItemTab === 'Labour' ? tag(labourItems, 'Labour') :
      activeItemTab === 'Spare'  ? tag(spareItems,  'Spare')  :
      activeItemTab === 'Lube'   ? tag(lubeItems,   'Lube')   : [];
    const filtered = source.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.jobCode || i.partNumber || '').toLowerCase().includes(q)
    );
    setItemSearchResults(filtered.slice(0, 12));
  }, [itemSearch, activeItemTab, labourItems, spareItems, lubeItems]);

  // A Closed jobcard is view-only unless the role has "Edit a CLOSED jobcard".
  // Owners are unaffected (perm() returns true for non-staff).
  const canEditThis = jcLoaded && (form.statusCategory !== 'Closed' || perm('canEditClosed'));

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // Create a new customer-voice master inline and auto-select it.
  const addCustomerVoice = async () => {
    const name = cvSearch.trim();
    if (!name) return;
    if (customerVoiceOptions.some(cv => cv.name.toLowerCase() === name.toLowerCase())) {
      return toast({ title: 'That customer voice already exists', variant: 'error' });
    }
    setAddingCv(true);
    try {
      const { data } = await mastersApi.create('customer-voice', { name });
      setCustomerVoiceOptions(prev => [...prev, data]);
      setForm(f => ({
        ...f,
        customerVoice: [...f.customerVoice, data._id],
        customerVoiceLabels: [...f.customerVoiceLabels, data.name],
      }));
      setCvSearch('');
      toast({ title: 'Customer voice added', variant: 'success' });
    } catch (e) {
      toast({ title: e.response?.data?.message || 'Failed to add', variant: 'error' });
    } finally { setAddingCv(false); }
  };

  const addItem = (masterItem) => {
    setItemSearch('');
    setItemSearchResults([]);
    // Cross-type search: use the item's own type (falls back to the active tab).
    const itemType = masterItem._type || activeItemTab;
    if (itemType !== activeItemTab) setActiveItemTab(itemType);
    const existingIdx = form.items.findIndex(i => String(i.itemId) === String(masterItem._id) && i.itemType === itemType);
    if (existingIdx >= 0) {
      const updated = [...form.items];
      updated[existingIdx] = { ...updated[existingIdx], qty: updated[existingIdx].qty + 1, finalAmount: (updated[existingIdx].qty + 1) * updated[existingIdx].unitPrice };
      setField('items', updated);
    } else {
      setField('items', [...form.items, {
        itemId: masterItem._id,
        itemType: itemType,
        name: masterItem.name,
        partNumber: masterItem.partNumber || masterItem.jobCode || '',
        qty: 1,
        unitPrice: masterItem.unitPrice || 0,
        discount: 0,
        discountType: 'amount',
        finalAmount: masterItem.unitPrice || 0,
        mechanicId: '',
        mechanicName: ''
      }]);
    }
  };

  const updateItem = (idx, field, val) => {
    const updated = [...form.items];
    updated[idx] = { ...updated[idx], [field]: val };
    if (['qty', 'unitPrice', 'discount', 'discountType'].includes(field)) {
      const it = updated[idx];
      const base = Number(it.qty) * Number(it.unitPrice);
      const discAmt = it.discountType === 'percent' ? base * (Number(it.discount) / 100) : Number(it.discount);
      updated[idx].finalAmount = Math.max(0, base - discAmt);
    }
    setField('items', updated);
  };

  const removeItem = (idx) => setField('items', form.items.filter((_, i) => i !== idx));

  // Outsource charge — a free-text line with an editable amount (no master, no cost tracking)
  const addOutsource = () => {
    setField('items', [...form.items, {
      itemType: 'Outsource',
      name: '',
      partNumber: '',
      qty: 1,
      unitPrice: 0,
      discount: 0,
      discountType: 'amount',
      finalAmount: 0,
      mechanicId: '',
      mechanicName: ''
    }]);
  };

  const calcTotals = () => {
    const labourTotal = form.items.filter(i => i.itemType === 'Labour').reduce((s, i) => s + (i.finalAmount || 0), 0);
    const spareTotal = form.items.filter(i => i.itemType === 'Spare').reduce((s, i) => s + (i.finalAmount || 0), 0);
    const lubeTotal = form.items.filter(i => i.itemType === 'Lube').reduce((s, i) => s + (i.finalAmount || 0), 0);
    const outsourceTotal = form.items.filter(i => i.itemType === 'Outsource').reduce((s, i) => s + (i.finalAmount || 0), 0);
    const total = labourTotal + spareTotal + lubeTotal + outsourceTotal;
    const discAmt = form.discountType === 'percent' ? (total * form.discount) / 100 : Number(form.discount);
    const billAmount = Math.max(0, total - discAmt);
    const paidAmount = form.transactions.reduce((s, t) => t.type === 'Refund' ? s - t.amount : s + Number(t.amount), 0);
    const balanceDue = Math.max(0, billAmount - paidAmount);
    return { labourTotal, spareTotal, lubeTotal, outsourceTotal, total, billAmount, paidAmount, balanceDue };
  };

  const totals = calcTotals();

  const addTransaction = () => {
    if (!txnForm.amount || Number(txnForm.amount) <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'error' }); return;
    }
    setField('transactions', [...form.transactions, { ...txnForm, amount: Number(txnForm.amount), date: new Date(txnForm.date) }]);
    setTxnForm(f => ({ ...f, amount: '', details: '' }));
  };

  const addPackage = (pkg) => {
    const newItems = pkg.items.map(pi => ({
      itemId: pi.itemId,
      itemType: pi.itemType,
      name: pi.name,
      qty: pi.qty || 1,
      unitPrice: pi.unitPrice || 0,
      finalAmount: (pi.qty || 1) * (pi.unitPrice || 0)
    }));
    setField('items', [...form.items, ...newItems]);
    setPackageModalOpen(false);
    toast({ title: `Package "${pkg.name}" added`, variant: 'success' });
  };

  const buildPayload = (overrides = {}) => ({
    ...form,
    dentMarks: JSON.stringify(form.dentMarksArr || []),
    ...totals,
    customerId: selectedCustomer._id,
    customerName: selectedCustomer.name,
    customerMobile: selectedCustomer.mobile,
    vehicleId: selectedVehicle?._id,
    vehicleNo: selectedVehicle?.vehicleNo || '',
    vehicleMake: selectedVehicle?.makeName || '',
    vehicleModel: selectedVehicle?.modelName || '',
    ...overrides,
  });

  const handleSave = async () => {
    if (!canEditThis) { toast({ title: 'This jobcard is closed — you do not have permission to edit it', variant: 'error' }); return; }
    if (!selectedCustomer) { toast({ title: 'Please select a customer', variant: 'error' }); return; }
    if (!form.type) { toast({ title: 'Please select a jobcard type', variant: 'error' }); return; }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (isEdit) {
        await jobcardsApi.update(id, payload);
        toast({ title: 'Jobcard updated', variant: 'success' });
      } else {
        await jobcardsApi.create(payload);
        toast({ title: 'Jobcard created', variant: 'success' });
        backToList();
      }
    } catch (e) {
      toast({ title: 'Save failed', description: e.response?.data?.message, variant: 'error' });
    } finally { setSaving(false); }
  };

  // Move the jobcard to a new status category (Completed / Closed) and persist.
  const changeStatusTo = async (category, successMsg) => {
    if (!selectedCustomer) { toast({ title: 'Please select a customer', variant: 'error' }); return; }
    if (!form.type) { toast({ title: 'Please select a jobcard type', variant: 'error' }); return; }
    const target = jobcardStatuses.find(st => st.category === category);
    if (!target) {
      toast({ title: `No "${category}" status defined`, description: 'Add one under Masters → Jobcard Statuses.', variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload({ status: target._id, statusLabel: target.name, statusCategory: target.category });
      await jobcardsApi.update(id, payload);
      setForm(f => ({ ...f, status: target._id, statusLabel: target.name, statusCategory: target.category }));
      toast({ title: successMsg, variant: 'success' });
      backToList();
    } catch (e) {
      toast({ title: 'Action failed', description: e.response?.data?.message, variant: 'error' });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this jobcard?')) return;
    setSaving(true);
    try {
      await jobcardsApi.delete(id);
      toast({ title: 'Jobcard deleted', variant: 'success' });
      backToList();
    } catch (e) {
      toast({ title: e.response?.data?.message || 'Delete failed', variant: 'error' });
    } finally { setSaving(false); }
  };

  const handleWhatsapp = () => {
    if (!selectedCustomer) { toast({ title: 'Select a customer first', variant: 'error' }); return; }
    window.open(buildInvoiceWhatsappUrl(buildPayload(), garage), '_blank');
  };

  const itemsByTab = activeItemTab === 'Total' ? form.items : form.items.filter(i => i.itemType === activeItemTab);
  const frequentItems = (activeItemTab === 'Total' || activeItemTab === 'Outsource') ? [] : (activeItemTab === 'Labour' ? labourItems : activeItemTab === 'Spare' ? spareItems : lubeItems).filter(i => i.isFrequent);

  const selectCls = 'border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white';
  const inputCls = 'border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white w-full';

  // Block jobcard creation until the garage has both a Mechanic and a Supervisor on staff
  if (!isEdit && staffLoaded && (mechanics.length === 0 || supervisors.length === 0)) {
    const missing = [
      mechanics.length === 0 ? 'Mechanic' : null,
      supervisors.length === 0 ? 'Supervisor' : null,
    ].filter(Boolean).join(' and ');
    return (
      <div className="max-w-xl mx-auto mt-16 bg-white border border-amber-200 rounded-xl p-8 text-center shadow-sm">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">!</div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Not allowed</h2>
        <p className="text-sm text-gray-500 mb-6">
          No <span className="font-medium text-gray-700">{missing}</span> staff found for this garage.
          Please create the Mechanic and Supervisor staff before creating a jobcard.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => backToList()}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm hover:bg-gray-50">Back</button>
          <button onClick={() => navigate('/staff')}
            className="px-5 py-2 rounded-lg text-white text-sm font-medium"
            style={{ background: 'linear-gradient(to right, #ef4444, #b91c1c)' }}>Go to Staff</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <h1 className="font-heading font-bold text-gray-800 text-2xl">
          {isEdit ? (isShortInvoice ? 'Edit Short Invoice' : 'Edit Jobcard') : (isShortInvoice ? 'Create Short Invoice' : 'Create Jobcard')}
        </h1>

        <select
          value={form.type}
          onChange={e => {
            const t = jobcardTypes.find(x => x._id === e.target.value);
            setForm(f => ({ ...f, type: e.target.value, typeLabel: t?.name || '' }));
          }}
          className={`${selectCls}${!form.type ? ' text-gray-400' : ''}`}
          disabled={!jobcardTypes.length}
        >
          {!jobcardTypes.length
            ? <option value="">No types — add in Masters</option>
            : <option value="">Please select a jobcard type</option>}
          {jobcardTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
        </select>

        {perm('canChangeStatus') ? (
          <select
            value={form.status}
            onChange={e => {
              const s = jobcardStatuses.find(x => x._id === e.target.value);
              setForm(f => ({ ...f, status: e.target.value, statusLabel: s?.name || '', statusCategory: s?.category || 'Open' }));
            }}
            className={selectCls}
            disabled={!jobcardStatuses.length}
          >
            {!jobcardStatuses.length && <option value="">No statuses — add in Masters</option>}
            {jobcardStatuses.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        ) : (
          <span className={`${selectCls} cursor-not-allowed bg-gray-50 text-gray-500`}>{form.statusLabel || 'Open'}</span>
        )}

        <div className="flex items-center gap-1">
          {editJcNumMode ? (
            <input
              value={form.jobcardNumber}
              onChange={e => setField('jobcardNumber', e.target.value)}
              onBlur={() => setEditJcNumMode(false)}
              className={`${inputCls} w-36 font-mono`}
              autoFocus
            />
          ) : (
            <span className="font-mono text-sm font-medium text-gray-600 bg-gray-100 px-2.5 py-1.5 rounded-lg">
              {form.jobcardNumber || 'Auto'}
            </span>
          )}
          {s.customJobcardNo && (
            <button onClick={() => setEditJcNumMode(v => !v)} className="p-1 text-gray-400 hover:text-gray-600">
              <Pencil size={13} />
            </button>
          )}
        </div>

        <span className="text-xs text-gray-400 ml-auto">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>

        <button onClick={() => backToList()} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
          <X size={18} />
        </button>
      </div>

      {/* Top section: Customer + Jobcard details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Left: Customer */}
        <div className="card">
          <h3 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">
            <User size={15} className="text-primary" /> Customer Details
          </h3>

          {!selectedCustomer ? (
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    onFocus={() => customerSearch.length >= 2 && setShowCustomerDropdown(true)}
                    placeholder="Search by vehicle no, mobile, name..."
                    className="pl-8 pr-3 py-2 border border-border rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <button onClick={() => setShowNewCustomerModal(true)} className="btn-primary text-xs px-3 py-1.5 rounded-lg">
                  + New
                </button>
              </div>
              {showCustomerDropdown && customerResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-lg z-20 max-h-56 overflow-y-auto">
                  {customerResults.map(c => {
                    const flag = customerFlag(c);
                    return (
                    <button
                      key={c._id}
                      onClick={() => {
                        setSelectedCustomer(c);
                        setSelectedVehicle(c.vehicles?.[0] || null);
                        setShowCustomerDropdown(false);
                        setCustomerSearch('');
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-border last:border-0"
                    >
                      <div className="font-medium text-sm text-gray-800 flex items-center gap-1.5">
                        {flag && <span className={`w-2 h-2 rounded-full ${flag.dot}`} title={flag.label} />}
                        {c.name}
                        {flag && <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${flag.badge}`}>{flag.label}</span>}
                      </div>
                      <div className="text-xs text-gray-400">
                        {c.mobile} · {c.vehicles?.map(v => v.vehicleNo).filter(Boolean).join(', ') || 'No vehicle'}
                      </div>
                    </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                    {getInitials(selectedCustomer.name)}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800 flex items-center gap-1.5">
                      {selectedCustomer.name}
                      {(() => { const f = customerFlag(selectedCustomer); return f && <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${f.badge}`}>{f.label}</span>; })()}
                    </div>
                    <div className="text-xs text-gray-400">{selectedCustomer.mobile}</div>
                    {selectedCustomer.customerType && <div className="mt-0.5"><span className="text-xs text-gray-400">Type: </span><span className="text-base font-bold uppercase text-red-600">{selectedCustomer.customerType}</span></div>}
                    {(() => { const f = customerFlag(selectedCustomer); return f?.lastNote && <div className="text-xs text-amber-700 mt-1 flex items-start gap-1"><AlertTriangle size={11} className="mt-0.5 flex-shrink-0" />{f.lastNote}</div>; })()}
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedCustomer(null); setSelectedVehicle(null); setOpenJobcardWarning(null); }}
                  className="text-xs text-gray-400 hover:text-red-500 border border-border px-2 py-1 rounded-lg"
                >
                  Change
                </button>
              </div>

              {selectedCustomer.vehicles?.length > 0 && (
                <div className="mt-3">
                  <label className="text-xs text-gray-500 font-medium mb-1.5 block">Select Vehicle</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedCustomer.vehicles.map((v, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedVehicle(v)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                          selectedVehicle?.vehicleNo === v.vehicleNo
                            ? 'bg-primary text-white border-primary'
                            : 'border-border text-gray-600 hover:border-primary'
                        }`}
                      >
                        <Car size={11} className="inline mr-1" />
                        {v.vehicleNo || `Vehicle ${i + 1}`}
                        {v.makeName && ` · ${v.makeName}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {selectedVehicle && (
                <div className="mt-3 text-xs text-gray-500 bg-white rounded-lg p-2 border border-border">
                  <span className="font-medium">{selectedVehicle.makeName} {selectedVehicle.modelName}</span>
                  {selectedVehicle.vehicleNo && <span className="ml-2 font-mono bg-gray-100 px-1.5 py-0.5 rounded">{selectedVehicle.vehicleNo}</span>}
                  {s.engineChassisNumber && selectedVehicle.engineNo && <span className="ml-2 text-gray-400">Eng: {selectedVehicle.engineNo}</span>}
                  {s.engineChassisNumber && selectedVehicle.chassisNo && <span className="ml-2 text-gray-400">Chassis: {selectedVehicle.chassisNo}</span>}
                </div>
              )}
              {/* Settings-gated extra customer fields */}
              {(s.customerEmail || s.customerBirthday || s.customerPickupAddr || s.customerDeliveryAddr || s.driverDetails) && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {s.customerEmail && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-0.5 block">Email</label>
                      <input value={form.customerEmail} onChange={e => setField('customerEmail', e.target.value)} className={inputCls} placeholder="customer@email.com" />
                    </div>
                  )}
                  {s.customerBirthday && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-0.5 block">Birthday</label>
                      <DateField value={form.customerBirthday} onChange={e => setField('customerBirthday', e.target.value)} className={inputCls} />
                    </div>
                  )}
                  {s.customerPickupAddr && (
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-gray-500 mb-0.5 block">Pickup Address</label>
                      <input value={form.customerPickupAddr} onChange={e => setField('customerPickupAddr', e.target.value)} className={inputCls} placeholder="Pickup address" />
                    </div>
                  )}
                  {s.customerDeliveryAddr && (
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-gray-500 mb-0.5 block">Delivery Address</label>
                      <input value={form.customerDeliveryAddr} onChange={e => setField('customerDeliveryAddr', e.target.value)} className={inputCls} placeholder="Delivery address" />
                    </div>
                  )}
                  {s.driverDetails && (
                    <>
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-0.5 block">Driver Name</label>
                        <input value={form.driverName} onChange={e => setField('driverName', e.target.value)} className={inputCls} placeholder="Driver name" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-0.5 block">Driver Mobile</label>
                        <input value={form.driverMobile} onChange={e => setField('driverMobile', e.target.value)} className={inputCls} placeholder="Driver mobile" />
                      </div>
                    </>
                  )}
                </div>
              )}
              {openJobcardWarning && (
                <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2.5 text-xs font-medium">
                  <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-red-500" />
                  {openJobcardWarning}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Jobcard details */}
        <div className="card">
          <div className="flex items-center justify-between mb-3 gap-2">
            <h3 className="font-semibold text-gray-700 text-sm flex items-center gap-2">
              <Wrench size={15} className="text-primary" /> Jobcard Info
            </h3>
            {selectedCustomer?._id && (
              <button type="button" onClick={() => setShowHistory(true)}
                className="px-3 py-1.5 rounded-lg bg-gray-500 text-white text-xs font-medium hover:bg-gray-600 transition-colors whitespace-nowrap">
                Last History
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">KM Reading</label>
              <input type="number" value={form.kmReading} onChange={e => setField('kmReading', e.target.value)} className={inputCls} placeholder="e.g. 12500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Fuel Level: {form.fuelLevel}%</label>
              <input
                type="range"
                min={0} max={100} step={5}
                value={form.fuelLevel}
                onChange={e => setField('fuelLevel', Number(e.target.value))}
                className="fuel-slider w-full"
                style={{ '--fuel-pct': `${form.fuelLevel}%` }}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Mechanic</label>
              <select
                value={form.mechanicId}
                onChange={e => {
                  const m = mechanics.find(x => x._id === e.target.value);
                  setForm(f => ({ ...f, mechanicId: e.target.value, mechanicName: m?.name || '' }));
                }}
                className={`${selectCls} w-full`}
              >
                <option value="">Select mechanic</option>
                {mechanics.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Supervisor</label>
              <select
                value={form.supervisorId}
                onChange={e => {
                  const s = supervisors.find(x => x._id === e.target.value);
                  setForm(f => ({ ...f, supervisorId: e.target.value, supervisorName: s?.name || '' }));
                }}
                className={`${selectCls} w-full`}
              >
                <option value="">Select supervisor</option>
                {supervisors.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Icon drawer buttons */}
          <div className="flex gap-2 mt-4">
            {[
              { key: 'voice', icon: MessageCircle, label: 'Voice', count: form.customerVoiceLabels.length },
              { key: 'accessories', icon: Package, label: 'Parts', count: form.accessories.length },
              { key: 'notes', icon: MessageSquare, label: 'Advice', count: form.workNotes.length },
              { key: 'dents', icon: AlertTriangle, label: 'Dents', count: form.dentMarksArr.length },
              { key: 'photos', icon: Camera, label: 'Photos', count: form.photos?.length || 0 }
            ].map(({ key, icon: Icon, label, count }) => (
              <button
                key={key}
                onClick={() => setDrawerOpen(key)}
                className="flex flex-col items-center gap-1 flex-1 py-2.5 rounded-xl border border-border hover:border-primary hover:bg-primary/5 text-gray-500 hover:text-primary transition-colors relative"
              >
                <Icon size={18} />
                <span className="text-[10px] font-medium">{label}</span>
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Items section */}
      <div className="card mb-5">
        {/* Category tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          {[
            { type: 'Labour', label: 'Jobs', color: 'border-green-500 bg-green-50 text-green-700', activeColor: 'border-green-500 bg-green-500 text-white' },
            { type: 'Spare', label: 'Spare', color: 'border-blue-500 bg-blue-50 text-blue-700', activeColor: 'border-blue-500 bg-blue-500 text-white' },
            { type: 'Lube', label: 'Lube', color: 'border-orange-400 bg-orange-50 text-orange-700', activeColor: 'border-orange-400 bg-orange-400 text-white' },
            { type: 'Outsource', label: 'Outsource', color: 'border-purple-400 bg-purple-50 text-purple-700', activeColor: 'border-purple-500 bg-purple-500 text-white' },
            { type: 'Total', label: 'Total', color: 'border-gray-400 bg-gray-50 text-gray-700', activeColor: 'border-gray-600 bg-gray-700 text-white' }
          ].map(({ type, label, color, activeColor }) => {
            const isActive = activeItemTab === type;
            const count = type === 'Total' ? form.items.length : form.items.filter(i => i.itemType === type).length;
            const amount = type === 'Labour' ? totals.labourTotal : type === 'Spare' ? totals.spareTotal : type === 'Lube' ? totals.lubeTotal : type === 'Outsource' ? totals.outsourceTotal : totals.total;
            return (
              <button
                key={type}
                onClick={() => setActiveItemTab(type)}
                className={`py-3 px-4 rounded-xl border-2 text-left transition-all ${isActive ? activeColor : color}`}
              >
                <div className="font-heading font-bold text-lg">{count}</div>
                <div className="text-xs font-medium">{label} Items</div>
                <div className="text-sm font-semibold mt-1">{formatCurrency(amount)}</div>
              </button>
            );
          })}
        </div>

        {/* Frequent items */}
        {perm('canAddItems') && frequentItems.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="text-xs font-medium text-gray-500 self-center">Quick add:</span>
            {frequentItems.map(item => (
              <button
                key={item._id}
                onClick={() => addItem(item)}
                className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full hover:bg-primary/10 hover:text-primary transition-colors font-medium"
              >
                + {item.name}
              </button>
            ))}
          </div>
        )}

        {/* Package and AI buttons */}
        <div className="flex gap-2 mb-3">
          {perm('canAddItems') && activeItemTab === 'Outsource' && (
            <button
              onClick={addOutsource}
              className="text-xs px-3 py-1.5 border border-purple-300 rounded-lg text-purple-600 hover:bg-purple-50 flex items-center gap-1"
            >
              <Plus size={12} /> Add Outsource Charge
            </button>
          )}
          {perm('canAddItems') && (
            <button
              onClick={() => setPackageModalOpen(true)}
              className="text-xs px-3 py-1.5 border border-border rounded-lg text-gray-600 hover:border-primary hover:text-primary flex items-center gap-1"
            >
              <Package size={12} /> Load Package
            </button>
          )}
          <button
            onClick={() => toast({ title: 'AI Insights', description: 'Coming soon!', variant: 'default' })}
            className="text-xs px-3 py-1.5 border border-dashed border-purple-300 rounded-lg text-purple-500 hover:bg-purple-50 flex items-center gap-1"
          >
            ✨ AI Insights
          </button>
        </div>

        {/* Line item table */}
        {itemsByTab.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-border mb-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Particulars</th>
                  {activeItemTab === 'Total' && <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase w-20">Type</th>}
                  <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase w-20">Qty</th>
                  <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase w-28">Unit Price ₹</th>
                  {s.itemWiseDiscount && <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase w-32">Discount</th>}
                  {s.jobwiseMechanic && <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase w-36">Mechanic</th>}
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase w-28">Amount</th>
                  <th className="w-10 py-2.5 px-3" />
                </tr>
              </thead>
              <tbody>
                {itemsByTab.map((item, rawIdx) => {
                  const actualIdx = form.items.indexOf(item);
                  const typeBadgeColor = item.itemType === 'Labour' ? 'bg-green-100 text-green-700' : item.itemType === 'Spare' ? 'bg-blue-100 text-blue-700' : item.itemType === 'Outsource' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700';
                  return (
                    <tr key={actualIdx} className="border-b border-border last:border-0">
                      <td className="py-2 px-3">
                        {item.itemType === 'Outsource' ? (
                          <input
                            value={item.name}
                            onChange={e => updateItem(actualIdx, 'name', e.target.value)}
                            placeholder="Outsource work / vendor description"
                            className="w-full border border-border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        ) : (
                          <>
                            <div className="font-medium text-gray-800">{item.name}</div>
                            {item.partNumber && <div className="text-xs text-gray-400">{item.partNumber}</div>}
                          </>
                        )}
                      </td>
                      {activeItemTab === 'Total' && (
                        <td className="py-2 px-3 text-center">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeBadgeColor}`}>{item.itemType === 'Labour' ? 'Jobs' : item.itemType}</span>
                        </td>
                      )}
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          value={item.qty}
                          onChange={e => updateItem(actualIdx, 'qty', Number(e.target.value))}
                          className="w-16 text-center border border-border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          min={1}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={e => updateItem(actualIdx, 'unitPrice', Number(e.target.value))}
                          className="w-24 text-center border border-border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          min={0}
                        />
                      </td>
                      {s.itemWiseDiscount && (
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1">
                            <input
                              type="number" min={0}
                              value={item.discount || 0}
                              onChange={e => updateItem(actualIdx, 'discount', Number(e.target.value))}
                              className="w-16 text-center border border-border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <button
                              onClick={() => updateItem(actualIdx, 'discountType', item.discountType === 'percent' ? 'amount' : 'percent')}
                              className="text-xs border border-border rounded px-1.5 py-1 bg-white hover:bg-gray-50 text-gray-600"
                            >
                              {item.discountType === 'percent' ? '%' : '₹'}
                            </button>
                          </div>
                        </td>
                      )}
                      {s.jobwiseMechanic && (
                        <td className="py-2 px-3">
                          <select
                            value={item.mechanicId || ''}
                            onChange={e => {
                              const m = mechanics.find(x => x._id === e.target.value);
                              updateItem(actualIdx, 'mechanicId', e.target.value);
                              updateItem(actualIdx, 'mechanicName', m?.name || '');
                            }}
                            className="w-full border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                          >
                            <option value="">—</option>
                            {mechanics.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                          </select>
                        </td>
                      )}
                      <td className="py-2 px-3 text-right font-medium text-gray-700">{formatCurrency(item.finalAmount)}</td>
                      <td className="py-2 px-3">
                        {perm('canAddItems') && (
                          <button onClick={() => removeItem(actualIdx)} className="p-1 rounded hover:bg-red-50 text-red-400">
                            <X size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Item search */}
        {perm('canAddItems') && <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={itemSearch}
            onChange={e => activeItemTab !== 'Total' && activeItemTab !== 'Outsource' && setItemSearch(e.target.value)}
            placeholder={activeItemTab === 'Total' ? 'Switch to Jobs / Spare / Lube tab to add items' : activeItemTab === 'Outsource' ? 'Use "Add Outsource Charge" above to add a line' : `Search ${activeItemTab === 'Labour' ? 'Jobs' : activeItemTab} items by name or code...`}
            disabled={activeItemTab === 'Total' || activeItemTab === 'Outsource'}
            className="w-full pl-8 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50"
          />
          {itemSearch.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-lg z-20 flex flex-col max-h-48">
              <div className="overflow-y-auto flex-1">
                {itemSearchResults.map(item => (
                  <button
                    key={item._id}
                    onClick={() => addItem(item)}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-border last:border-0 flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium text-sm text-gray-800 flex items-center gap-2">
                        {item.name}
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${item._type === 'Labour' ? 'bg-green-100 text-green-700' : item._type === 'Spare' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                          {item._type === 'Labour' ? 'Jobs' : item._type}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">{item.jobCode || item.partNumber || ''}</div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {(item._type === 'Spare' || item._type === 'Lube') && (
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${(item.currentStock || 0) <= 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                          Stock: {item.currentStock ?? 0}
                        </span>
                      )}
                      <span className="text-sm font-semibold text-gray-700">₹{item.unitPrice}</span>
                    </div>
                  </button>
                ))}
                {itemSearchResults.length === 0 && (
                  <div className="px-4 py-2.5 text-sm text-gray-400">No Item Found</div>
                )}
              </div>
              <button
                onClick={() => { setShowQuickAdd(true); setItemSearch(''); setItemSearchResults([]); }}
                className="w-full text-left px-4 py-2.5 text-sm text-red-500 font-medium hover:bg-red-50 flex items-center gap-2 border-t border-border flex-shrink-0 rounded-b-xl"
              >
                <Plus size={14} /> Add New Item
              </button>
            </div>
          )}
        </div>}
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Left: Details tabs */}
        <div className="card">
          <h3 className="font-semibold text-gray-700 text-sm mb-4 pb-2 border-b border-border">Jobcard Details</h3>

          {true && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Cost Estimate (₹)</label>
                <input type="number" value={form.costEstimate} onChange={e => setField('costEstimate', e.target.value)} className={inputCls} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Delivery Date</label>
                  <DateField value={form.deliveryDate} onChange={e => setField('deliveryDate', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Delivery Time</label>
                  <input type="time" value={form.deliveryTime} onChange={e => setField('deliveryTime', e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Reminder KM</label>
                  <select value={form.reminderKm} onChange={e => setField('reminderKm', e.target.value)} className={`${selectCls} w-full`}>
                    <option value="">Select...</option>
                    {REMINDER_KM.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Reminder Period</label>
                  <select value={form.reminderPeriod} onChange={e => setField('reminderPeriod', e.target.value)} className={`${selectCls} w-full`}>
                    <option value="">Select...</option>
                    {REMINDER_PERIODS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Exit Note</label>
                <textarea
                  value={form.exitNote}
                  onChange={e => setField('exitNote', e.target.value)}
                  className={`${inputCls} resize-none`}
                  rows={3}
                  placeholder="Notes for customer on exit..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: Billing tabs */}
        <div className="card">
          <div className="flex border-b border-border -mx-5 px-5 mb-4 gap-4">
            {[['billing', 'Billing Details'], ['transactions', 'Transaction History']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setRightTab(key)}
                className={`py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  rightTab === key ? 'text-primary border-primary' : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {rightTab === 'billing' && (
            <div>
              <div className="space-y-2 mb-4 bg-gray-50 rounded-xl p-4">
                {[
                  ['Jobs Total', formatCurrency(totals.labourTotal), 'text-gray-600'],
                  ['Spare Total', formatCurrency(totals.spareTotal), 'text-gray-600'],
                  ['Lube Total', formatCurrency(totals.lubeTotal), 'text-gray-600'],
                  ...(totals.outsourceTotal > 0 ? [['Outsource Total', formatCurrency(totals.outsourceTotal), 'text-gray-600']] : []),
                  ['Total', formatCurrency(totals.total), 'font-semibold text-gray-800']
                ].map(([label, val, cls]) => (
                  <div key={label} className={`flex justify-between text-sm ${cls}`}>
                    <span>{label}</span><span>{val}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-2 mt-2">
                  {/* Discount — needs the "Apply / edit discount" permission AND the current
                      status's allowDiscount flag (defaults to showing only for Completed). */}
                  {perm('canApplyDiscount')
                    && (jobcardStatuses.find(s => s._id === form.status)?.allowDiscount ?? (form.statusCategory === 'Completed'))
                    && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-gray-600">Discount</span>
                    <div className="flex border border-border rounded-lg overflow-hidden text-xs ml-auto">
                      {['amount', 'percent'].map(t => (
                        <button
                          key={t}
                          onClick={() => setField('discountType', t)}
                          className={`px-2.5 py-1 transition-colors ${form.discountType === t ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                          {t === 'amount' ? '₹' : '%'}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      value={form.discount}
                      onChange={e => setField('discount', Number(e.target.value))}
                      className="w-24 text-right border border-border rounded-lg px-2 py-1 text-sm"
                      min={0}
                    />
                  </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-gray-800">
                    <span>Bill Amount</span><span className="text-primary">{formatCurrency(totals.billAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>Paid</span><span className="text-green-600 font-medium">{formatCurrency(totals.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1 font-bold">
                    <span className="text-red-600">Balance Due</span>
                    <span className="text-red-600">{formatCurrency(totals.balanceDue)}</span>
                  </div>
                </div>
              </div>

              {/* Add transaction — gated by role permission AND the current status's
                  allowAddTransaction flag (defaults to showing only for Completed). */}
              {perm('canAddPayment')
                && (jobcardStatuses.find(s => s._id === form.status)?.allowAddTransaction ?? (form.statusCategory === 'Completed'))
                && <div className="border-t border-border pt-4 space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase">Add Transaction</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select value={txnForm.type} onChange={e => setTxnForm(f => ({ ...f, type: e.target.value }))} className={`${selectCls} w-full`}>
                    {TRANSACTION_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <select value={txnForm.paymentType} onChange={e => setTxnForm(f => ({ ...f, paymentType: e.target.value }))} className={`${selectCls} w-full`}>
                    {PAYMENT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <input
                    type="number"
                    placeholder="Amount ₹"
                    value={txnForm.amount}
                    onChange={e => setTxnForm(f => ({ ...f, amount: e.target.value }))}
                    className={inputCls}
                  />
                  <DateField
                    value={txnForm.date}
                    onChange={e => setTxnForm(f => ({ ...f, date: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <input
                  placeholder="Transaction details..."
                  value={txnForm.details}
                  onChange={e => setTxnForm(f => ({ ...f, details: e.target.value }))}
                  className={inputCls}
                />
                <Button size="sm" onClick={addTransaction}><Plus size={13} /> Add</Button>
              </div>}
            </div>
          )}

          {rightTab === 'transactions' && (
            <div>
              {form.transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">No transactions yet</div>
              ) : (
                <div className="space-y-2">
                  {form.transactions.map((txn, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-gray-50 rounded-xl px-3 py-2.5">
                      <div>
                        <span className="font-medium text-gray-700">{txn.type}</span>
                        <span className="mx-1.5 text-gray-300">·</span>
                        <span className="text-gray-500">{txn.paymentType}</span>
                        {txn.details && <div className="text-xs text-gray-400">{txn.details}</div>}
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${txn.type === 'Refund' ? 'text-red-600' : 'text-green-600'}`}>
                          {txn.type === 'Refund' ? '-' : '+'}{formatCurrency(txn.amount)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(txn.date).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-end gap-3 bg-white rounded-2xl border border-border p-4 flex-wrap">
        <Button variant="ghost" onClick={() => backToList()}>Cancel</Button>

        {/* Print / share — edit mode only */}
        {isEdit && (
          <>
            <Button variant="outline" onClick={async () => {
              try { await jobcardsApi.printPdf(id); }
              catch { toast({ title: 'Failed to generate PDF', variant: 'error' }); }
            }}>
              <Printer size={14} /> Print Invoice
            </Button>
            <Button variant="secondary" onClick={() => window.open(`/jobcard-worksheet/${id}`, '_blank')}>
              <ClipboardList size={14} /> Mechanic Worksheet
            </Button>
            <Button variant="secondary" className="!bg-emerald-600 !text-white hover:!bg-emerald-700" onClick={handleWhatsapp}>
              <MessageCircle size={14} /> WhatsApp
            </Button>
          </>
        )}

        {/* Create mode */}
        {!isEdit && perm('canCreate') && (
          <Button onClick={handleSave} disabled={saving}>
            <Save size={14} />
            {saving ? 'Saving...' : (isShortInvoice ? 'Create Invoice' : 'Create Jobcard')}
          </Button>
        )}

        {/* Edit mode — status-driven action set:
            Open      → Update · Complete · Delete
            Completed → Update · Close · Delete
            Closed    → view-only; Update appears only with the
                        "Edit a CLOSED jobcard" permission */}
        {isEdit && jcLoaded && (
          <>
            {perm('canEdit') && canEditThis && (
              <Button onClick={handleSave} disabled={saving}>
                <Save size={14} /> {saving ? 'Saving...' : (isShortInvoice ? 'Update Invoice' : 'Update Jobcard')}
              </Button>
            )}

            {form.statusCategory === 'Open' && perm('canChangeStatus') && (
              <Button disabled={saving} className="!bg-amber-500 !text-white hover:!bg-amber-600"
                onClick={() => changeStatusTo('Completed', 'Jobcard completed')}>
                <CheckCircle size={14} /> Complete Jobcard
              </Button>
            )}

            {form.statusCategory === 'Completed' && perm('canChangeStatus') && (
              <Button disabled={saving} className="!bg-green-600 !text-white hover:!bg-green-700"
                onClick={() => changeStatusTo('Closed', 'Jobcard closed')}>
                <Lock size={14} /> Close Jobcard
              </Button>
            )}

            {perm('canDelete') && form.statusCategory !== 'Closed' && (
              <Button variant="danger" disabled={saving} onClick={handleDelete}>
                <Trash2 size={14} /> Delete Jobcard
              </Button>
            )}

            {form.statusCategory === 'Closed' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
                <Lock size={13} /> {canEditThis ? 'Closed — editable' : 'Closed — view only'}
              </span>
            )}
          </>
        )}
      </div>

      {/* Customer Voice Drawer */}
      <Drawer isOpen={drawerOpen === 'voice'} onClose={() => setDrawerOpen(null)} title="Customer Voice">
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              value={cvSearch}
              onChange={e => setCvSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomerVoice(); } }}
              placeholder="Search or add new..."
              className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={addCustomerVoice}
              disabled={addingCv || !cvSearch.trim()}
              className="btn-primary text-xs px-3 py-2 rounded-lg whitespace-nowrap disabled:opacity-50"
            >
              {addingCv ? 'Adding…' : '+ Add'}
            </button>
          </div>
          <div className="space-y-1">
            {customerVoiceOptions
              .filter(cv => cv.name.toLowerCase().includes(cvSearch.toLowerCase()))
              .map(cv => (
                <label key={cv._id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.customerVoice.includes(cv._id)}
                    onChange={e => {
                      const ids = e.target.checked
                        ? [...form.customerVoice, cv._id]
                        : form.customerVoice.filter(x => x !== cv._id);
                      const labels = customerVoiceOptions.filter(x => ids.includes(x._id)).map(x => x.name);
                      setForm(f => ({ ...f, customerVoice: ids, customerVoiceLabels: labels }));
                    }}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm text-gray-700">{cv.name}</span>
                </label>
              ))}
          </div>
        </div>
      </Drawer>

      {/* Advice Drawer */}
      <Drawer isOpen={drawerOpen === 'notes'} onClose={() => setDrawerOpen(null)} title="Advice">
        <WorkNotesDrawer notes={form.workNotes} onChange={notes => setField('workNotes', notes)} />
      </Drawer>

      {/* Accessories Drawer */}
      <Drawer isOpen={drawerOpen === 'accessories'} onClose={() => setDrawerOpen(null)} title="Accessories Checked In">
        <AccessoriesDrawer items={form.accessories} onChange={items => setField('accessories', items)} />
      </Drawer>

      {/* Dent Marks Drawer */}
      <Drawer isOpen={drawerOpen === 'dents'} onClose={() => setDrawerOpen(null)} title="Dent Marks" width="w-full sm:w-[520px]">
        <DentMarksDrawer marks={form.dentMarksArr} onChange={marks => setField('dentMarksArr', marks)} />
      </Drawer>

      {/* Photos Drawer */}
      <Drawer isOpen={drawerOpen === 'photos'} onClose={() => setDrawerOpen(null)} title="Vehicle Photos" width="w-full sm:w-[480px]">
        <PhotosDrawer
          jobcardId={isEdit ? id : null}
          photos={form.photos || []}
          onUploaded={(photos) => setField('photos', photos)}
        />
      </Drawer>

      {/* Last History Drawer */}
      {showHistory && selectedCustomer?._id && (
        <LastHistoryDrawer
          customerId={selectedCustomer._id}
          excludeId={isEdit ? id : null}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* New Customer Modal */}
      <Modal isOpen={showNewCustomerModal} onClose={() => setShowNewCustomerModal(false)} title="Add New Customer" size="lg">
        <NewCustomerForm
          value={newCustomer}
          onChange={setNewCustomer}
          makes={vehicleMakes}
          models={vehicleModels}
          onSave={async () => {
            try {
              const { data } = await customersApi.create({
                name: newCustomer.name,
                mobile: newCustomer.mobile,
                customerType: newCustomer.customerType,
                vehicles: newCustomer.vehicleNo ? [{
                  vehicleNo: newCustomer.vehicleNo,
                  make: newCustomer.makeId,
                  model: newCustomer.modelId,
                  makeName: newCustomer.makeName,
                  modelName: newCustomer.modelName,
                  engineNo: newCustomer.engineNo,
                  chassisNo: newCustomer.chassisNo,
                  color: newCustomer.color
                }] : []
              });
              setSelectedCustomer(data);
              setSelectedVehicle(data.vehicles?.[0] || null);
              setShowNewCustomerModal(false);
              setNewCustomer({ name: '', mobile: '', vehicleNo: '', makeId: '', makeName: '', modelId: '', modelName: '', engineNo: '', chassisNo: '', color: '' });
              toast({ title: 'Customer added', variant: 'success' });
            } catch (e) {
              toast({ title: 'Failed to add customer', description: e.response?.data?.message, variant: 'error' });
            }
          }}
          onClose={() => setShowNewCustomerModal(false)}
        />
      </Modal>

      {/* Package Modal */}
      <Modal isOpen={packageModalOpen} onClose={() => setPackageModalOpen(false)} title="Load Package">
        {packages.length === 0 ? (
          <p className="text-center text-gray-400 py-6">No packages defined. Add them in Masters.</p>
        ) : (
          <div className="space-y-2">
            {packages.map(pkg => (
              <div key={pkg._id} className="flex items-center justify-between p-3 border border-border rounded-xl hover:border-primary">
                <div>
                  <div className="font-medium text-gray-800">{pkg.name}</div>
                  <div className="text-xs text-gray-400">{pkg.items.length} items · {formatCurrency(pkg.totalPrice)}</div>
                </div>
                <Button size="sm" onClick={() => addPackage(pkg)}>Add</Button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Quick Add Item Modal */}
      {showQuickAdd && (
        <QuickAddItemModal
          initialType={activeItemTab === 'Labour' ? 'Job' : activeItemTab}
          onClose={() => setShowQuickAdd(false)}
          onAdded={(created) => {
            // Normalize item for jobcard
            const normalised = {
              ...created,
              unitPrice: created.sellingPrice || created.unitPrice || 0,
            };
            // Push to correct master list so it appears in future searches
            if (created._type === 'Job') {
              setLabourItems(prev => [...prev, normalised]);
            } else if (created._type === 'Spare') {
              setSpareItems(prev => [...prev, normalised]);
            } else if (created._type === 'Lube') {
              setLubeItems(prev => [...prev, normalised]);
            }
            // Auto-add to jobcard line items
            addItem(normalised);
            setShowQuickAdd(false);
          }}
        />
      )}
    </div>
  );
}

function WorkNotesDrawer({ notes, onChange }) {
  const [text, setText] = useState('');
  const addNote = () => {
    if (!text.trim()) return;
    onChange([...notes, { note: text.trim(), createdAt: new Date() }]);
    setText('');
  };
  return (
    <div className="space-y-3">
      <textarea value={text} onChange={e => setText(e.target.value)} className="w-full border border-border rounded-lg p-3 text-sm resize-none" rows={4} placeholder="Enter advice..." />
      <Button onClick={addNote} size="sm"><Plus size={13} /> Add Advice</Button>
      <div className="space-y-2 mt-3">
        {notes.map((n, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-3 text-sm">
            <p className="text-gray-700">{n.note}</p>
            <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString('en-IN')}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AccessoriesDrawer({ items, onChange }) {
  const DEFAULT = ['Helmet', 'Charger', 'Tools', 'Documents', 'Music System', 'Spare Tyre', 'Jack'];
  const [custom, setCustom] = useState('');
  const toggle = (item) => {
    const updated = items.includes(item) ? items.filter(i => i !== item) : [...items, item];
    onChange(updated);
  };
  const addCustom = () => {
    if (!custom.trim()) return;
    onChange([...items, custom.trim()]);
    setCustom('');
  };
  return (
    <div className="space-y-2">
      {DEFAULT.map(item => (
        <label key={item} className="flex items-center gap-3 p-2.5 hover:bg-gray-50 rounded-lg cursor-pointer">
          <input type="checkbox" checked={items.includes(item)} onChange={() => toggle(item)} className="w-4 h-4 accent-primary" />
          <span className="text-sm text-gray-700">{item}</span>
        </label>
      ))}
      <div className="flex gap-2 mt-3">
        <input value={custom} onChange={e => setCustom(e.target.value)} placeholder="Add custom..." className="flex-1 border border-border rounded-lg px-3 py-2 text-sm" />
        <Button size="sm" onClick={addCustom}><Plus size={13} /></Button>
      </div>
    </div>
  );
}

function NewCustomerForm({ value, onChange, makes, models, onSave, onClose }) {
  const set = (k, v) => onChange(prev => ({ ...prev, [k]: v }));
  const inputCls = 'w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Name <span className="text-red-500">*</span></label>
          <input value={value.name} onChange={e => set('name', e.target.value)} className={inputCls} placeholder="Customer name" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Mobile <span className="text-red-500">*</span></label>
          <input value={value.mobile} onChange={e => set('mobile', e.target.value)} className={inputCls} placeholder="10-digit mobile" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-bold text-gray-700 mb-1 block">Customer Type</label>
          <input value={value.customerType || ''} onChange={e => set('customerType', e.target.value)} className={inputCls} placeholder="e.g. VIP, Fleet, Walk-in, Corporate" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-500 mb-1 block">Vehicle Number</label>
          <input value={value.vehicleNo} onChange={e => set('vehicleNo', e.target.value.toUpperCase())} className={inputCls} placeholder="e.g. MH50AB1234" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Brand &amp; Model</label>
          <VehicleModelPicker
            makes={makes}
            models={models}
            makeId={value.makeId}
            makeName={value.makeName}
            modelId={value.modelId}
            modelName={value.modelName}
            onChange={v => { set('makeId', v.makeId); set('makeName', v.makeName); set('modelId', v.modelId); set('modelName', v.modelName); }}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Vehicle Colour</label>
          <input value={value.color || ''} onChange={e => set('color', e.target.value)} className={inputCls} placeholder="e.g. White, Black, Red" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Engine No.</label>
          <input value={value.engineNo || ''} onChange={e => set('engineNo', e.target.value.toUpperCase())} className={inputCls} placeholder="Engine number" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Chassis No.</label>
          <input value={value.chassisNo || ''} onChange={e => set('chassisNo', e.target.value.toUpperCase())} className={inputCls} placeholder="Chassis number" />
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={onSave}>Save Customer</Button>
      </div>
    </div>
  );
}

const MARK_COLORS = { Dent: '#EAB308', Scratch: '#F97316', Broken: '#DC2626' };

function DentMarksDrawer({ marks, onChange }) {
  const [markType, setMarkType] = useState('Dent');
  const containerRef = useRef(null);

  const handleClick = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onChange([...marks, { x, y, type: markType, id: Date.now() }]);
  };

  return (
    <div className="space-y-3">
      {/* Type selector */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(MARK_COLORS).map(([type, color]) => (
          <button
            key={type}
            onClick={() => setMarkType(type)}
            style={{
              backgroundColor: markType === type ? color : 'transparent',
              borderColor: color,
              color: markType === type ? '#fff' : color
            }}
            className="px-3 py-1.5 rounded-lg border-2 text-sm font-semibold transition-colors"
          >
            {type}
          </button>
        ))}
        <button
          onClick={() => marks.length > 0 && onChange(marks.slice(0, -1))}
          className="px-3 py-1.5 rounded-lg border-2 border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
        >
          Erase
        </button>
        <button
          onClick={() => onChange([])}
          className="px-3 py-1.5 rounded-lg border-2 border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
        >
          Erase All
        </button>
      </div>

      <p className="text-xs text-gray-400">Click on the vehicle diagram to mark damage locations</p>

      {/* Vehicle diagram */}
      <div
        ref={containerRef}
        onClick={handleClick}
        className="relative rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 cursor-crosshair overflow-hidden select-none"
        style={{ height: 340 }}
      >
        <MotorcycleSVG />
        {marks.map(m => (
          <div
            key={m.id}
            style={{
              left: `${m.x}%`,
              top: `${m.y}%`,
              backgroundColor: MARK_COLORS[m.type],
              transform: 'translate(-50%, -50%)'
            }}
            className="absolute w-5 h-5 rounded-full border-2 border-white shadow-lg flex items-center justify-center"
            title={m.type}
          >
            <span className="text-white text-[8px] font-bold">{m.type[0]}</span>
          </div>
        ))}
      </div>

      {marks.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500">{marks.length} mark{marks.length > 1 ? 's' : ''} recorded:</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(MARK_COLORS).map(([type, color]) => {
              const count = marks.filter(m => m.type === type).length;
              if (!count) return null;
              return (
                <span key={type} className="text-xs font-medium px-2 py-0.5 rounded-full border" style={{ borderColor: color + '40', backgroundColor: color + '15', color }}>
                  {count} {type}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function MotorcycleSVG() {
  return (
    <svg viewBox="0 0 480 340" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Labels */}
      <text x="30" y="20" fontSize="10" fill="#94a3b8" fontFamily="sans-serif">Side View</text>
      <text x="340" y="20" fontSize="10" fill="#94a3b8" fontFamily="sans-serif">Front / Rear</text>

      {/* ── SIDE VIEW ── */}
      {/* Rear wheel */}
      <circle cx="95" cy="230" r="52" stroke="#475569" strokeWidth="5" fill="none"/>
      <circle cx="95" cy="230" r="30" stroke="#94a3b8" strokeWidth="2" strokeDasharray="8 4" fill="none"/>
      <circle cx="95" cy="230" r="8" fill="#475569"/>
      {/* Front wheel */}
      <circle cx="335" cy="230" r="52" stroke="#475569" strokeWidth="5" fill="none"/>
      <circle cx="335" cy="230" r="30" stroke="#94a3b8" strokeWidth="2" strokeDasharray="8 4" fill="none"/>
      <circle cx="335" cy="230" r="8" fill="#475569"/>
      {/* Frame / swingarm */}
      <line x1="95" y1="230" x2="185" y2="145" stroke="#64748b" strokeWidth="4" strokeLinecap="round"/>
      <line x1="185" y1="145" x2="295" y2="145" stroke="#64748b" strokeWidth="4"/>
      <line x1="295" y1="145" x2="335" y2="230" stroke="#64748b" strokeWidth="4" strokeLinecap="round"/>
      {/* Seat */}
      <path d="M155 140 Q205 110 265 135 L265 150 Q205 130 155 155 Z" fill="#475569" opacity="0.8"/>
      {/* Fuel tank */}
      <ellipse cx="210" cy="130" rx="50" ry="25" fill="#64748b" opacity="0.9"/>
      {/* Engine block */}
      <rect x="155" y="165" width="110" height="55" rx="8" fill="#475569" opacity="0.7"/>
      {/* Handlebar */}
      <line x1="295" y1="145" x2="320" y2="115" stroke="#64748b" strokeWidth="5" strokeLinecap="round"/>
      <line x1="305" y1="112" x2="335" y2="118" stroke="#64748b" strokeWidth="4" strokeLinecap="round"/>
      {/* Front fork */}
      <line x1="315" y1="135" x2="335" y2="185" stroke="#64748b" strokeWidth="5" strokeLinecap="round"/>
      <line x1="325" y1="135" x2="342" y2="185" stroke="#64748b" strokeWidth="4" strokeLinecap="round"/>
      {/* Headlight */}
      <ellipse cx="340" cy="120" rx="16" ry="12" fill="#CBD5E1" stroke="#64748b" strokeWidth="2"/>
      {/* Exhaust */}
      <path d="M155 195 Q130 210 110 225" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" fill="none"/>
      {/* Rear fender */}
      <path d="M95 178 Q115 155 140 155" stroke="#64748b" strokeWidth="3" fill="none"/>

      {/* ── FRONT VIEW ── */}
      <text x="355" y="90" fontSize="9" fill="#94a3b8" fontFamily="sans-serif" textAnchor="middle">FRONT</text>
      <ellipse cx="355" cy="120" rx="22" ry="16" fill="#CBD5E1" stroke="#475569" strokeWidth="2.5"/>
      <rect x="343" y="136" width="24" height="40" rx="4" fill="#64748b" opacity="0.6"/>
      <line x1="330" y1="142" x2="345" y2="142" stroke="#64748b" strokeWidth="4" strokeLinecap="round"/>
      <line x1="365" y1="142" x2="380" y2="142" stroke="#64748b" strokeWidth="4" strokeLinecap="round"/>
      <ellipse cx="355" cy="235" rx="22" ry="22" stroke="#475569" strokeWidth="4" fill="none"/>
      <ellipse cx="355" cy="235" rx="10" ry="10" stroke="#94a3b8" strokeWidth="2" fill="none"/>
      <line x1="343" y1="176" x2="340" y2="213" stroke="#64748b" strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="367" y1="176" x2="370" y2="213" stroke="#64748b" strokeWidth="3.5" strokeLinecap="round"/>

      {/* ── REAR VIEW ── */}
      <text x="435" y="90" fontSize="9" fill="#94a3b8" fontFamily="sans-serif" textAnchor="middle">REAR</text>
      <rect x="415" y="100" width="40" height="28" rx="5" fill="#475569" opacity="0.7"/>
      <rect x="420" y="128" width="30" height="50" rx="4" fill="#64748b" opacity="0.6"/>
      <line x1="410" y1="138" x2="418" y2="138" stroke="#64748b" strokeWidth="4" strokeLinecap="round"/>
      <line x1="447" y1="138" x2="455" y2="138" stroke="#64748b" strokeWidth="4" strokeLinecap="round"/>
      <ellipse cx="435" cy="235" rx="22" ry="22" stroke="#475569" strokeWidth="4" fill="none"/>
      <ellipse cx="435" cy="235" rx="10" ry="10" stroke="#94a3b8" strokeWidth="2" fill="none"/>
      <line x1="420" y1="178" x2="416" y2="213" stroke="#64748b" strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="450" y1="178" x2="454" y2="213" stroke="#64748b" strokeWidth="3.5" strokeLinecap="round"/>
      {/* Tail light */}
      <rect x="418" y="98" width="34" height="10" rx="3" fill="#EF4444" opacity="0.6"/>
    </svg>
  );
}

function PhotosDrawer({ jobcardId, photos, onUploaded }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setSelectedFiles(files);
    const urls = files.map(f => URL.createObjectURL(f));
    setPreviews(urls);
  };

  const handleUpload = async () => {
    if (!selectedFiles.length) return;
    if (!jobcardId) {
      toast({ title: 'Save the jobcard first before uploading photos', variant: 'error' });
      return;
    }
    setUploading(true);
    try {
      const { data } = await jobcardsApi.uploadPhotos(jobcardId, selectedFiles);
      onUploaded(data.photos);
      setSelectedFiles([]);
      setPreviews([]);
      if (inputRef.current) inputRef.current.value = '';
      toast({ title: `${selectedFiles.length} photo${selectedFiles.length > 1 ? 's' : ''} uploaded`, variant: 'success' });
    } catch (e) {
      toast({ title: 'Upload failed', description: e.response?.data?.message, variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {!jobcardId && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
          Save the jobcard first, then come back to upload photos.
        </div>
      )}

      {/* Upload area */}
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
      >
        <Camera size={28} className="text-gray-300 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-500">Click to select photos</p>
        <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP — up to 5 MB each</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Selected previews */}
      {previews.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">{previews.length} file{previews.length > 1 ? 's' : ''} selected</p>
          <div className="grid grid-cols-3 gap-2">
            {previews.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border">
                <img src={url} alt={`preview-${i}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading || !jobcardId}
            className="mt-3 w-full bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : `Upload ${previews.length} Photo${previews.length > 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {/* Existing uploaded photos */}
      {photos.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">{photos.length} uploaded photo{photos.length > 1 ? 's' : ''}</p>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((path, i) => (
              <a key={i} href={path} target="_blank" rel="noreferrer"
                className="relative aspect-square rounded-xl overflow-hidden border border-border hover:opacity-80 transition-opacity block">
                <img src={path} alt={`photo-${i}`} className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}

      {photos.length === 0 && previews.length === 0 && (
        <p className="text-xs text-gray-400 text-center">No photos yet</p>
      )}
    </div>
  );
}
