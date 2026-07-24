import { useState, useCallback, useEffect } from 'react';
import { DateField } from '../../components/ui/DateField';
import { useNavigate } from 'react-router-dom';
import { Download, RefreshCw } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { reportsApi } from '../../api/reports';
import { mastersApi } from '../../api/masters';
import { useToast } from '../../components/ui/Toast';
import Pagination from '../../components/ui/Pagination';
import useAuthStore from '../../store/authStore';

/* ─── Config ──────────────────────────────────────────────── */
const REPORT_TYPES = [
  { value: 'jobcard-revenue',        label: 'Jobcard Revenue' },
  { value: 'counter-sale-revenue',   label: 'Counter Sale Revenue' },
  { value: 'customer-details',       label: 'Customer Details' },
  { value: 'pending-balance',        label: 'Pending Balance' },
  { value: 'spare-usages',           label: 'Spare Usages' },
  { value: 'job-usages',             label: 'Job Usages' },
  { value: 'lube-usages',            label: 'Lube Usages' },
  { value: 'counter-sale-usage',     label: 'Counter Sale Usage' },
  { value: 'vehicle',                label: 'Vehicle' },
  { value: 'mechanic',               label: 'Mechanic' },
  { value: 'services-due',           label: 'Services Due' },
  { value: 'recurring-customers',    label: 'Recurring Customers' },
  { value: 'inventory-summary',      label: 'Inventory Summary' },
  { value: 'profit',                 label: 'Profit' },
  { value: 'gst-jobcard',            label: 'Jobcard' },
  { value: 'gst-purchase-order',     label: 'Purchase Order' },
  { value: 'gst-counter-sale',       label: 'Counter Sale' },
  { value: 'csv-import-logs',        label: 'Inventory Import Logs' },
];

const DATE_PRESETS = [
  { label: '1 Week',   days: 7 },
  { label: '1 Month',  days: 30 },
  { label: '3 Months', days: 90 },
  { label: '6 Months', days: 180 },
  { label: '1 Year',   days: 365 },
];

const COLUMNS = {
  'jobcard-revenue':        ['Date','Close Date','Jobcard #','Service Type','Customer','Mobile','Vehicle','Chassis','Engine','Make/Model','Mechanic','Supervisor','Spare','Lube','Jobs','Total','Discount','Final','Received','Pending','Payment','Status'],
  'counter-sale-revenue':   ['Date','Counter #','Customer','Mobile','Vehicle','Chassis','Engine','Make/Model','Items','Spare','Lube','Total','Received','Pending','Payment'],
  'customer-details':       ['Customer','Mobile','Email','Status','Vehicles','Jobcards','Closed','Sales','Visits','Total Spend','Received','Pending','Today Paid','Avg Ticket','First Visit','Last Visit'],
  'pending-balance':        ['Date','Type','Source #','Customer','Mobile','Vehicle','Total','Paid','Pending','Age (days)'],
  'spare-usages':           ['Part Number','Part/Lube Name','Total Sold'],
  'lube-usages':            ['Part Number','Part/Lube Name','Total Sold'],
  'job-usages':             ['Date','Type','Source #','Customer','Mobile','Vehicle','Make/Model','Chassis','Engine','Item','Part #','Qty','Amount'],
  'counter-sale-usage':     ['Date','Category','Source #','Customer','Item','Part #','Qty','Amount'],
  'vehicle':                ['Vehicle No','Make/Model','Chassis','Engine','Customer','Mobile','Visits','Total Spend','Received','Pending','Last Visit','Next Visit'],
  'mechanic':               ['Mechanic','Jobs','Closed','Customers','Labour','Spare','Lube','Total Revenue','Received','Pending','Avg Ticket','Last Job'],
  'services-due':           ['Customer','Mobile','Vehicle No','Make/Model','Reminder Km','Reminder Period','Last Visit','Next Due','Status'],
  'recurring-customers':    ['Customer','Mobile','Vehicle Details','Vehicle No','Total Visits','First Visit','Last Visit','Pending'],
  'inventory-summary':      ['Item','Part #','Type','Stock','Lower Limit','Used','Job Used','Counter Used','Purchase ₹','Selling ₹','Stock Value','Status'],
  'profit':                 ['Date','Purchase','Sale','Profit','Pending'],
  'gst-jobcard':            ['Date','Jobcard #','Customer','Mobile','Vehicle','Spare','Lube','Labour','Subtotal','Discount','Bill','Received','Pending','Status'],
  'gst-purchase-order':     ['Date','PO #','Bill #','Supplier','Phone','Items','Subtotal','GST','Total','Paid','Balance','Status'],
  'gst-counter-sale':       ['Date','Counter #','Customer','Mobile','Vehicle','Items','Total','Received','Pending','Payment'],
  'csv-import-logs':        ['Sr No','Date & Time','Imported By','Type','CSV Name','Rows','Action'],
  'gst-counter-sale-hsn':   ['HSN','Description','Qty','Taxable','GST %','GST Amount'],
  'insurance-expiry':       ['Customer','Mobile','Vehicle No','Make/Model','Insurance Expiry'],
};

const CHART_TYPES = ['jobcard-revenue', 'counter-sale-revenue', 'pending-balance'];
const PIE_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];

/* Row-key order per column — drives CSV export + totals alignment.
   Only defined for the detailed per-record reports. */
const FIELD_KEYS = {
  'jobcard-revenue':      ['date','closedDate','jobcardNumber','typeLabel','customerName','customerMobile','vehicleNo','chassisNo','engineNo','vehicleDesc','mechanicName','supervisorName','spareTotal','lubeTotal','labourTotal','total','discount','billAmount','paidAmount','balanceDue','paymentStatus','statusLabel'],
  'counter-sale-revenue': ['date','counterNumber','customerName','customerMobile','vehicleNumber','chassisNo','engineNo','vehicleDesc','itemCount','spareTotal','lubeTotal','total','paidAmount','balanceDue','paymentStatus'],
  'customer-details':     ['name','mobile','email','status','vehicleCount','jobCount','closedJobs','saleCount','visits','totalSpend','received','pending','todayPaid','avgTicket','firstVisit','lastVisit'],
  'spare-usages':         ['partNumber','name','totalSold'],
  'lube-usages':          ['partNumber','name','totalSold'],
  'job-usages':           ['date','sourceType','sourceNumber','customerName','customerMobile','vehicleNo','vehicleDesc','chassisNo','engineNo','itemName','partNumber','qty','amount'],
  'counter-sale-usage':   ['date','itemCategory','sourceNumber','customerName','itemName','partNumber','qty','amount'],
  'vehicle':              ['vehicleNo','vehicleDesc','chassisNo','engineNo','customerName','customerMobile','visitCount','totalRevenue','received','pending','lastVisit','nextVisit'],
  'mechanic':             ['mechanicName','totalJobs','closedJobs','customers','totalLabour','spareTotal','lubeTotal','totalRevenue','received','pending','avgTicket','lastJob'],
  'inventory-summary':    ['name','partNumber','type','currentStock','lowerLimit','used','usedJob','usedCounter','purchasePrice','sellingPrice','stockValue','status'],
  'pending-balance':      ['date','sourceType','sourceNumber','customerName','customerMobile','vehicle','total','paid','pending','ageDays'],
  'services-due':         ['customerName','customerMobile','vehicleNo','vehicleDesc','reminderKm','reminderPeriod','lastVisit','nextDue','status'],
  'recurring-customers':  ['customerName','customerMobile','vehicleDesc','vehicleNo','visitCount','firstVisit','lastVisit','pending'],
  'profit':               ['date','purchase','sale','profit','pending'],
  'gst-jobcard':          ['date','jobcardNumber','customerName','customerMobile','vehicle','spareTotal','lubeTotal','labourTotal','subtotal','discount','billAmount','paidAmount','balanceDue','statusLabel'],
  'gst-purchase-order':   ['date','poNumber','billNumber','supplierName','supplierPhone','itemCount','subtotal','gstAmount','totalPayable','paidAmount','pendingAmount','status'],
  'gst-counter-sale':     ['date','counterNumber','customerName','customerMobile','vehicleNumber','itemCount','total','paidAmount','balanceDue','paymentStatus'],
  'csv-import-logs':      ['date','importedByName','itemType','fileName','insertedRows'],
};
const MONEY_KEYS = new Set(['spareTotal','lubeTotal','labourTotal','total','discount','billAmount','paidAmount','balanceDue','totalSpend','received','pending','todayPaid','amount','totalRevenue','stockValue','paid','subtotal','gstAmount','totalPayable','pendingAmount','purchase','sale','profit']);
const USAGE_TYPES = ['spare-usages','lube-usages','job-usages','counter-sale-usage'];
const DATE_MODAL_TYPES = ['jobcard-revenue','counter-sale-revenue'];

const CATEGORY_BADGE = {
  Spare:   'bg-blue-100 text-blue-700',
  Lube:    'bg-purple-100 text-purple-700',
  Labour:  'bg-amber-100 text-amber-700',
};
const CATEGORY_LABEL = { Spare: 'Spare', Lube: 'Lube', Labour: 'Job' };
const CATEGORY_OPTIONS = [
  { label: 'All Categories', value: 'All' },
  { label: 'Spare',          value: 'Spare' },
  { label: 'Lube',           value: 'Lube' },
  { label: 'Job',            value: 'Labour' },
];

const INV_TYPE_OPTIONS = ['All', 'Spare', 'Lube'];
const INV_STATUS_OPTIONS = [
  { label: 'All Stock',     value: 'all' },
  { label: 'In Stock',      value: 'in' },
  { label: 'Low (<10)',     value: 'low' },
  { label: 'Out of Stock',  value: 'out' },
];
const INV_SOURCE_OPTIONS = [
  { label: 'Any Channel',   value: 'all' },
  { label: 'Most via Jobcard',     value: 'jobcard' },
  { label: 'Most via Counter Sale', value: 'counter' },
];

/* Status filter — options + default per report type */
const STATUS_OPTIONS = {
  'jobcard-revenue':      ['All','Open','Completed','Closed'],
  'counter-sale-revenue': ['All','Paid','Partial','Unpaid'],
};
const DEFAULT_STATUS = { 'jobcard-revenue': 'All', 'counter-sale-revenue': 'All' };

const PAYMENT_BADGE = {
  Paid:    'bg-green-100 text-green-700',
  Partial: 'bg-amber-100 text-amber-700',
  Unpaid:  'bg-red-100 text-red-700',
};
const STATUS_BADGE = {
  Lead:     'bg-blue-100 text-blue-700',
  Active:   'bg-green-100 text-green-700',
  VIP:      'bg-purple-100 text-purple-700',
  Inactive: 'bg-gray-100 text-gray-500',
};

const INPUT_CLS = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

/* ─── Helpers ─────────────────────────────────────────────── */
function fmt(n) { return typeof n === 'number' ? n.toFixed(2) : (n || '—'); }
function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
// Profit report period key: "YYYY-MM" → "July 2026"; "YYYY-MM-DD" → dd/mm/yyyy (same as other tables).
function fmtProfitDate(s) {
  if (!s) return '—';
  if (/^\d{4}-\d{2}$/.test(s)) {
    const [y, m] = s.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }
  return fmtDate(s);
}
const isDateWiseKey = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
function fmtINR(n) { return `₹ ${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

function addDays(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function subtractDays(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
function todayStr() { return new Date().toISOString().slice(0, 10); }

/* ─── Row renderer per report type ────────────────────────── */
function renderRow(type, row, i, onDateClick, onOpenSource, onOpenItem) {
  const cls = 'px-4 py-2.5 text-sm text-gray-700 whitespace-nowrap';
  const DateCell = onDateClick ? (
    <td className={cls}>
      <button onClick={() => onDateClick(row.date)}
        className="text-blue-600 hover:underline font-medium">{fmtDate(row.date)}</button>
    </td>
  ) : <td className={cls}>{fmtDate(row.date)}</td>;
  const payBadge = (s) => <span className={`px-2 py-0.5 rounded text-xs font-medium ${PAYMENT_BADGE[s] || 'bg-gray-100 text-gray-600'}`}>{s}</span>;
  switch (type) {
    case 'jobcard-revenue':
      return <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
        {DateCell}
        <td className={cls}>{row.closedDate ? fmtDate(row.closedDate) : '—'}</td>
        <td className={cls + ' font-medium'}>{row.jobcardNumber}</td>
        <td className={cls}>{row.typeLabel || '—'}</td>
        <td className={cls}>{row.customerName || '—'}</td>
        <td className={cls}>{row.customerMobile || '—'}</td>
        <td className={cls}>{row.vehicleNo || '—'}</td>
        <td className={cls}>{row.chassisNo || '—'}</td>
        <td className={cls}>{row.engineNo || '—'}</td>
        <td className={cls}>{row.vehicleDesc || '—'}</td>
        <td className={cls}>{row.mechanicName || '—'}</td>
        <td className={cls}>{row.supervisorName || '—'}</td>
        <td className={cls}>{fmtINR(row.spareTotal)}</td>
        <td className={cls}>{fmtINR(row.lubeTotal)}</td>
        <td className={cls}>{fmtINR(row.labourTotal)}</td>
        <td className={cls}>{fmtINR(row.total)}</td>
        <td className={cls}>{fmtINR(row.discount)}</td>
        <td className={cls}>{fmtINR(row.billAmount)}</td>
        <td className={cls}>{fmtINR(row.paidAmount)}</td>
        <td className={cls + ' text-red-600 font-medium'}>{fmtINR(row.balanceDue)}</td>
        <td className={cls}>{payBadge(row.paymentStatus)}</td>
        <td className={cls}>{row.statusLabel || '—'}</td>
      </tr>;
    case 'counter-sale-revenue':
      return <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
        {DateCell}
        <td className={cls + ' font-medium'}>{row.counterNumber || '—'}</td>
        <td className={cls}>{row.customerName || '—'}</td>
        <td className={cls}>{row.customerMobile || '—'}</td>
        <td className={cls}>{row.vehicleNumber || '—'}</td>
        <td className={cls}>{row.chassisNo || '—'}</td>
        <td className={cls}>{row.engineNo || '—'}</td>
        <td className={cls}>{row.vehicleDesc || '—'}</td>
        <td className={cls}>{row.itemCount}</td>
        <td className={cls}>{fmtINR(row.spareTotal)}</td>
        <td className={cls}>{fmtINR(row.lubeTotal)}</td>
        <td className={cls}>{fmtINR(row.total)}</td>
        <td className={cls}>{fmtINR(row.paidAmount)}</td>
        <td className={cls + ' text-red-600'}>{fmtINR(row.balanceDue)}</td>
        <td className={cls}>{payBadge(row.paymentStatus)}</td>
      </tr>;
    case 'customer-details':
      return <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
        <td className={cls + ' font-medium'}>{row.name}</td>
        <td className={cls}>{row.mobile}</td>
        <td className={cls}>{row.email || '—'}</td>
        <td className={cls}>{row.status ? <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[row.status] || 'bg-gray-100 text-gray-600'}`}>{row.status}</span> : '—'}</td>
        <td className={cls}>{row.vehicleCount}</td>
        <td className={cls}>{row.jobCount}</td>
        <td className={cls}>{row.closedJobs}</td>
        <td className={cls}>{row.saleCount}</td>
        <td className={cls + ' font-medium'}>{row.visits}</td>
        <td className={cls}>{fmtINR(row.totalSpend)}</td>
        <td className={cls + ' text-green-600'}>{fmtINR(row.received)}</td>
        <td className={cls + ' text-red-600'}>{fmtINR(row.pending)}</td>
        <td className={cls + ' text-green-700 font-medium'}>{fmtINR(row.todayPaid)}</td>
        <td className={cls}>{fmtINR(row.avgTicket)}</td>
        <td className={cls}>{fmtDate(row.firstVisit)}</td>
        <td className={cls}>{fmtDate(row.lastVisit)}</td>
      </tr>;
    case 'pending-balance':
      return <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
        {DateCell}
        <td className={cls}>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${row.sourceType === 'Jobcard' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{row.sourceType}</span>
        </td>
        <td className={cls}>
          <button onClick={() => onOpenSource && onOpenSource(row.sourceType, row.sourceId)}
            className="text-blue-600 hover:underline font-medium">{row.sourceNumber || '—'}</button>
        </td>
        <td className={cls + ' font-medium'}>{row.customerName || '—'}</td>
        <td className={cls}>{row.customerMobile || '—'}</td>
        <td className={cls}>{row.vehicle || '—'}</td>
        <td className={cls}>{fmtINR(row.total)}</td>
        <td className={cls + ' text-green-600'}>{fmtINR(row.paid)}</td>
        <td className={cls + ' text-red-600 font-semibold'}>{fmtINR(row.pending)}</td>
        <td className={cls + (row.ageDays > 30 ? ' text-red-600 font-semibold' : '')}>{row.ageDays}</td>
      </tr>;
    case 'counter-sale-usage':
      return <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
        {DateCell}
        <td className={cls}>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_BADGE[row.itemCategory] || 'bg-gray-100 text-gray-600'}`}>{CATEGORY_LABEL[row.itemCategory] || row.itemCategory || '—'}</span>
        </td>
        <td className={cls}>
          <button onClick={() => onOpenSource && onOpenSource(row.sourceType, row.sourceId)}
            className="text-blue-600 hover:underline font-medium">{row.sourceNumber || '—'}</button>
        </td>
        <td className={cls}>{row.customerName || '—'}</td>
        <td className={cls + ' font-medium'}>{row.itemName || '—'}</td>
        <td className={cls}>{row.partNumber || '—'}</td>
        <td className={cls}>{row.qty}</td>
        <td className={cls}>{fmtINR(row.amount)}</td>
      </tr>;
    case 'spare-usages':
    case 'lube-usages':
      return <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
        <td className={cls}>
          <button onClick={() => onOpenItem && onOpenItem(row)}
            className="text-blue-600 hover:underline font-medium">{row.partNumber || row.name || '—'}</button>
        </td>
        <td className={cls + ' font-medium'}>{row.name || '—'}</td>
        <td className={cls}>{row.totalSold}</td>
      </tr>;
    case 'job-usages':
      return <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
        {DateCell}
        <td className={cls}>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${row.sourceType === 'Jobcard' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{row.sourceType}</span>
        </td>
        <td className={cls}>
          <button onClick={() => onOpenSource && onOpenSource(row.sourceType, row.sourceId)}
            className="text-blue-600 hover:underline font-medium">{row.sourceNumber || '—'}</button>
        </td>
        <td className={cls}>{row.customerName || '—'}</td>
        <td className={cls}>{row.customerMobile || '—'}</td>
        <td className={cls}>{row.vehicleNo || '—'}</td>
        <td className={cls}>{row.vehicleDesc || '—'}</td>
        <td className={cls}>{row.chassisNo || '—'}</td>
        <td className={cls}>{row.engineNo || '—'}</td>
        <td className={cls + ' font-medium'}>{row.itemName || '—'}</td>
        <td className={cls}>{row.partNumber || '—'}</td>
        <td className={cls}>{row.qty}</td>
        <td className={cls}>{fmtINR(row.amount)}</td>
      </tr>;
    case 'profit':
      return <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
        <td className={cls + ' font-medium'}>
          {onDateClick && isDateWiseKey(row.date)
            ? <button onClick={() => onDateClick(row.date)} className="text-blue-600 hover:underline font-medium">{fmtProfitDate(row.date)}</button>
            : fmtProfitDate(row.date)}
        </td>
        <td className={cls + ' text-amber-700'}>{fmtINR(row.purchase)}</td>
        <td className={cls + ' text-blue-700'}>{fmtINR(row.sale)}</td>
        <td className={cls + ' font-semibold ' + (row.profit >= 0 ? 'text-green-600' : 'text-red-600')}>{fmtINR(row.profit)}</td>
        <td className={cls + ' text-red-600'}>{fmtINR(row.pending)}</td>
      </tr>;
    case 'vehicle': {
      const overdue = row.nextVisit && new Date(row.nextVisit) < new Date();
      return <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
        <td className={cls + ' font-medium'}>{row.vehicleNo || '—'}</td>
        <td className={cls}>{row.vehicleDesc || '—'}</td>
        <td className={cls}>{row.chassisNo || '—'}</td>
        <td className={cls}>{row.engineNo || '—'}</td>
        <td className={cls}>{row.customerName || '—'}</td>
        <td className={cls}>{row.customerMobile || '—'}</td>
        <td className={cls}>{row.visitCount}</td>
        <td className={cls}>{fmtINR(row.totalRevenue)}</td>
        <td className={cls + ' text-green-600'}>{fmtINR(row.received)}</td>
        <td className={cls + ' text-red-600'}>{fmtINR(row.pending)}</td>
        <td className={cls}>{fmtDate(row.lastVisit)}</td>
        <td className={cls + ' text-red-600' + (overdue ? ' font-bold' : '')}>{row.nextVisit ? fmtDate(row.nextVisit) + (overdue ? ' (due)' : '') : '—'}</td>
      </tr>;
    }
    case 'mechanic':
      return <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
        <td className={cls + ' font-medium'}>{row.mechanicName}</td>
        <td className={cls}>{row.totalJobs}</td>
        <td className={cls}>{row.closedJobs}</td>
        <td className={cls}>{row.customers}</td>
        <td className={cls}>{fmtINR(row.totalLabour)}</td>
        <td className={cls}>{fmtINR(row.spareTotal)}</td>
        <td className={cls}>{fmtINR(row.lubeTotal)}</td>
        <td className={cls + ' font-medium'}>{fmtINR(row.totalRevenue)}</td>
        <td className={cls + ' text-green-600'}>{fmtINR(row.received)}</td>
        <td className={cls + ' text-red-600'}>{fmtINR(row.pending)}</td>
        <td className={cls}>{fmtINR(row.avgTicket)}</td>
        <td className={cls}>{fmtDate(row.lastJob)}</td>
      </tr>;
    case 'services-due': {
      const sBadge = row.status === 'Overdue' ? 'bg-red-100 text-red-700' : row.status === 'Upcoming' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500';
      return <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
        <td className={cls + ' font-medium'}>{row.customerName || '—'}</td>
        <td className={cls}>{row.customerMobile || '—'}</td>
        <td className={cls}>{row.vehicleNo || '—'}</td>
        <td className={cls}>{row.vehicleDesc || '—'}</td>
        <td className={cls}>{row.reminderKm || '—'}</td>
        <td className={cls}>{row.reminderPeriod || '—'}</td>
        <td className={cls}>{fmtDate(row.lastVisit)}</td>
        <td className={cls + (row.status === 'Overdue' ? ' text-red-600 font-semibold' : '')}>{row.nextDue ? fmtDate(row.nextDue) : '—'}</td>
        <td className={cls}><span className={`px-2 py-0.5 rounded text-xs font-medium ${sBadge}`}>{row.status}</span></td>
      </tr>;
    }
    case 'recurring-customers':
      return <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
        <td className={cls + ' font-medium'}>{row.customerName || '—'}</td>
        <td className={cls}>{row.customerMobile || '—'}</td>
        <td className={cls}>{row.vehicleDesc || '—'}</td>
        <td className={cls}>{row.vehicleNo || '—'}</td>
        <td className={cls + ' font-medium'}>{row.visitCount}</td>
        <td className={cls}>{fmtDate(row.firstVisit)}</td>
        <td className={cls}>{fmtDate(row.lastVisit)}</td>
        <td className={cls + ' text-red-600'}>{fmtINR(row.pending)}</td>
      </tr>;
    case 'inventory-summary': {
      const stockBg = row.status === 'Out of Stock' ? 'bg-red-50' : row.status === 'Low' ? 'bg-amber-50' : '';
      const statusBadge = row.status === 'Out of Stock'
        ? 'bg-red-100 text-red-700'
        : row.status === 'Low' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700';
      return <tr key={i} className={`border-t border-gray-100 hover:bg-gray-50 ${stockBg}`}>
        <td className={cls + ' font-medium'}>{row.name}</td>
        <td className={cls}>
          <button onClick={() => onOpenItem && onOpenItem(row)}
            className="text-blue-600 hover:underline font-medium">{row.partNumber || row.name || '—'}</button>
        </td>
        <td className={cls}><span className={`px-2 py-0.5 rounded text-xs font-medium ${row.type === 'Spare' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{row.type}</span></td>
        <td className={cls + (row.currentStock <= 0 ? ' text-red-600 font-semibold' : '')}>{row.currentStock}</td>
        <td className={cls}>{row.lowerLimit}</td>
        <td className={cls + ' font-medium'}>{row.used}</td>
        <td className={cls + ' text-blue-700'}>{row.usedJob}</td>
        <td className={cls + ' text-purple-700'}>{row.usedCounter}</td>
        <td className={cls}>{fmtINR(row.purchasePrice)}</td>
        <td className={cls}>{fmtINR(row.sellingPrice)}</td>
        <td className={cls}>{fmtINR(row.stockValue)}</td>
        <td className={cls}><span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge}`}>{row.status}</span></td>
      </tr>;
    }
    case 'gst-jobcard':
      return <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
        {DateCell}
        <td className={cls}>
          <button onClick={() => onOpenSource && onOpenSource('Jobcard', row.sourceId)}
            className="text-blue-600 hover:underline font-medium">{row.jobcardNumber || '—'}</button>
        </td>
        <td className={cls}>{row.customerName || '—'}</td>
        <td className={cls}>{row.customerMobile || '—'}</td>
        <td className={cls}>{row.vehicle || '—'}</td>
        <td className={cls}>{fmtINR(row.spareTotal)}</td>
        <td className={cls}>{fmtINR(row.lubeTotal)}</td>
        <td className={cls}>{fmtINR(row.labourTotal)}</td>
        <td className={cls}>{fmtINR(row.subtotal)}</td>
        <td className={cls}>{fmtINR(row.discount)}</td>
        <td className={cls + ' font-medium'}>{fmtINR(row.billAmount)}</td>
        <td className={cls + ' text-green-600'}>{fmtINR(row.paidAmount)}</td>
        <td className={cls + ' text-red-600'}>{fmtINR(row.balanceDue)}</td>
        <td className={cls}>{row.statusLabel || '—'}</td>
      </tr>;
    case 'gst-purchase-order': {
      const poBadge = { Received: 'bg-green-100 text-green-700', Closed: 'bg-gray-100 text-gray-600', Placed: 'bg-blue-100 text-blue-700', Open: 'bg-amber-100 text-amber-700' }[row.status] || 'bg-gray-100 text-gray-500';
      return <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
        {DateCell}
        <td className={cls + ' font-medium'}>{row.poNumber || '—'}</td>
        <td className={cls}>{row.billNumber || '—'}</td>
        <td className={cls}>{row.supplierName || '—'}</td>
        <td className={cls}>{row.supplierPhone || '—'}</td>
        <td className={cls}>{row.itemCount}</td>
        <td className={cls}>{fmtINR(row.subtotal)}</td>
        <td className={cls + ' text-blue-600'}>{fmtINR(row.gstAmount)}</td>
        <td className={cls + ' font-medium'}>{fmtINR(row.totalPayable)}</td>
        <td className={cls + ' text-green-600'}>{fmtINR(row.paidAmount)}</td>
        <td className={cls + ' text-red-600'}>{fmtINR(row.pendingAmount)}</td>
        <td className={cls}><span className={`px-2 py-0.5 rounded text-xs font-medium ${poBadge}`}>{row.status || '—'}</span></td>
      </tr>;
    }
    case 'gst-counter-sale':
      return <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
        {DateCell}
        <td className={cls}>
          <button onClick={() => onOpenSource && onOpenSource('Counter Sale', row.sourceId)}
            className="text-blue-600 hover:underline font-medium">{row.counterNumber || '—'}</button>
        </td>
        <td className={cls}>{row.customerName || '—'}</td>
        <td className={cls}>{row.customerMobile || '—'}</td>
        <td className={cls}>{row.vehicleNumber || '—'}</td>
        <td className={cls}>{row.itemCount}</td>
        <td className={cls + ' font-medium'}>{fmtINR(row.total)}</td>
        <td className={cls + ' text-green-600'}>{fmtINR(row.paidAmount)}</td>
        <td className={cls + ' text-red-600'}>{fmtINR(row.balanceDue)}</td>
        <td className={cls}>{payBadge(row.paymentStatus)}</td>
      </tr>;
    case 'csv-import-logs': {
      const token = localStorage.getItem('ttn_token');
      const base = import.meta.env.VITE_API_URL || '/api';
      const href = `${base}/inventory/import-logs/${row._id}/download?token=${encodeURIComponent(token || '')}`;
      const dt = row.date
        ? new Date(row.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
        : '—';
      return <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
        <td className={cls}>{i + 1}</td>
        <td className={cls}>{dt}</td>
        <td className={cls}>{row.importedByName} <span className="text-xs text-gray-400">({row.importedByType})</span></td>
        <td className={cls}><span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">{row.itemType}</span></td>
        <td className={cls}>{row.fileName}</td>
        <td className={cls}>{row.insertedRows}{row.totalRows ? ` / ${row.totalRows}` : ''}</td>
        <td className={cls}><a href={href} className="text-blue-600 hover:underline font-medium">Download</a></td>
      </tr>;
    }
    default:
      return <tr key={i} className="border-t border-gray-100"><td colSpan={10} className="px-4 py-2 text-gray-400 text-sm">—</td></tr>;
  }
}

/* ─── Summary panel ───────────────────────────────────────── */
function SummaryPanel({ type, summary, data }) {
  if (!summary) return null;

  /* Pie chart for revenue reports */
  if (type === 'jobcard-revenue' && summary) {
    const pieData = [
      { name: 'Discount',        value: summary.discount  || 0 },
      { name: 'Pending Balance', value: summary.pending   || 0 },
      { name: 'Received',        value: summary.received  || 0 },
    ].filter(d => d.value > 0);

    return (
      <div>
        <p className="font-semibold text-gray-700 mb-3">Report Details</p>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500">Jobcards:</span>
          <span className="font-semibold">{summary.count ?? data.length}</span>
        </div>
        <div className="space-y-1.5 text-sm mb-4">
          {[
            ['Total Labour',  summary.totalLabour],
            ['Total Spare',   summary.totalSpare],
            ['Total Lubes',   summary.totalLube],
            ['Total',         summary.total],
            ['Total Discount', summary.discount],
            ['Total Received', summary.received],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between">
              <span className="text-gray-500">{label}:</span>
              <span className="font-medium">{fmtINR(val)}</span>
            </div>
          ))}
          <div className="flex justify-between pt-1 border-t border-gray-200">
            <span className="text-red-600 font-semibold">Pending Bal:</span>
            <span className="text-red-600 font-bold">{fmtINR(summary.pending)}</span>
          </div>
        </div>
        {pieData.length > 0 && (
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={60} innerRadius={30}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => fmtINR(v)} />
              <Legend iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    );
  }

  if (type === 'counter-sale-revenue') {
    const pieData = [
      { name: 'Received', value: summary.received || 0 },
      { name: 'Pending',  value: summary.pending  || 0 },
    ].filter(d => d.value > 0);
    return (
      <div>
        <p className="font-semibold text-gray-700 mb-3">Report Details</p>
        <div className="space-y-1.5 text-sm mb-4">
          <div className="flex justify-between"><span className="text-gray-500">Total Sales:</span><span className="font-medium">{summary.count}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Total Spare:</span><span className="font-medium">{fmtINR(summary.totalSpare)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Total Lubes:</span><span className="font-medium">{fmtINR(summary.totalLube)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Total Revenue:</span><span className="font-medium">{fmtINR(summary.total)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Received:</span><span className="font-medium text-green-600">{fmtINR(summary.received)}</span></div>
          <div className="flex justify-between border-t border-gray-200 pt-1"><span className="text-red-600 font-semibold">Pending:</span><span className="font-bold text-red-600">{fmtINR(summary.pending)}</span></div>
        </div>
        {pieData.length > 0 && (
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={60} innerRadius={30}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => fmtINR(v)} />
              <Legend iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    );
  }

  if (type === 'pending-balance' && summary.top5) {
    return (
      <div>
        <p className="font-semibold text-gray-700 mb-1">Report Details</p>
        <p className="text-xs text-gray-400 mb-3">Top 5 Customer's Pending Balance</p>
        <div className="text-xs">
          <div className="grid grid-cols-3 gap-2 font-semibold text-gray-500 pb-1 border-b border-gray-200 mb-1">
            <span>Customer</span><span className="text-right">Invoice</span><span className="text-right">Balance</span>
          </div>
          {summary.top5.map((r, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 py-1 border-b border-gray-100">
              <span className="truncate font-medium">{r.customerName}</span>
              <span className="text-right">{fmtINR(r.total)}</span>
              <span className="text-right text-red-600 font-semibold">{fmtINR(r.pendingBalance)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-2 border-t border-gray-200 text-sm flex justify-between">
          <span className="text-gray-500">Total Pending</span>
          <span className="font-bold text-red-600">{fmtINR(summary.totalPending)}</span>
        </div>
      </div>
    );
  }

  if (type === 'inventory-summary') {
    return (
      <div>
        <p className="font-semibold text-gray-700 mb-3">Inventory KPIs</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-gray-50 rounded-lg px-2 py-2 text-center">
            <p className="text-xs text-gray-400">Items</p>
            <p className="text-lg font-bold text-gray-800">{summary.totalItems}</p>
          </div>
          <div className="bg-amber-50 rounded-lg px-2 py-2 text-center">
            <p className="text-xs text-amber-500">Low</p>
            <p className="text-lg font-bold text-amber-600">{summary.lowStock}</p>
          </div>
          <div className="bg-red-50 rounded-lg px-2 py-2 text-center">
            <p className="text-xs text-red-500">Out</p>
            <p className="text-lg font-bold text-red-600">{summary.outOfStock}</p>
          </div>
        </div>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Total Units:</span><span className="font-medium">{summary.totalUnits}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Stock Value:</span><span className="font-medium">{fmtINR(summary.stockValue)}</span></div>
          <div className="flex justify-between border-t border-gray-200 pt-1"><span className="text-green-700 font-semibold">Potential Sale:</span><span className="font-bold text-green-700">{fmtINR(summary.potentialValue)}</span></div>
        </div>
      </div>
    );
  }

  if (type === 'profit') {
    const profitPos = (summary.profit || 0) >= 0;
    return (
      <div>
        <p className="font-semibold text-gray-700 mb-3">Profit Summary</p>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Periods:</span><span className="font-medium">{summary.periods}</span></div>
          <div className="flex justify-between"><span className="text-amber-700">Total Purchase:</span><span className="font-medium text-amber-700">{fmtINR(summary.purchase)}</span></div>
          <div className="flex justify-between"><span className="text-blue-700">Total Sale:</span><span className="font-medium text-blue-700">{fmtINR(summary.sale)}</span></div>
          <div className="flex justify-between border-t border-gray-200 pt-1"><span className={`font-semibold ${profitPos ? 'text-green-700' : 'text-red-600'}`}>Total Profit:</span><span className={`font-bold ${profitPos ? 'text-green-700' : 'text-red-600'}`}>{fmtINR(summary.profit)}</span></div>
          <div className="flex justify-between"><span className="text-red-600">Pending:</span><span className="font-medium text-red-600">{fmtINR(summary.pending)}</span></div>
        </div>
      </div>
    );
  }

  if (type === 'gst-purchase-order') {
    return (
      <div>
        <p className="font-semibold text-gray-700 mb-3">Purchase Summary</p>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Orders:</span><span className="font-medium">{summary.count}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Subtotal:</span><span className="font-medium">{fmtINR(summary.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-blue-600">GST Amount:</span><span className="font-semibold text-blue-600">{fmtINR(summary.gstAmount)}</span></div>
          <div className="flex justify-between"><span className="font-semibold">Total Payable:</span><span className="font-bold">{fmtINR(summary.totalPayable)}</span></div>
          <div className="flex justify-between"><span className="text-green-600">Paid:</span><span className="font-medium text-green-600">{fmtINR(summary.paid)}</span></div>
          <div className="flex justify-between border-t border-gray-200 pt-1"><span className="text-red-600 font-semibold">Balance:</span><span className="font-bold text-red-600">{fmtINR(summary.pending)}</span></div>
        </div>
      </div>
    );
  }

  if (type === 'services-due') {
    return (
      <div>
        <p className="font-semibold text-gray-700 mb-3">Services Due</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-50 rounded-lg px-2 py-2 text-center"><p className="text-xs text-gray-400">Total</p><p className="text-lg font-bold text-gray-800">{summary.total}</p></div>
          <div className="bg-red-50 rounded-lg px-2 py-2 text-center"><p className="text-xs text-red-500">Overdue</p><p className="text-lg font-bold text-red-600">{summary.overdue}</p></div>
          <div className="bg-amber-50 rounded-lg px-2 py-2 text-center"><p className="text-xs text-amber-500">Upcoming</p><p className="text-lg font-bold text-amber-600">{summary.upcoming}</p></div>
        </div>
      </div>
    );
  }

  if (type === 'recurring-customers') {
    return (
      <div>
        <p className="font-semibold text-gray-700 mb-3">Recurring Customers</p>
        <div className="bg-gray-50 rounded-lg px-3 py-2 mb-3"><p className="text-xs text-gray-400">Customers</p><p className="text-lg font-bold text-gray-800">{summary.customers ?? data.length}</p></div>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Total Revenue:</span><span className="font-medium">{fmtINR(summary.totalRevenue)}</span></div>
          <div className="flex justify-between"><span className="text-green-600">Received:</span><span className="font-medium text-green-600">{fmtINR(summary.totalReceived)}</span></div>
          <div className="flex justify-between border-t border-gray-200 pt-1"><span className="text-red-600 font-semibold">Pending:</span><span className="font-bold text-red-600">{fmtINR(summary.totalPending)}</span></div>
        </div>
      </div>
    );
  }

  if (type === 'gst-jobcard') {
    return (
      <div>
        <p className="font-semibold text-gray-700 mb-3">Jobcard Billing</p>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Jobcards:</span><span className="font-medium">{summary.count}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Subtotal:</span><span className="font-medium">{fmtINR(summary.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Discount:</span><span className="font-medium">{fmtINR(summary.discount)}</span></div>
          <div className="flex justify-between"><span className="font-semibold">Bill Amount:</span><span className="font-bold">{fmtINR(summary.billAmount)}</span></div>
          <div className="flex justify-between"><span className="text-green-600">Received:</span><span className="font-medium text-green-600">{fmtINR(summary.received)}</span></div>
          <div className="flex justify-between border-t border-gray-200 pt-1"><span className="text-red-600 font-semibold">Pending:</span><span className="font-bold text-red-600">{fmtINR(summary.pending)}</span></div>
        </div>
      </div>
    );
  }

  if (type === 'gst-counter-sale') {
    return (
      <div>
        <p className="font-semibold text-gray-700 mb-3">Counter Sale Billing</p>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Sales:</span><span className="font-medium">{summary.count}</span></div>
          <div className="flex justify-between"><span className="font-semibold">Total:</span><span className="font-bold">{fmtINR(summary.total)}</span></div>
          <div className="flex justify-between"><span className="text-green-600">Received:</span><span className="font-medium text-green-600">{fmtINR(summary.received)}</span></div>
          <div className="flex justify-between border-t border-gray-200 pt-1"><span className="text-red-600 font-semibold">Pending:</span><span className="font-bold text-red-600">{fmtINR(summary.pending)}</span></div>
        </div>
      </div>
    );
  }

  if (type === 'mechanic') {
    return (
      <div>
        <p className="font-semibold text-gray-700 mb-3">Mechanic Summary</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-400">Mechanics</p>
            <p className="text-lg font-bold text-gray-800">{summary.mechanics ?? data.length}</p>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-400">Total Jobs</p>
            <p className="text-lg font-bold text-gray-800">{summary.totalJobs}</p>
          </div>
        </div>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Total Revenue:</span><span className="font-medium">{fmtINR(summary.totalRevenue)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Received:</span><span className="font-medium text-green-600">{fmtINR(summary.totalReceived)}</span></div>
          <div className="flex justify-between border-t border-gray-200 pt-1"><span className="text-red-600 font-semibold">Pending:</span><span className="font-bold text-red-600">{fmtINR(summary.totalPending)}</span></div>
        </div>
      </div>
    );
  }

  if (type === 'vehicle') {
    return (
      <div>
        <p className="font-semibold text-gray-700 mb-3">Vehicle Summary</p>
        <div className="bg-gray-50 rounded-lg px-3 py-2 mb-3">
          <p className="text-xs text-gray-400">Vehicles</p>
          <p className="text-lg font-bold text-gray-800">{summary.vehicles ?? data.length}</p>
        </div>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Total Revenue:</span><span className="font-medium">{fmtINR(summary.totalRevenue)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Received:</span><span className="font-medium text-green-600">{fmtINR(summary.totalReceived)}</span></div>
          <div className="flex justify-between border-t border-gray-200 pt-1"><span className="text-red-600 font-semibold">Pending:</span><span className="font-bold text-red-600">{fmtINR(summary.totalPending)}</span></div>
        </div>
      </div>
    );
  }

  if (USAGE_TYPES.includes(type)) {
    return (
      <div>
        <p className="font-semibold text-gray-700 mb-3">Usage Summary</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-400">Records</p>
            <p className="text-lg font-bold text-gray-800">{summary.occurrences ?? data.length}</p>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-400">Distinct Items</p>
            <p className="text-lg font-bold text-gray-800">{summary.items ?? '—'}</p>
          </div>
        </div>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Total Qty:</span><span className="font-medium">{summary.totalQty}</span></div>
          <div className="flex justify-between border-t border-gray-200 pt-1"><span className="font-semibold">Total Amount:</span><span className="font-bold">{fmtINR(summary.totalAmount)}</span></div>
        </div>
      </div>
    );
  }

  if (type === 'customer-details') {
    return (
      <div>
        <p className="font-semibold text-gray-700 mb-3">Customer KPIs</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            ['Customers', summary.totalCustomers, 'text-gray-800'],
            ['Active',    summary.activeCustomers, 'text-green-600'],
            ['With Dues', summary.withDues, 'text-red-600'],
          ].map(([l, v, c]) => (
            <div key={l} className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-400">{l}</p>
              <p className={`text-lg font-bold ${c}`}>{v}</p>
            </div>
          ))}
        </div>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Total Revenue:</span><span className="font-medium">{fmtINR(summary.totalRevenue)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Received:</span><span className="font-medium text-green-600">{fmtINR(summary.totalReceived)}</span></div>
          <div className="flex justify-between"><span className="text-red-600 font-semibold">Pending:</span><span className="font-bold text-red-600">{fmtINR(summary.totalPending)}</span></div>
          <div className="flex justify-between border-t border-gray-200 pt-1"><span className="text-green-700 font-semibold">Today Collected:</span><span className="font-bold text-green-700">{fmtINR(summary.todayCollected)}</span></div>
        </div>
      </div>
    );
  }

  if (type === 'csv-import-logs') {
    return (
      <div>
        <p className="font-semibold text-gray-700 mb-3">Import Summary</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-center"><p className="text-xs text-gray-400">Imports</p><p className="text-lg font-bold text-gray-800">{summary.imports ?? data.length}</p></div>
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-center"><p className="text-xs text-gray-400">Rows Inserted</p><p className="text-lg font-bold text-gray-800">{summary.rowsInserted ?? 0}</p></div>
        </div>
      </div>
    );
  }

  /* Generic summary */
  const entries = Object.entries(summary || {}).filter(([k]) => !['top5'].includes(k));
  if (!entries.length) return <div><p className="font-semibold text-gray-700 mb-2">Report Details</p><p className="text-gray-400 text-sm">No summary data</p></div>;
  return (
    <div>
      <p className="font-semibold text-gray-700 mb-3">Report Details</p>
      <div className="space-y-1.5 text-sm">
        {entries.map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <span className="text-gray-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span>
            <span className="font-medium">{typeof v === 'number' ? fmtINR(v) : v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── CSV export ──────────────────────────────────────────── */
function csvCell(v) {
  if (v == null) return '';
  if (v instanceof Date || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v))) return fmtDate(v);
  if (typeof v === 'number') return v.toFixed(2);
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return `"${String(v).replace(/"/g, '""')}"`;
}
function exportCSV(type, data, columns, meta = []) {
  if (!data.length) return;
  const keys = FIELD_KEYS[type];                  // explicit column→key order when known
  const lines = [];

  // Filter preamble — documents which filters produced this export
  meta.forEach(([k, v]) => lines.push(`${csvCell(k)},${csvCell(v)}`));
  if (meta.length) lines.push('');                // blank separator row

  lines.push(columns.join(','));                  // header
  data.forEach(row => {
    const vals = keys
      ? keys.map(k => csvCell(row[k]))
      : Object.values(row).map(csvCell);          // fallback for legacy report types
    lines.push(vals.join(','));
  });

  // Totals row (money columns) — mirrors on-screen footer
  if (keys && keys.some(k => MONEY_KEYS.has(k))) {
    lines.push(keys.map((k, i) => {
      if (i === 0) return csvCell('Total');
      return MONEY_KEYS.has(k) ? data.reduce((s, r) => s + (r[k] || 0), 0).toFixed(2) : '';
    }).join(','));
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${type}-${todayStr()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Totals row ──────────────────────────────────────────── */
function TotalsRow({ type, data }) {
  if (!data.length) return null;

  /* Column-aligned totals for per-record reports (uses FIELD_KEYS order) */
  const keys = FIELD_KEYS[type];
  if (keys) {
    if (!keys.some(k => MONEY_KEYS.has(k))) return null;
    return (
      <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
        {keys.map((k, i) => {
          if (i === 0) return <td key={i} className="px-4 py-2.5 text-sm text-gray-700">Total</td>;
          if (MONEY_KEYS.has(k)) {
            const t = data.reduce((s, r) => s + (r[k] || 0), 0);
            return <td key={i} className="px-4 py-2.5 text-sm text-gray-800">{fmtINR(t)}</td>;
          }
          return <td key={i} />;
        })}
      </tr>
    );
  }

  const moneyFields = {
    'jobcard-revenue': ['spareTotal','lubeTotal','inHouseLabour','outsourcedLabour','total','discount','finalAmount','received','pending'],
    'counter-sale-revenue': ['total','received','pending'],
    'pending-balance': ['total','pendingBalance'],
    'spare-usages': ['amount'], 'lube-usages': ['amount'], 'job-usages': ['amount'],
    'counter-sale-usage': ['amount'], 'vehicle': ['totalRevenue'],
    'gst-purchase-order': ['subtotal','gstAmount','totalPayable'],
    'gst-jobcard': ['subtotal','discount','billAmount'],
    'gst-counter-sale': ['total'],
    'gst-purchase-order-hsn': ['taxableValue','gstAmount'],
  };
  const fields = moneyFields[type] || [];
  if (!fields.length) return null;

  const totals = {};
  fields.forEach(f => { totals[f] = data.reduce((s, r) => s + (r[f] || 0), 0); });

  const colCount = (COLUMNS[type] || []).length;
  return (
    <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
      <td className="px-4 py-2.5 text-sm text-gray-700">Total</td>
      {Object.values(totals).map((v, i) => (
        <td key={i} className="px-4 py-2.5 text-sm text-gray-800">{fmtINR(v)}</td>
      ))}
      {Array.from({ length: colCount - 1 - Object.values(totals).length }).map((_, i) => <td key={`e${i}`} />)}
    </tr>
  );
}

/* ─── Day drill-down modal ────────────────────────────────── */
function DayModal({ type, date, data, onClose }) {
  if (!date) return null;
  const day  = String(date).slice(0, 10);
  const rows = data.filter(r => String(r.date).slice(0, 10) === day);
  const isJob = type === 'jobcard-revenue';
  const heads = isJob
    ? ['Jobcard #', 'Customer', 'Vehicle', 'Final', 'Received', 'Pending', 'Status']
    : ['Counter #', 'Customer', 'Vehicle', 'Total', 'Received', 'Pending', 'Payment'];
  const sum = f => rows.reduce((s, r) => s + (r[f] || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <p className="font-semibold text-gray-800">{isJob ? 'Jobcards' : 'Counter Sales'} · {fmtDate(date)}</p>
            <p className="text-xs text-gray-400">{rows.length} record{rows.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm min-w-max">
            <thead>
              <tr className="border-b border-gray-200">
                {heads.map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-medium whitespace-nowrap">{isJob ? r.jobcardNumber : r.counterNumber}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{r.customerName || '—'}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{(isJob ? [r.vehicleNo, r.vehicleDesc].filter(Boolean).join(' ') : r.vehicleNumber) || '—'}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{fmtINR(isJob ? r.billAmount : r.total)}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{fmtINR(r.paidAmount)}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-red-600">{fmtINR(r.balanceDue)}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{isJob ? (r.statusLabel || '—') : r.paymentStatus}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                <td className="px-4 py-2.5" colSpan={3}>Total</td>
                <td className="px-4 py-2.5">{fmtINR(sum(isJob ? 'billAmount' : 'total'))}</td>
                <td className="px-4 py-2.5">{fmtINR(sum('paidAmount'))}</td>
                <td className="px-4 py-2.5 text-red-600">{fmtINR(sum('balanceDue'))}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Profit day drill-down: what was received on a given date ── */
function ProfitDayModal({ date, records, onClose }) {
  if (!date) return null;
  const day  = String(date).slice(0, 10);
  const rows = (records || []).filter(r => String(r.date).slice(0, 10) === day);
  const sum  = f => rows.reduce((s, r) => s + (r[f] || 0), 0);
  const heads = ['Source', 'Number', 'Sale', 'Received', 'Pending'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <p className="font-semibold text-gray-800">Received · {fmtDate(date)}</p>
            <p className="text-xs text-gray-400">{rows.length} record{rows.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm min-w-max">
            <thead>
              <tr className="border-b border-gray-200">
                {heads.map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No records</td></tr>
              ) : rows.map((r, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-4 py-2 whitespace-nowrap">{r.sourceType}</td>
                  <td className="px-4 py-2 font-medium whitespace-nowrap">{r.number || '—'}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{fmtINR(r.sale)}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-green-700 font-medium">{fmtINR(r.received)}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-red-600">{fmtINR(r.pending)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                <td className="px-4 py-2.5" colSpan={2}>Total</td>
                <td className="px-4 py-2.5">{fmtINR(sum('sale'))}</td>
                <td className="px-4 py-2.5 text-green-700">{fmtINR(sum('received'))}</td>
                <td className="px-4 py-2.5 text-red-600">{fmtINR(sum('pending'))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Inventory item usage drill-down (part-number popup) ───── */
function ItemUsageModal({ item, fromDate, toDate, onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await reportsApi.fetch({
          type: 'item-usage', startDate: fromDate, endDate: toDate,
          item: item.name || '', partNumber: item.partNumber || '',
        });
        if (active) setRows(data.data || []);
      } catch { if (active) setRows([]); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [item, fromDate, toDate]);

  const totalQty = rows.reduce((s, r) => s + (r.qty || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <p className="font-semibold text-gray-800">{item.name}{item.partNumber ? ` · ${item.partNumber}` : ''}</p>
            <p className="text-xs text-gray-400">Usage {fmtDate(fromDate)} – {fmtDate(toDate)} · {rows.length} record{rows.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm min-w-max">
            <thead>
              <tr className="border-b border-gray-200">
                {['Date', 'Jobcard / Counter Sale No.', 'Vehicle No.', 'Quantity'].map(h =>
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No usage in this period</td></tr>
              ) : rows.map((r, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-4 py-2 whitespace-nowrap">{fmtDate(r.date)}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium mr-2 ${r.sourceType === 'Jobcard' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{r.sourceType}</span>
                    {r.sourceNumber || '—'}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">{r.vehicleNo || '—'}</td>
                  <td className="px-4 py-2 whitespace-nowrap font-medium">{r.qty}</td>
                </tr>
              ))}
            </tbody>
            {!loading && rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                  <td className="px-4 py-2.5" colSpan={3}>Total Quantity</td>
                  <td className="px-4 py-2.5">{totalQty}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Stock statement popup (Spare/Lube part-number drill-down) ── */
function StockStatementModal({ item, fromDate, toDate, onClose }) {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await reportsApi.fetch({
          type: 'item-statement', startDate: fromDate, endDate: toDate,
          item: item.name || '', partNumber: item.partNumber || '',
        });
        if (active) { setRows(data.data || []); setSummary(data.summary || {}); }
      } catch { if (active) { setRows([]); setSummary({}); } }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [item, fromDate, toDate]);

  const download = () => {
    const header = ['Date', 'Jobcard No/Counter/Add', 'Vehicle No', 'Use Qty', 'Add Qty', 'Bal Qty'];
    const lines = [header.join(',')];
    rows.forEach(r => lines.push(
      [fmtDate(r.date), r.source || '', r.vehicleNo || '', r.useQty || '', r.addQty || '', r.balQty]
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    ));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `statement-${item.partNumber || item.name || 'item'}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <p className="font-semibold text-gray-800">{item.name}{item.partNumber ? ` · ${item.partNumber}` : ''}</p>
            <p className="text-xs text-gray-400">
              Stock statement {fmtDate(fromDate)} – {fmtDate(toDate)} · {rows.length} record{rows.length !== 1 ? 's' : ''}
              {summary.currentStock != null ? ` · Current stock: ${summary.currentStock}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={download} disabled={!rows.length}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium disabled:opacity-50"
              style={{ background: 'linear-gradient(to right, #ef4444, #b91c1c)' }}>
              <Download size={13} /> Download
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
          </div>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm min-w-max">
            <thead>
              <tr className="border-b border-gray-200">
                {['Date', 'Jobcard No / Counter / Add', 'Vehicle No', 'Use Qty', 'Add Qty', 'Bal Qty'].map(h =>
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No movement in this period</td></tr>
              ) : rows.map((r, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-4 py-2 whitespace-nowrap">{fmtDate(r.date)}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium mr-2 ${r.sourceType === 'Jobcard' ? 'bg-blue-100 text-blue-700' : r.sourceType === 'Counter Sale' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>{r.sourceType === 'Purchase' ? 'Add' : r.sourceType}</span>
                    {r.source || '—'}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">{r.vehicleNo || '—'}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-red-600">{r.useQty || ''}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-green-600">{r.addQty || ''}</td>
                  <td className="px-4 py-2 whitespace-nowrap font-medium">{r.balQty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Main ────────────────────────────────────────────────── */
export default function ReportsPage() {
  const { toast } = useToast();
  const { isStaff, staffUser } = useAuthStore();
  // Profit report is permission-gated for staff; owners always see it.
  const canViewProfit = !isStaff || !!staffUser?.roleId?.reportPermissions?.canViewProfit;
  const visibleReportTypes = REPORT_TYPES.filter(r => r.value !== 'profit' || canViewProfit);
  const [reportType, setReportType] = useState('jobcard-revenue');
  const [preset, setPreset]         = useState('1 Month');
  const [fromDate, setFrom]         = useState(subtractDays(todayStr(), 30));
  const [toDate, setTo]             = useState(todayStr());
  const [data, setData]             = useState([]);
  const [records, setRecords]       = useState([]);
  const [summary, setSummary]       = useState(null);
  const [note, setNote]             = useState('');
  const [loading, setLoading]       = useState(false);
  const [applied, setApplied]       = useState(false);
  const [statusFilter, setStatus]   = useState(DEFAULT_STATUS['jobcard-revenue']);
  const [modalDate, setModalDate]   = useState(null);
  const [itemUsage, setItemUsage]   = useState(null);
  const [stmtItem, setStmtItem]     = useState(null);
  const [profitGroup, setProfitGroup] = useState('month');
  const [mechanics, setMechanics]   = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [mechanicFilter, setMechanic]     = useState('All');
  const [supervisorFilter, setSupervisor] = useState('All');
  const [repeatOnly, setRepeatOnly]       = useState(false);
  const [topOnly, setTopOnly]             = useState(false);
  const [outStock, setOutStock]           = useState(false);
  const [categoryFilter, setCategory]     = useState('All');
  const [invType, setInvType]             = useState('All');
  const [invStatus, setInvStatus]         = useState('all');
  const [invMostUsed, setInvMostUsed]     = useState(false);
  const [invSource, setInvSource]         = useState('all');
  const [page, setPage]                   = useState(1);
  const [limit, setLimit]                 = useState(50);
  const navigate = useNavigate();

  // Client-side pagination of the report table (totals/summary/CSV stay over full data)
  const totalRows  = data.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / limit));
  const pagedData  = data.slice((page - 1) * limit, page * limit);
  useEffect(() => { setPage(1); }, [data, limit]);

  const statusOpts   = STATUS_OPTIONS[reportType];
  const showStaff    = reportType === 'jobcard-revenue';   // mechanic/supervisor filters
  const showRepeat   = reportType === 'customer-details';  // repeat-customer filter
  const showUsage    = USAGE_TYPES.includes(reportType);   // most-used toggle
  const showStock    = showUsage && reportType !== 'job-usages'; // out-of-stock toggle (labour has no stock)
  const showCategory = reportType === 'counter-sale-usage';     // spare/lube/job category filter
  const showInventory = reportType === 'inventory-summary';     // type / stock-status / most-used filters
  const showProfit    = reportType === 'profit';                // month/date grouping radio

  const openSource = (srcType, id) => navigate(srcType === 'Jobcard' ? `/jobcards/${id}` : `/counter-sale/${id}`);

  /* Load staff once → mechanic + supervisor dropdowns */
  useEffect(() => {
    mastersApi.list('staff')
      .then(({ data }) => {
        setMechanics(data.filter(s => s.role === 'Mechanic').map(s => s.name));
        setSupervisors(data.filter(s => s.role === 'Supervisor').map(s => s.name));
      })
      .catch(() => {});
  }, []);

  const handleType = (t) => {
    setReportType(t);
    setData([]); setSummary(null);
    if (STATUS_OPTIONS[t]) setStatus(DEFAULT_STATUS[t] || 'All');
    setMechanic('All'); setSupervisor('All'); setRepeatOnly(false);
    setTopOnly(false); setOutStock(false); setCategory('All');
    setInvType('All'); setInvStatus('all'); setInvMostUsed(false); setInvSource('all');
  };

  const handlePreset = (p) => {
    setPreset(p.label);
    const end = todayStr();
    const start = subtractDays(end, p.days);
    setFrom(start);
    setTo(end);
  };

  const handleApply = useCallback(async () => {
    setLoading(true);
    setApplied(true);
    try {
      const params = { type: reportType, startDate: fromDate, endDate: toDate };
      if (STATUS_OPTIONS[reportType]) params.status = statusFilter;
      if (showStaff) {
        if (mechanicFilter   !== 'All') params.mechanic   = mechanicFilter;
        if (supervisorFilter !== 'All') params.supervisor = supervisorFilter;
      }
      if (showRepeat && repeatOnly) params.repeat = 'true';
      if (showUsage && topOnly)  params.topOnly    = 'true';
      if (showStock && outStock) params.outOfStock = 'true';
      if (showCategory && categoryFilter !== 'All') params.category = categoryFilter;
      if (showInventory) {
        if (invType !== 'All')   params.itemType    = invType;
        if (invStatus !== 'all') params.stockStatus = invStatus;
        if (invMostUsed)         params.mostUsed     = 'true';
        if (invSource !== 'all') params.usageSource  = invSource;
      }
      if (showProfit) params.groupBy = profitGroup;
      const { data: res } = await reportsApi.fetch(params);
      setData(res.data || []);
      setRecords(res.records || []);
      setSummary(res.summary || null);
      setNote(res.note || '');
    } catch (err) {
      toast({ title: err?.response?.data?.message || 'Failed to load report', variant: 'error' });
      setData([]); setRecords([]); setSummary(null);
    } finally { setLoading(false); }
  }, [reportType, fromDate, toDate, statusFilter, showStaff, mechanicFilter, supervisorFilter, showRepeat, repeatOnly, showUsage, topOnly, showStock, outStock, showCategory, categoryFilter, showInventory, invType, invStatus, invMostUsed, invSource, showProfit, profitGroup]);

  const handleReset = () => {
    setReportType('jobcard-revenue');
    setPreset('1 Month');
    setFrom(subtractDays(todayStr(), 30));
    setTo(todayStr());
    setStatus(DEFAULT_STATUS['jobcard-revenue']);
    setMechanic('All'); setSupervisor('All'); setRepeatOnly(false);
    setTopOnly(false); setOutStock(false); setCategory('All');
    setInvType('All'); setInvStatus('all'); setInvMostUsed(false); setInvSource('all');
    setData([]); setRecords([]); setSummary(null); setNote('');
    setApplied(false);
  };

  const cols = COLUMNS[reportType] || [];

  const csvMeta = () => {
    const label = REPORT_TYPES.find(r => r.value === reportType)?.label || reportType;
    const m = [['Report', label], ['From Date', fromDate], ['To Date', toDate]];
    if (STATUS_OPTIONS[reportType]) m.push(['Status', statusFilter]);
    if (showStaff) m.push(['Mechanic', mechanicFilter], ['Supervisor', supervisorFilter]);
    if (showRepeat) m.push(['Repeat Customers Only', repeatOnly ? 'Yes' : 'No']);
    if (showCategory) m.push(['Category', CATEGORY_OPTIONS.find(o => o.value === categoryFilter)?.label || categoryFilter]);
    if (showUsage) m.push(['Most Used Only', topOnly ? 'Yes' : 'No']);
    if (showStock) m.push(['Out Of Stock Only', outStock ? 'Yes' : 'No']);
    if (showInventory) {
      m.push(['Type', invType]);
      m.push(['Stock Status', INV_STATUS_OPTIONS.find(o => o.value === invStatus)?.label || invStatus]);
      m.push(['Most Used Only', invMostUsed ? 'Yes' : 'No']);
      m.push(['Used In', INV_SOURCE_OPTIONS.find(o => o.value === invSource)?.label || invSource]);
    }
    if (showProfit) m.push(['Grouped By', profitGroup === 'month' ? 'Month-wise' : 'Date-wise']);
    m.push(['Records', String(data.length)]);
    return m;
  };

  return (
    <div>
      {/* Title */}
      <div className="mb-4">
        <h1 className="font-heading font-bold text-gray-800 text-2xl">Reports</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Filter panel */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* Report type */}
            <div className={statusOpts ? '' : 'sm:col-span-2 xl:col-span-1'}>
              <label className="block text-sm font-medium text-gray-600 mb-1">Select Report</label>
              <select
                value={reportType}
                onChange={e => handleType(e.target.value)}
                className={INPUT_CLS}
              >
                {visibleReportTypes.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            {/* Status filter (per-record reports only) */}
            {statusOpts && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                <select value={statusFilter} onChange={e => setStatus(e.target.value)} className={INPUT_CLS}>
                  {statusOpts.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            {/* Mechanic / Supervisor filters (jobcard revenue only) */}
            {showStaff && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Mechanic</label>
                <select value={mechanicFilter} onChange={e => setMechanic(e.target.value)} className={INPUT_CLS}>
                  <option value="All">All Mechanics</option>
                  {mechanics.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            )}
            {showStaff && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Supervisor</label>
                <select value={supervisorFilter} onChange={e => setSupervisor(e.target.value)} className={INPUT_CLS}>
                  <option value="All">All Supervisors</option>
                  {supervisors.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            {/* Repeat-customer filter (customer details only) */}
            {showRepeat && (
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer select-none px-3 py-2 border border-gray-300 rounded-lg w-full hover:bg-gray-50">
                  <input type="checkbox" checked={repeatOnly} onChange={e => setRepeatOnly(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary/50" />
                  <span className="text-sm text-gray-600">Repeat customers only</span>
                </label>
              </div>
            )}

            {/* Inventory filters */}
            {showInventory && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Type</label>
                <select value={invType} onChange={e => setInvType(e.target.value)} className={INPUT_CLS}>
                  {INV_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>)}
                </select>
              </div>
            )}
            {showInventory && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Stock Status</label>
                <select value={invStatus} onChange={e => setInvStatus(e.target.value)} className={INPUT_CLS}>
                  {INV_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}
            {showInventory && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Used In</label>
                <select value={invSource} onChange={e => setInvSource(e.target.value)} className={INPUT_CLS}>
                  {INV_SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}
            {showInventory && (
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer select-none px-3 py-2 border border-gray-300 rounded-lg w-full hover:bg-gray-50">
                  <input type="checkbox" checked={invMostUsed} onChange={e => setInvMostUsed(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary/50" />
                  <span className="text-sm text-gray-600">Most used only</span>
                </label>
              </div>
            )}

            {/* Category filter (counter sale usage only) */}
            {showCategory && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Category</label>
                <select value={categoryFilter} onChange={e => setCategory(e.target.value)} className={INPUT_CLS}>
                  {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}

            {/* Usage toggles (usage reports only) */}
            {showUsage && (
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer select-none px-3 py-2 border border-gray-300 rounded-lg w-full hover:bg-gray-50">
                  <input type="checkbox" checked={topOnly} onChange={e => setTopOnly(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary/50" />
                  <span className="text-sm text-gray-600">Most used only</span>
                </label>
              </div>
            )}
            {showStock && (
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer select-none px-3 py-2 border border-gray-300 rounded-lg w-full hover:bg-gray-50">
                  <input type="checkbox" checked={outStock} onChange={e => setOutStock(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary/50" />
                  <span className="text-sm text-gray-600">Out of stock only</span>
                </label>
              </div>
            )}

            {/* Profit grouping (month-wise / date-wise) */}
            {showProfit && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Group By</label>
                <div className="flex gap-2">
                  {[['month', 'Month-wise'], ['date', 'Date-wise']].map(([v, l]) => (
                    <label key={v} className={`flex items-center gap-1.5 cursor-pointer select-none px-3 py-2 border rounded-lg text-sm ${profitGroup === v ? 'border-primary bg-primary/5 text-primary' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                      <input type="radio" name="profitGroup" checked={profitGroup === v} onChange={() => setProfitGroup(v)} className="accent-primary" />
                      {l}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Date preset */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Period</label>
              <select
                value={preset}
                onChange={e => { const p = DATE_PRESETS.find(p => p.label === e.target.value); if (p) handlePreset(p); else setPreset(e.target.value); }}
                className={INPUT_CLS}
              >
                {DATE_PRESETS.map(p => <option key={p.label}>{p.label}</option>)}
                <option>Custom</option>
              </select>
            </div>

            {/* From / To */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">From Date</label>
              <DateField value={fromDate} onChange={e => { setFrom(e.target.value); setPreset('Custom'); }} className={INPUT_CLS} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">To Date</label>
              <DateField value={toDate} onChange={e => { setTo(e.target.value); setPreset('Custom'); }} className={INPUT_CLS} />
            </div>
          </div>

          <div className="flex gap-3 mt-auto pt-5">
            <button onClick={handleReset}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm hover:bg-gray-50 flex items-center gap-2">
              <RefreshCw size={14} /> Reset
            </button>
            <button onClick={handleApply} disabled={loading}
              className="ml-auto px-6 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 shadow-sm hover:opacity-95 transition"
              style={{ background: 'linear-gradient(to right, #ef4444, #b91c1c)' }}>
              {loading ? 'Loading…' : 'Apply'}
            </button>
          </div>
        </div>

        {/* Summary panel */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          {applied
            ? <SummaryPanel type={reportType} summary={summary} data={data} />
            : <div className="text-gray-400 text-sm text-center py-8">Apply filters to see report details</div>
          }
        </div>
      </div>

      {/* Download + table */}
      {applied && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">{data.length} record{data.length !== 1 ? 's' : ''}</p>
            <button
              onClick={() => exportCSV(reportType, data, cols, csvMeta())}
              disabled={!data.length}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={{ background: 'linear-gradient(to right, #ef4444, #b91c1c)' }}
            >
              <Download size={15} /> Download CSV
            </button>
          </div>

          {note ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-amber-700 text-sm">{note}</div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
              <table className="w-full text-sm min-w-max">
                <thead>
                  <tr className="border-b border-gray-200">
                    {cols.map(c => (
                      <th key={c} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={cols.length} className="text-center py-10 text-gray-400">Loading...</td></tr>
                  )}
                  {!loading && data.length === 0 && (
                    <tr><td colSpan={cols.length} className="text-center py-10 text-gray-400">No data for selected period</td></tr>
                  )}
                  {!loading && pagedData.map((row, idx) => renderRow(reportType, row, (page - 1) * limit + idx, (DATE_MODAL_TYPES.includes(reportType) || reportType === 'profit') ? setModalDate : null, openSource, reportType === 'inventory-summary' ? setItemUsage : (reportType === 'spare-usages' || reportType === 'lube-usages') ? setStmtItem : null))}
                  {!loading && data.length > 0 && <TotalsRow type={reportType} data={data} />}
                </tbody>
              </table>
            </div>
          )}

          {!note && <Pagination page={page} pages={totalPages} total={totalRows} limit={limit} onPage={setPage} onLimit={setLimit} />}
        </>
      )}

      {modalDate && DATE_MODAL_TYPES.includes(reportType) && (
        <DayModal type={reportType} date={modalDate} data={data} onClose={() => setModalDate(null)} />
      )}

      {modalDate && reportType === 'profit' && (
        <ProfitDayModal date={modalDate} records={records} onClose={() => setModalDate(null)} />
      )}

      {itemUsage && (
        <ItemUsageModal item={itemUsage} fromDate={fromDate} toDate={toDate} onClose={() => setItemUsage(null)} />
      )}

      {stmtItem && (
        <StockStatementModal item={stmtItem} fromDate={fromDate} toDate={toDate} onClose={() => setStmtItem(null)} />
      )}
    </div>
  );
}
