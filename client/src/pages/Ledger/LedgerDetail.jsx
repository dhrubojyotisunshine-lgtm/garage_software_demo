import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Printer, Wallet, IndianRupee, FileText, CalendarClock } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DateField } from '../../components/ui/DateField';
import { ledgerApi } from '../../api/ledgerApi';
import { useToast } from '../../components/ui/Toast';
import { formatCurrency, formatDate } from '../../utils/format';
import LedgerModal from '../../components/LedgerModal';
import { partyApi } from '../../api/partyApi';

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

export default function LedgerDetail() {
  const { name, partyId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tab, setTab] = useState('details');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  // Default to the last 30 days (like a bank statement); "All" clears the range.
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [showAdd, setShowAdd] = useState(false);

  // Quick date-range presets (like a bank statement).
  const PRESETS = [
    { label: 'All', days: 0 },
    { label: '7 Days', days: 7 },
    { label: '15 Days', days: 15 },
    { label: '30 Days', days: 30 },
    { label: '60 Days', days: 60 },
    { label: '90 Days', days: 90 },
  ];
  const isoDay = (d) => d.toISOString().slice(0, 10);
  const applyPreset = (days) => {
    if (!days) { setDateFrom(''); setDateTo(''); return; }
    const from = new Date(); from.setDate(from.getDate() - days);
    setDateFrom(isoDay(from)); setDateTo(isoDay(new Date()));
  };
  const isActivePreset = (days) => {
    if (!days) return !dateFrom && !dateTo;
    const from = new Date(); from.setDate(from.getDate() - days);
    return dateFrom === isoDay(from) && dateTo === isoDay(new Date());
  };

  // Name comes from the response when navigating by partyId; from the URL otherwise.
  const displayName = data?.partyName || (name ? decodeURIComponent(name) : '');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const { data } = partyId
        ? await ledgerApi.partyById(partyId, params)
        : await ledgerApi.party(decodeURIComponent(name), params);
      setData(data);
    } catch (err) {
      // A party with no ledger entries yet returns 404 — still render its page
      // (with the Add Ledger button) using the party master's name/phone.
      if (partyId && err.response?.status === 404) {
        try {
          const { data: party } = await partyApi.get(partyId);
          setData({
            partyName: party.partyName, partyPhone: party.phone,
            summary: { totalDebit: 0, totalCredit: 0, balance: 0, count: 0, firstDate: null, lastDate: null },
            opening: 0, rows: [], totalDebit: 0, totalCredit: 0, closing: 0
          });
        } catch { toast({ title: 'Failed to load ledger', variant: 'error' }); }
      } else {
        toast({ title: 'Failed to load ledger', variant: 'error' });
      }
    } finally { setLoading(false); }
  }, [partyId, name, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const exportCSV = () => {
    if (!data || !data.rows.length) return toast({ title: 'Nothing to export', variant: 'error' });
    const cols = ['Date', 'Type', 'Narration', 'Remark', 'Debit', 'Credit', 'Balance'];
    const lines = [cols.join(',')];
    lines.push(['', '', 'Opening Balance', '', '', '', (data.opening || 0).toFixed(2)].map(csvCell).join(','));
    data.rows.forEach(r => lines.push([
      formatDate(r.date), r.type, r.narration, r.remark,
      (r.debit || 0).toFixed(2), (r.credit || 0).toFixed(2), (r.balance || 0).toFixed(2),
    ].map(csvCell).join(',')));
    lines.push(['', '', 'Closing Balance', '', (data.totalDebit || 0).toFixed(2), (data.totalCredit || 0).toFixed(2), (data.closing || 0).toFixed(2)].map(csvCell).join(','));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ledger-${displayName}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // Generate and download a real .pdf (no print dialog) via jsPDF + autotable.
  const exportPDF = () => {
    if (!data || !data.rows.length) return toast({ title: 'Nothing to export', variant: 'error' });
    const money = (n) => (n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    const s = data.summary || {};
    const range = (dateFrom || dateTo) ? `${dateFrom ? formatDate(dateFrom) : '…'} to ${dateTo ? formatDate(dateTo) : '…'}` : 'All dates';

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const M = 40;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
    doc.text(displayName || 'Ledger', M, 46);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(110);
    doc.text(`${data.partyPhone ? data.partyPhone + '  ·  ' : ''}${range}  ·  ${s.count || 0} transaction(s)`, M, 62);
    doc.setTextColor(30);
    doc.text(
      `Total Debit: ${money(s.totalDebit)}     Total Credit: ${money(s.totalCredit)}     Balance: ${money(s.balance)}`,
      M, 80
    );

    // Colors matching the on-screen statement: debit green, credit purple, negative balance red.
    const GREEN = [21, 128, 61], PURPLE = [126, 34, 206], RED = [220, 38, 38];

    const body = [
      [
        { content: 'Opening Balance', colSpan: 6, styles: { fontStyle: 'bold', halign: 'left', fillColor: [249, 250, 251] } },
        { content: money(data.opening), styles: { halign: 'center', fontStyle: 'bold', fillColor: [249, 250, 251] } }
      ],
      ...data.rows.map(r => [
        formatDate(r.date),
        `${r.credit > 0 ? 'Cr' : 'Dr'}  ${r.narration || '-'}`,
        r.remark || '-',
        r.type || '',
        r.debit ? money(r.debit) : '',
        r.credit ? money(r.credit) : '',
        money(r.balance)
      ])
    ];

    autoTable(doc, {
      startY: 96,
      margin: { left: M, right: M },
      head: [['Date', 'Narration', 'Remark', 'Type', 'Debit', 'Credit', 'Balance']],
      body,
      foot: [[
        { content: 'Closing Balance', colSpan: 4, styles: { halign: 'left' } },
        money(data.totalDebit), money(data.totalCredit), money(data.closing)
      ]],
      styles: { fontSize: 8.5, cellPadding: 4, valign: 'top', halign: 'center' },
      headStyles: { fillColor: [243, 244, 246], textColor: 80, fontStyle: 'bold', halign: 'center' },
      footStyles: { fillColor: [243, 244, 246], textColor: 20, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 56 },
        2: { textColor: 120 },
        3: { textColor: 90 },
        4: { halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'center' }
      },
      didParseCell: (d) => {
        if (d.section !== 'body') return;
        if (d.column.index === 4) d.cell.styles.textColor = GREEN;   // Debit
        if (d.column.index === 5) d.cell.styles.textColor = PURPLE;  // Credit
        if (d.column.index === 6) {
          const r = data.rows[d.row.index - 1]; // row 0 is the Opening Balance row
          if (r && (r.balance || 0) < 0) d.cell.styles.textColor = RED;
        }
      }
    });

    doc.save(`ledger-${displayName || 'party'}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (!data && loading) return <div className="py-16 text-center text-gray-400">Loading…</div>;
  if (!data) return <div className="py-16 text-center text-gray-400">No ledger entries for this party.</div>;

  const s = data.summary || {};

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/ledger')} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-heading font-bold text-gray-800 text-2xl">{displayName}</h1>
            <p className="text-gray-500 text-sm">{data.partyPhone ? `${data.partyPhone} · ` : ''}{s.count || 0} transaction{(s.count || 0) === 1 ? '' : 's'}</p>
          </div>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="px-4 py-2 border border-red-500 text-red-500 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
          Add Ledger
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-5">
        {[['details', 'Ledger Information'], ['ledger', 'Ledger Transactions']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors ${
              tab === key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Ledger Information tab ── */}
      {tab === 'details' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatBlock icon={IndianRupee} label="Total Debit"  value={formatCurrency(s.totalDebit || 0)}  iconBg="bg-green-500" />
            <StatBlock icon={Wallet}      label="Total Credit" value={formatCurrency(s.totalCredit || 0)} iconBg="bg-purple-500" />
            <StatBlock icon={FileText}    label="Balance"      value={formatCurrency(s.balance || 0)}     iconBg="bg-blue-400" valueClass={s.balance < 0 ? 'text-red-600' : ''} />
            <StatBlock icon={CalendarClock} label="Last Transaction" value={s.lastDate ? formatDate(s.lastDate) : '—'} iconBg="bg-amber-400" />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-700 mb-3">Ledger Information</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
              {[
                ['Party Name', displayName],
                ['Phone', data.partyPhone || '—'],
                ['Total Transactions', s.count ?? 0],
                ['Total Debit', formatCurrency(s.totalDebit || 0)],
                ['Total Credit', formatCurrency(s.totalCredit || 0)],
                ['Balance (Credit − Debit)', formatCurrency(s.balance || 0)],
                ['First Transaction', s.firstDate ? formatDate(s.firstDate) : '—'],
                ['Last Transaction', s.lastDate ? formatDate(s.lastDate) : '—'],
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

      {/* ── Ledger Transactions tab ── */}
      {tab === 'ledger' && (
        <div>
          {/* Quick range presets */}
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <span className="text-xs text-gray-400 mr-1">Show:</span>
            {PRESETS.map(p => (
              <button key={p.label} type="button" onClick={() => applyPreset(p.days)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  isActivePreset(p.days) ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Filters + export */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="flex flex-wrap items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 bg-white">
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
              <Printer size={14} /> Download PDF
            </button>
          </div>

          {/* Ledger table */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {['Date', 'Narration', 'Remark', 'Type', 'Debit', 'Credit', 'Balance'].map((h) => (
                    <th key={h} className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap text-center">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading…</td></tr>
                ) : (
                  <>
                    <tr className="border-b border-gray-100">
                      <td className="py-2.5 px-4 text-gray-500 text-xs" colSpan={6}>Opening Balance</td>
                      <td className="py-2.5 px-4 text-center font-semibold text-gray-700">{formatCurrency(data.opening || 0)}</td>
                    </tr>
                    {data.rows.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-10 text-gray-400">No transactions in this range</td></tr>
                    ) : data.rows.map((r, i) => (
                      <tr key={r._id || i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-600 text-xs whitespace-nowrap align-top text-center">{formatDate(r.date)}</td>
                        <td className="py-3 px-4 text-gray-700 align-top text-center">
                          <span className={`mr-1.5 text-xs font-bold ${r.credit > 0 ? 'text-purple-600' : 'text-green-600'}`}>{r.credit > 0 ? 'Cr' : 'Dr'}</span>
                          {r.narration || '-'}
                        </td>
                        <td className="py-3 px-4 text-gray-500 text-xs align-top text-center">{r.remark || '-'}</td>
                        <td className="py-3 px-4 text-gray-600 align-top text-center">{r.type}</td>
                        <td className="py-3 px-4 text-center text-green-700 align-top">{r.debit ? formatCurrency(r.debit) : ''}</td>
                        <td className="py-3 px-4 text-center text-purple-700 align-top">{r.credit ? formatCurrency(r.credit) : ''}</td>
                        <td className="py-3 px-4 text-center font-medium text-gray-800 align-top">{formatCurrency(r.balance || 0)}</td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
              {!loading && (
                <tfoot>
                  <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                    <td className="py-3 px-4" colSpan={4}>Closing Balance</td>
                    <td className="py-3 px-4 text-center text-green-700">{formatCurrency(data.totalDebit || 0)}</td>
                    <td className="py-3 px-4 text-center text-purple-700">{formatCurrency(data.totalCredit || 0)}</td>
                    <td className="py-3 px-4 text-center text-gray-900">{formatCurrency(data.closing || 0)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">Balance = running total of Credit − Debit. Cr = credit entry, Dr = debit entry.</p>
        </div>
      )}

      {showAdd && (
        <LedgerModal
          presetParty={{ partyId: partyId || '', partyName: displayName, partyPhone: data.partyPhone || '' }}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load(); }}
        />
      )}
    </div>
  );
}
