import { useState, useEffect } from 'react';
import { DateField } from '../../components/ui/DateField';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Phone, Mail, Car, MapPin, FileText, TrendingUp,
  Star, Bell, MessageSquare, Send, Edit2, X, Clock,
  IndianRupee, ShoppingCart, Tag, Plus
} from 'lucide-react';
import { customersApi } from '../../api/customers';
import { useToast } from '../../components/ui/Toast';
import { getInitials } from '../../utils/format';
import CustomerEditModal from '../../components/CustomerEditModal';

const STATUS_OPTIONS = ['Lead', 'Active', 'VIP', 'Inactive'];
const STATUS_CONFIG  = {
  Lead:     { color: 'bg-blue-100 text-blue-700 border-blue-200',    dot: 'bg-blue-400' },
  Active:   { color: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500' },
  VIP:      { color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  Inactive: { color: 'bg-gray-100 text-gray-500 border-gray-200',    dot: 'bg-gray-400' },
};

function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
function fmtINR(n)  { return `₹${(n||0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`; }
function fmtDT(d)   { if (!d) return ''; return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }); }

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <div className="font-bold text-xl text-gray-800">{value}</div>
        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [customer, setCustomer] = useState(null);
  const [stats, setStats]       = useState({});
  const [jobcards, setJobcards] = useState([]);
  const [counters, setCounters] = useState([]);
  const [loading, setLoading]   = useState(true);

  const [noteText, setNoteText]       = useState('');
  const [addingNote, setAddingNote]   = useState(false);
  const [editStatus, setEditStatus]   = useState(false);
  const [newTag, setNewTag]           = useState('');
  const [editFollowUp, setEditFollowUp] = useState(false);
  const [followUpDate, setFUDate]     = useState('');
  const [followUpNote, setFUNote]     = useState('');
  const [savingFU, setSavingFU]       = useState(false);
  const [editOpen, setEditOpen]       = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await customersApi.getById(id);
      setCustomer(data.customer);
      setStats(data.stats || {});
      setJobcards(data.jobcards || []);
      setCounters(data.counters || []);
      setFUDate(data.customer.followUpDate ? data.customer.followUpDate.slice(0,10) : '');
      setFUNote(data.customer.followUpNote || '');
    } catch { toast({ title: 'Failed to load', variant: 'error' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      await customersApi.addNote(id, noteText.trim());
      setNoteText('');
      toast({ title: 'Note added', variant: 'success' });
      load();
    } catch { toast({ title: 'Failed', variant: 'error' }); }
    finally { setAddingNote(false); }
  };

  const handleStatusChange = async (status) => {
    try {
      await customersApi.update(id, { status });
      setCustomer(c => ({ ...c, status }));
      setEditStatus(false);
    } catch { toast({ title: 'Failed', variant: 'error' }); }
  };

  const handleAddTag = async () => {
    const tag = newTag.trim();
    if (!tag) return;
    const tags = [...(customer.tags || []), tag];
    try { await customersApi.update(id, { tags }); setCustomer(c => ({ ...c, tags })); setNewTag(''); }
    catch { toast({ title: 'Failed', variant: 'error' }); }
  };

  const handleRemoveTag = async (tag) => {
    const tags = (customer.tags || []).filter(t => t !== tag);
    try { await customersApi.update(id, { tags }); setCustomer(c => ({ ...c, tags })); }
    catch { toast({ title: 'Failed', variant: 'error' }); }
  };

  const handleSaveFollowUp = async () => {
    setSavingFU(true);
    try {
      await customersApi.setFollowUp(id, { followUpDate: followUpDate || null, followUpNote });
      setCustomer(c => ({ ...c, followUpDate, followUpNote }));
      setEditFollowUp(false);
      toast({ title: 'Follow-up saved', variant: 'success' });
    } catch { toast({ title: 'Failed', variant: 'error' }); }
    finally { setSavingFU(false); }
  };

  // Build activity timeline
  const timeline = [
    ...jobcards.map(j => ({ ...j, _kind: 'jobcard', _date: new Date(j.createdAt) })),
    ...counters.map(c => ({ ...c, _kind: 'counter', _date: new Date(c.createdAt) })),
    ...((customer?.notes || []).map(n => ({ ...n, _kind: 'note', _date: new Date(n.createdAt) }))),
  ].sort((a, b) => b._date - a._date);

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>;
  if (!customer) return <div className="text-center py-20 text-red-500">Customer not found</div>;

  const sc = STATUS_CONFIG[customer.status] || STATUS_CONFIG.Active;
  const isOverdue = customer.followUpDate && new Date(customer.followUpDate) < new Date();

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => navigate('/customers')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-5">
        <ArrowLeft size={16} /> Back to Customers
      </button>

      {/* Hero */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold flex-shrink-0">
            {getInitials(customer.name)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-800">{customer.name}</h1>
              {customer.status === 'VIP' && <Star size={16} className="text-amber-500 fill-amber-500" />}

              {/* Status editable */}
              <div className="relative">
                <button onClick={() => setEditStatus(s => !s)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${sc.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                  {customer.status || 'Active'} <Edit2 size={10} />
                </button>
                {editStatus && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 min-w-28">
                    {STATUS_OPTIONS.map(s => (
                      <button key={s} onClick={() => handleStatusChange(s)}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${customer.status === s ? 'font-semibold text-primary' : 'text-gray-700'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={() => setEditOpen(true)}
                className="ml-auto flex items-center gap-1.5 text-sm text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/5">
                <Edit2 size={13} /> Edit
              </button>
            </div>

            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
              {customer.mobile  && <span className="flex items-center gap-1.5"><Phone size={13} />{customer.mobile}</span>}
              {customer.email   && <span className="flex items-center gap-1.5"><Mail size={13} />{customer.email}</span>}
              {customer.address && <span className="flex items-center gap-1.5"><MapPin size={13} />{customer.address}</span>}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {(customer.tags || []).map(tag => (
                <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">
                  <Tag size={9} />{tag}
                  <button onClick={() => handleRemoveTag(tag)} className="ml-0.5 hover:text-red-500"><X size={10} /></button>
                </span>
              ))}
              <div className="flex items-center gap-1">
                <input type="text" value={newTag} onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                  placeholder="Add tag…"
                  className="text-xs border border-gray-200 rounded-full px-2 py-0.5 w-20 focus:outline-none focus:border-primary" />
                <button onClick={handleAddTag} className="text-primary"><Plus size={14} /></button>
              </div>
            </div>
          </div>

          {/* Vehicles */}
          {customer.vehicles?.length > 0 && (
            <div className="flex-shrink-0 space-y-1.5">
              {customer.vehicles.slice(0, 3).map((v, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5">
                  <Car size={12} className="text-gray-400" />
                  {v.vehicleNo || `${v.makeName||''} ${v.modelName||''}`.trim() || 'Vehicle'}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon={TrendingUp}  label="Total Visits" value={stats.visits || 0}      color="bg-blue-500" />
        <StatCard icon={IndianRupee} label="Total Spend"  value={fmtINR(stats.totalSpend)} color="bg-green-500" />
        <StatCard icon={IndianRupee} label="Avg Bill"     value={fmtINR(stats.avgBill)}    color="bg-purple-500" />
        <StatCard icon={Clock}       label="Last Visit"   value={fmtDate(stats.lastVisit)} color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Timeline */}
        <div className="lg:col-span-2 space-y-4">
          {/* Add note */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <MessageSquare size={15} className="text-primary" /> Add Note
            </p>
            <div className="flex gap-2">
              <textarea rows={2} value={noteText} onChange={e => setNoteText(e.target.value)}
                placeholder="Write a note about this customer…"
                className="flex-1 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
              <button onClick={handleAddNote} disabled={addingNote || !noteText.trim()}
                className="px-4 py-2 rounded-xl text-white text-sm font-medium self-end disabled:opacity-50"
                style={{ background: 'linear-gradient(to right, #ef4444, #b91c1c)' }}>
                <Send size={15} />
              </button>
            </div>
          </div>

          {/* Activity */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-700 mb-4">Activity Timeline</p>
            {timeline.length === 0
              ? <p className="text-gray-400 text-sm text-center py-6">No activity yet</p>
              : (
                <div className="space-y-3">
                  {timeline.map((item, i) => {
                    if (item._kind === 'note') return (
                      <div key={`note-${i}`} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <MessageSquare size={14} className="text-blue-500" />
                        </div>
                        <div className="flex-1 bg-blue-50 rounded-xl px-3 py-2.5">
                          <p className="text-sm text-gray-700">{item.text}</p>
                          <p className="text-xs text-gray-400 mt-1">{fmtDT(item.createdAt)}</p>
                        </div>
                      </div>
                    );
                    if (item._kind === 'jobcard') return (
                      <div key={`jc-${item._id}`} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <FileText size={14} className="text-green-600" />
                        </div>
                        <div className="flex-1 border border-gray-100 rounded-xl px-3 py-2.5 hover:bg-gray-50 cursor-pointer"
                          onClick={() => navigate(`/jobcards/${item._id}`)}>
                          <div className="flex justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-800">{item.jobcardNumber}</p>
                              <p className="text-xs text-gray-400">{[item.vehicleMake, item.vehicleModel].filter(Boolean).join(' ')} · {item.statusLabel}</p>
                            </div>
                            <span className="text-sm font-semibold text-gray-700">{fmtINR(item.billAmount)}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{fmtDT(item.createdAt)}</p>
                        </div>
                      </div>
                    );
                    if (item._kind === 'counter') return (
                      <div key={`cs-${item._id}`} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <ShoppingCart size={14} className="text-orange-500" />
                        </div>
                        <div className="flex-1 border border-gray-100 rounded-xl px-3 py-2.5">
                          <div className="flex justify-between">
                            <p className="text-sm font-medium text-gray-800">Counter Sale {item.counterNumber}</p>
                            <span className="text-sm font-semibold text-gray-700">{fmtINR(item.total)}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{fmtDT(item.createdAt)}</p>
                        </div>
                      </div>
                    );
                    return null;
                  })}
                </div>
              )
            }
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Follow-up */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Bell size={15} className={isOverdue ? 'text-red-500' : 'text-primary'} /> Follow-up
              </p>
              <button onClick={() => setEditFollowUp(e => !e)} className="text-xs text-primary hover:underline">
                {editFollowUp ? 'Cancel' : 'Edit'}
              </button>
            </div>
            {editFollowUp ? (
              <div className="space-y-2">
                <DateField value={followUpDate} onChange={e => setFUDate(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none" />
                <input type="text" value={followUpNote} onChange={e => setFUNote(e.target.value)}
                  placeholder="Note…" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none" />
                <button onClick={handleSaveFollowUp} disabled={savingFU}
                  className="w-full py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60"
                  style={{ background: 'linear-gradient(to right, #ef4444, #b91c1c)' }}>
                  {savingFU ? 'Saving...' : 'Save'}
                </button>
              </div>
            ) : customer.followUpDate ? (
              <div>
                <div className={`text-sm font-medium flex items-center gap-2 ${isOverdue ? 'text-red-500' : 'text-gray-700'}`}>
                  <Clock size={14} /> {fmtDate(customer.followUpDate)}
                  {isOverdue && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Overdue</span>}
                </div>
                {customer.followUpNote && <p className="text-xs text-gray-500 mt-1">{customer.followUpNote}</p>}
              </div>
            ) : <p className="text-sm text-gray-400">No follow-up set</p>}
          </div>

          {/* Vehicles */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Car size={15} className="text-primary" /> Vehicles</p>
            {customer.vehicles?.length > 0 ? (
              <div className="space-y-2">
                {customer.vehicles.map((v, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl px-3 py-2.5">
                    <div className="font-medium text-sm text-gray-800">{v.vehicleNo || '—'}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{[v.makeName, v.modelName, v.year].filter(Boolean).join(' · ')}</div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400">No vehicles</p>}
          </div>

          {/* Details */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Details</p>
            <div className="space-y-2 text-sm">
              {customer.customerType && <div className="flex gap-2"><span className="text-gray-400 w-16 flex-shrink-0">Type</span><span className="text-gray-800 font-bold uppercase">{customer.customerType}</span></div>}
              {customer.gstNo   && <div className="flex gap-2"><span className="text-gray-400 w-16 flex-shrink-0">GST</span><span className="text-gray-700 font-mono text-xs">{customer.gstNo}</span></div>}
              {customer.dob     && <div className="flex gap-2"><span className="text-gray-400 w-16 flex-shrink-0">DOB</span><span className="text-gray-700">{fmtDate(customer.dob)}</span></div>}
              <div className="flex gap-2"><span className="text-gray-400 w-16 flex-shrink-0">Since</span><span className="text-gray-700">{fmtDate(customer.createdAt)}</span></div>
            </div>
          </div>
        </div>
      </div>

      {editOpen && (
        <CustomerEditModal
          customer={customer}
          onClose={() => setEditOpen(false)}
          onSaved={() => { setEditOpen(false); load(); }}
        />
      )}
    </div>
  );
}
