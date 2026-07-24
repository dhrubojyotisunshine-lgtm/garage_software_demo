import { useState, useEffect, useCallback } from 'react';
import { DateField } from '../../components/ui/DateField';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Printer, Wallet, IndianRupee, FileText, CalendarClock } from 'lucide-react';
import { suppliersApi } from '../../api/suppliers';
import { useToast } from '../../components/ui/Toast';
import { formatCurrency, formatDate } from '../../utils/format';

const csvCell = (v) => {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function StatBlock({ icon: Icon, label, value, iconBg, valueClass }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <div className="text-xs text-gray-500 mb-0.5">{label}</div>
        <div className={`text-xl font-bold text-gray-800 ${valueClass || ''}`}>{value}</div>
      </div>
    </div>
  );
}

export default function SupplierDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tab, setTab] = useState('details');
  const [supplier, setSupplier] = useState(null);
  const [summary, setSummary] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadSupplier = useCallback(async () => {
    try {
      const { data } = await suppliersApi.get(id);
      setSupplier(data.supplier);
      setSummary(data.summary);
    } catch {
      toast({ title: 'Failed to load supplier', variant: 'error' });
    }
  }, [id]);

  const loadLedger = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const { data } = await suppliersApi.ledger(id, params);
      setLedger(data);
    } catch {
      toast({ title: 'Failed to load ledger', variant: 'error' });
    } finally { setLoading(false); }
  }, [id, dateFrom, dateTo]);

  useEffect(() => { loadSupplier(); }, [loadSupplier]);
  useEffect(() => { if (tab === 'ledger') loadLedger(); }, [tab, loadLedger]);

  const exportCSV = () => {
    if (!ledger || (!ledger.rows.length && !ledger.opening)) return toast({ title: 'Nothing to export', variant: 'error' });
    const cols = ['Date', 'Particulars', 'Narration', 'Vch Type', 'Vch No.', 'Debit', 'Credit', 'Balance'];
    const lines = [cols.join(',')];
    lines.push(['', 'Opening Balance', '', '', '', '', '', (ledger.opening || 0).toFixed(2)].map(csvCell).join(','));
    ledger.rows.forEach(r => lines.push([
      formatDate(r.date), r.particulars, r.narration, r.vchType, r.vchNo,
      (r.debit || 0).toFixed(2), (r.credit || 0).toFixed(2), (r.balance || 0).toFixed(2),
    ].map(csvCell).join(',')));
    lines.push(['', 'Closing Balance', '', '', '', (ledger.totalDebit || 0).toFixed(2), (ledger.totalCredit || 0).toFixed(2), (ledger.closing || 0).toFixed(2)].map(csvCell).join(','));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `supplier-ledger-${supplier?.firmName || id}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const qs = new URLSearchParams();
    if (dateFrom) qs.set('dateFrom', dateFrom);
    if (dateTo) qs.set('dateTo', dateTo);
    window.open(`/supplier-ledger-print/${id}${qs.toString() ? `?${qs}` : ''}`, '_blank');
  };

  if (!supplier) return <div className="py-16 text-center text-gray-400">Loading…</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/inventory/supplier')} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="font-heading font-bold text-gray-800 text-2xl">{supplier.firmName}</h1>
          <p className="text-gray-500 text-sm">{supplier.firstName} · {supplier.contact1}{supplier.contact2 ? `, ${supplier.contact2}` : ''}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-5">
        {[['details', 'Supplier Details'], ['ledger', 'Supplier Ledger']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors ${
              tab === key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Details tab ── */}
      {tab === 'details' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatBlock icon={FileText}    label="Total Purchased"  value={formatCurrency(summary?.totalPurchased || 0)} iconBg="bg-blue-400" />
            <StatBlock icon={Wallet}      label="Total Paid"       value={formatCurrency(summary?.totalPaid || 0)}      iconBg="bg-green-500" />
            <StatBlock icon={IndianRupee} label="Pending Amount"   value={formatCurrency(summary?.pending || 0)}        iconBg="bg-red-500" valueClass="text-red-600" />
            <StatBlock icon={CalendarClock} label="Last Paid Date" value={summary?.lastPaidDate ? formatDate(summary.lastPaidDate) : '—'} iconBg="bg-amber-400" />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-700 mb-3">Supplier Information</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
              {[
                ['Firm Name', supplier.firmName],
                ['Owner Name', supplier.firstName],
                ['Contact 1', supplier.contact1],
                ['Contact 2', supplier.contact2 || '—'],
                ['Email', supplier.email || '—'],
                ['GSTIN', supplier.gstin || '—'],
                ['Address', supplier.address],
                ['Total Purchase Orders', summary?.poCount ?? 0],
                ['Last Purchase Date', summary?.lastPurchaseDate ? formatDate(summary.lastPurchaseDate) : '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <span className="text-gray-400 w-44 flex-shrink-0">{k}</span>
                  <span className="text-gray-800 font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Ledger tab ── */}
      {tab === 'ledger' && (
        <div>
          {/* Filters + export */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 bg-white">
              <span className="text-xs text-gray-400">From</span>
              <DateField value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="text-sm focus:outline-none text-gray-600" />
              <span className="text-xs text-gray-400">To</span>
              <DateField value={dateTo} onChange={e => setDateTo(e.target.value)} className="text-sm focus:outline-none text-gray-600" />
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-gray-400 hover:text-red-500">Clear</button>
              )}
            </div>
            <div className="flex-1" />
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2 border border-green-300 rounded-lg text-sm font-medium text-green-700 hover:bg-green-50 bg-white">
              <Download size={14} /> Export CSV
            </button>
            <button onClick={exportPDF}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 bg-white">
              <Printer size={14} /> Export PDF
            </button>
          </div>

          {/* Ledger table */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {['Date', 'Particulars', 'Vch Type', 'Vch No.', 'Debit', 'Credit', 'Balance'].map((h, i) => (
                    <th key={h} className={`py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap ${i >= 4 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading…</td></tr>
                ) : (
                  <>
                    <tr className="border-b border-gray-100 bg-blue-50/40">
                      <td className="py-2.5 px-4 text-gray-500 text-xs" colSpan={4}>Opening Balance</td>
                      <td className="py-2.5 px-4" />
                      <td className="py-2.5 px-4" />
                      <td className="py-2.5 px-4 text-right font-semibold text-gray-700">{formatCurrency(ledger?.opening || 0)}</td>
                    </tr>
                    {(ledger?.rows || []).length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-10 text-gray-400">No ledger entries in this range</td></tr>
                    ) : ledger.rows.map((r, i) => (
                      <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-600 text-xs whitespace-nowrap align-top">{formatDate(r.date)}</td>
                        <td className="py-3 px-4">
                          <div className={`font-semibold ${r.vchType === 'Purchase' ? 'text-gray-800' : 'text-gray-800'}`}>
                            <span className={`mr-1.5 text-xs font-bold ${r.credit > 0 ? 'text-purple-600' : 'text-green-600'}`}>{r.credit > 0 ? 'Cr' : 'Dr'}</span>
                            {r.particulars}
                          </div>
                          <div className="text-xs text-gray-400 italic">{r.narration}</div>
                        </td>
                        <td className="py-3 px-4 text-gray-600 align-top">{r.vchType}</td>
                        <td className="py-3 px-4 text-gray-500 text-xs align-top">{r.vchNo || '—'}</td>
                        <td className="py-3 px-4 text-right text-green-700 align-top">{r.debit ? formatCurrency(r.debit) : ''}</td>
                        <td className="py-3 px-4 text-right text-purple-700 align-top">{r.credit ? formatCurrency(r.credit) : ''}</td>
                        <td className="py-3 px-4 text-right font-medium text-gray-800 align-top">{formatCurrency(r.balance || 0)}</td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
              {!loading && (
                <tfoot>
                  <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                    <td className="py-3 px-4" colSpan={4}>Closing Balance</td>
                    <td className="py-3 px-4 text-right text-green-700">{formatCurrency(ledger?.totalDebit || 0)}</td>
                    <td className="py-3 px-4 text-right text-purple-700">{formatCurrency(ledger?.totalCredit || 0)}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{formatCurrency(ledger?.closing || 0)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">Balance = outstanding payable to supplier. Cr = purchase (we owe), Dr = payment made.</p>
        </div>
      )}
    </div>
  );
}
