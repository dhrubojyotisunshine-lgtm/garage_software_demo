import { useEffect, useState, useCallback } from 'react';
import {
  Building2, TrendingUp, IndianRupee, AlertCircle, CheckCircle, XCircle,
  ClipboardList, ShoppingCart, TrendingDown, Wallet, CalendarDays,
  BarChart2, ChevronDown, RefreshCw
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, CartesianGrid
} from 'recharts';
import { superAdminApi } from '../../api/superAdmin';

function fmtINR(n) {
  if (!n) return '₹ 0';
  if (n >= 10000000) return `₹ ${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹ ${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)     return `₹ ${(n / 1000).toFixed(1)}k`;
  return `₹ ${Math.round(n).toLocaleString('en-IN')}`;
}
function fmtINRFull(n) { return `₹ ${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`; }

/* ── KPI card ───────────────────────────────────────────────── */
function KpiCard({ label, value, sub, icon, color = 'red', small }) {
  const palette = {
    red:    { bg: 'bg-red-50',    icon: 'text-red-500',    border: 'border-red-100' },
    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-500',   border: 'border-blue-100' },
    green:  { bg: 'bg-green-50',  icon: 'text-green-500',  border: 'border-green-100' },
    amber:  { bg: 'bg-amber-50',  icon: 'text-amber-500',  border: 'border-amber-100' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-500', border: 'border-purple-100' },
    teal:   { bg: 'bg-teal-50',   icon: 'text-teal-500',   border: 'border-teal-100' },
    rose:   { bg: 'bg-rose-50',   icon: 'text-rose-500',   border: 'border-rose-100' },
    slate:  { bg: 'bg-slate-50',  icon: 'text-slate-500',  border: 'border-slate-100' },
  };
  const c = palette[color] || palette.red;
  return (
    <div className={`bg-white rounded-2xl border ${c.border} p-5 flex items-start gap-4`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg} ${c.icon}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-gray-500 leading-tight">{label}</div>
        <div className={`font-bold text-gray-800 mt-0.5 ${small ? 'text-lg' : 'text-xl'}`}>{value}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

/* ── Breakdown bar row ──────────────────────────────────────── */
function BreakdownBars({ items, total }) {
  return (
    <div className="space-y-3.5">
      {items.map(({ label, val, sub, color, text }) => {
        const pct = total > 0 ? Math.round((val / total) * 100) : 0;
        return (
          <div key={label}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
                <span className="text-sm text-gray-700">{label}</span>
                {sub && <span className="text-xs text-gray-400">({sub})</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${text}`}>{fmtINRFull(val)}</span>
                <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
              </div>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Mini stat ───────────────────────────────────────────────── */
function MiniStat({ label, val }) {
  return (
    <div className="bg-gray-50 rounded-xl px-3 py-2.5">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="text-sm font-semibold text-gray-700 mt-0.5">{val}</div>
    </div>
  );
}

/* ── Section heading ────────────────────────────────────────── */
function SectionHead({ title, sub }) {
  return (
    <div className="mb-4">
      <h3 className="font-semibold text-gray-700">{title}</h3>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ── Franchise selector ─────────────────────────────────────── */
function FranchiseSelector({ garageList, value, onChange }) {
  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none bg-white border border-gray-200 rounded-xl pl-4 pr-9 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300 shadow-sm cursor-pointer"
      >
        <option value="">All Franchises</option>
        {garageList.map(g => (
          <option key={String(g._id)} value={String(g._id)}>
            {g.workshopName}{g.city ? ` — ${g.city}` : ''}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-3 text-gray-400 pointer-events-none" />
    </div>
  );
}

/* ── Custom tooltip ─────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-xs">
      <p className="font-semibold text-gray-600 mb-1.5">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-semibold text-gray-700">{fmtINRFull(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function SuperAdminDashboard() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [garageId,   setGarageId]   = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true); else setLoading(true);
    try {
      const params = garageId ? { garageId } : {};
      const { data: d } = await superAdminApi.dashboard(params);
      setData(d);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [garageId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">Loading dashboard…</p>
      </div>
    </div>
  );
  if (!data) return <div className="text-center py-20 text-red-500">Failed to load dashboard</div>;

  const { summary: s, garageStats, garageDetail, garageList, monthlyTrend, expenseByCat } = data;
  const isFiltered = !!garageId;

  return (
    <div className="space-y-7">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {isFiltered && garageDetail
              ? `Viewing: ${garageDetail.workshopName}${garageDetail.city ? ` · ${garageDetail.city}` : ''}`
              : 'Franchise overview across all locations'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <FranchiseSelector garageList={garageList || []} value={garageId} onChange={v => setGarageId(v)} />
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 shadow-sm"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Today snapshot (3 cards) ── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Today</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Today's Revenue"    value={fmtINR(s.todayRevenue)}   icon={<CalendarDays size={20} />}    color="green" />
          <KpiCard label="This Week"          value={fmtINR(s.weekRevenue)}    icon={<TrendingUp size={20} />}      color="blue" />
          <KpiCard label="This Month"         value={fmtINR(s.monthRevenue)}   icon={<BarChart2 size={20} />}       color="purple" />
          <KpiCard
            label="Today's Transactions"
            value={s.todayJobcards + s.todayCounter}
            sub={`${s.todayJobcards} jobcards · ${s.todayCounter} counter`}
            icon={<ClipboardList size={20} />}
            color="teal"
          />
        </div>
      </div>

      {/* ── Overall KPIs (8 cards) ── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          {isFiltered ? 'Franchise KPIs' : 'All-time Overview'}
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {!isFiltered && (
            <>
              <KpiCard label="Total Franchises"   value={s.totalGarages}   sub={`${s.activeGarages} active · ${s.inactiveGarages} inactive`} icon={<Building2 size={20} />}    color="blue" />
              <KpiCard label="Open Jobcards"      value={s.openJobcards}   sub="currently in progress"   icon={<ClipboardList size={20} />} color="amber" />
            </>
          )}
          <KpiCard label="Total Revenue"          value={fmtINR(s.totalRevenue)}        sub={fmtINRFull(s.totalRevenue)}  icon={<IndianRupee size={20} />}  color="red" />
          <KpiCard label="Net Profit"             value={fmtINR(s.netProfit)}           sub={`After ₹ expenses`}          icon={<TrendingUp size={20} />}   color={s.netProfit >= 0 ? 'green' : 'rose'} />
          <KpiCard label="Jobcard Revenue"        value={fmtINR(s.totalJobcardRevenue)} sub={`${s.totalJobcardCount} bills closed`} icon={<ClipboardList size={20} />} color="purple" />
          <KpiCard label="Counter Sale Revenue"   value={fmtINR(s.totalCounterRevenue)} sub={`${s.totalCounterCount} sales`}       icon={<ShoppingCart size={20} />}  color="teal" />
          <KpiCard label="Total Expenses"         value={fmtINR(s.totalExpenses)}       icon={<TrendingDown size={20} />} color="rose" />
          <KpiCard label="Pending Collections"    value={fmtINR(s.totalPending)}        icon={<AlertCircle size={20} />}  color="amber" />
        </div>
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Monthly Revenue Trend */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <SectionHead title="Monthly Revenue Trend" sub="Last 6 months — jobcard + counter sale" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyTrend} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => fmtINR(v)} axisLine={false} tickLine={false} width={54} />
              <Tooltip content={<ChartTooltip />} />
              <Legend iconSize={9} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="jobcard"  name="Jobcard"      fill="#ef4444" radius={[4,4,0,0]} maxBarSize={28} />
              <Bar dataKey="counter"  name="Counter Sale" fill="#3b82f6" radius={[4,4,0,0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Net Profit trend */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <SectionHead title="Net Profit Trend" sub="Revenue minus expenses per month" />
          <ResponsiveContainer width="100%" height={200}>
            <LineChart
              data={monthlyTrend.map(m => ({ ...m, net: (m.jobcard + m.counter) - m.expenses }))}
              margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => fmtINR(v)} axisLine={false} tickLine={false} width={54} />
              <Tooltip content={<ChartTooltip />} />
              <Legend iconSize={9} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Line dataKey="net"      name="Net Profit"  stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line dataKey="expenses" name="Expenses"    stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* ── Detailed Revenue Breakdown ── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Revenue Breakdown</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── By source ── */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <SectionHead title="By Revenue Source" sub="Jobcard vs Counter Sale" />
            <BreakdownBars items={[
              { label: 'Jobcard Revenue',      val: s.totalJobcardRevenue, sub: `${s.totalJobcardCount} bills`, color: 'bg-red-500',   text: 'text-red-600' },
              { label: 'Counter Sale Revenue', val: s.totalCounterRevenue, sub: `${s.totalCounterCount} sales`, color: 'bg-blue-500',  text: 'text-blue-600' },
            ]} total={s.totalRevenue} />
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
              <MiniStat label="Avg Jobcard Value"  val={fmtINRFull(s.avgJobcardValue)} />
              <MiniStat label="Avg Counter Value"  val={fmtINRFull(s.avgCounterValue)} />
            </div>
          </div>

          {/* ── By item type ── */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <SectionHead title="By Item Type" sub="Jobs · Spare Parts · Lubricants" />
            <BreakdownBars items={[
              { label: 'Jobs / Services', val: s.labourRevenue, color: 'bg-violet-500', text: 'text-violet-600' },
              { label: 'Spare Parts',       val: s.spareRevenue,  color: 'bg-sky-500',    text: 'text-sky-600' },
              { label: 'Lubricants',        val: s.lubeRevenue,   color: 'bg-teal-500',   text: 'text-teal-600' },
            ]} total={s.labourRevenue + s.spareRevenue + s.lubeRevenue} />
          </div>

          {/* ── Payment mode ── */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <SectionHead title="By Payment Mode" sub="How customers paid" />
            <BreakdownBars items={[
              { label: 'Cash',   val: s.payMode?.Cash   || 0, color: 'bg-green-500',  text: 'text-green-600' },
              { label: 'UPI',    val: s.payMode?.UPI    || 0, color: 'bg-indigo-500', text: 'text-indigo-600' },
              { label: 'Card',   val: s.payMode?.Card   || 0, color: 'bg-cyan-500',   text: 'text-cyan-600' },
              { label: 'Cheque', val: s.payMode?.Cheque || 0, color: 'bg-amber-500',  text: 'text-amber-600' },
            ]} total={(s.payMode?.Cash||0)+(s.payMode?.UPI||0)+(s.payMode?.Card||0)+(s.payMode?.Cheque||0)} />
          </div>

          {/* ── Collections & discounts ── */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <SectionHead title="Collections & Discounts" sub="Collected · Pending · Discounts given" />
            <BreakdownBars items={[
              { label: 'Collected',        val: s.totalCollected,      color: 'bg-emerald-500', text: 'text-emerald-600' },
              { label: 'Pending / Due',    val: s.totalPending,        color: 'bg-rose-400',    text: 'text-rose-600' },
              { label: 'Discount Given',   val: s.totalDiscountGiven,  color: 'bg-orange-400',  text: 'text-orange-600' },
            ]} total={s.totalCollected + s.totalPending} />
            {s.totalAdvance > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <MiniStat label="Total Advances Received" val={fmtINRFull(s.totalAdvance)} />
              </div>
            )}
          </div>

        </div>

        {/* ── Expense by category ── */}
        {expenseByCat?.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 mt-6">
            <SectionHead title="Expenses by Category" sub="Where money was spent" />
            <BreakdownBars
              items={expenseByCat.map((e, i) => ({
                label: e.name,
                val:   e.amount,
                color: ['bg-rose-500','bg-amber-500','bg-orange-400','bg-pink-500','bg-red-400'][i % 5],
                text:  ['text-rose-600','text-amber-600','text-orange-600','text-pink-600','text-red-500'][i % 5],
              }))}
              total={s.totalExpenses}
            />
          </div>
        )}
      </div>

      {/* ── Franchise leaderboard (only when all) ── */}
      {!isFiltered && garageStats?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-700">Franchise Performance</h3>
              <p className="text-xs text-gray-400 mt-0.5">Ranked by total revenue</p>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{garageStats.length} franchises</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['#','Franchise','City','Status','Jobcards','Counter','Revenue','Expenses','Net Profit','Pending'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {garageStats.map((g, i) => {
                  const netOk = g.netProfit >= 0;
                  return (
                    <tr key={String(g._id)} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-200 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'text-gray-400'
                        }`}>{i + 1}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{g.workshopName}</div>
                        <div className="text-xs text-gray-400">{[g.firstName, g.lastName].filter(Boolean).join(' ')}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{g.city || '—'}</td>
                      <td className="px-4 py-3">
                        {g.active !== false
                          ? <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle size={11} /> Active</span>
                          : <span className="flex items-center gap-1 text-red-400 text-xs font-medium"><XCircle size={11} /> Inactive</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-medium">{g.jobcardCount}</td>
                      <td className="px-4 py-3 text-gray-600 font-medium">{g.counterCount}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{fmtINR(g.totalRevenue)}</td>
                      <td className="px-4 py-3 text-rose-500 font-medium">{fmtINR(g.expenses)}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${netOk ? 'text-green-600' : 'text-red-500'}`}>
                          {netOk ? '' : '-'}{fmtINR(Math.abs(g.netProfit))}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-amber-600 font-medium">{fmtINR(g.pending)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Totals</td>
                  <td className="px-4 py-3 font-bold text-gray-700">{garageStats.reduce((a,g) => a + g.jobcardCount, 0)}</td>
                  <td className="px-4 py-3 font-bold text-gray-700">{garageStats.reduce((a,g) => a + g.counterCount, 0)}</td>
                  <td className="px-4 py-3 font-bold text-gray-700">{fmtINR(s.totalRevenue)}</td>
                  <td className="px-4 py-3 font-bold text-rose-500">{fmtINR(s.totalExpenses)}</td>
                  <td className="px-4 py-3 font-bold text-green-600">{fmtINR(s.netProfit)}</td>
                  <td className="px-4 py-3 font-bold text-amber-600">{fmtINR(s.totalPending)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Single franchise detail panel ── */}
      {isFiltered && garageDetail && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <SectionHead title="Franchise Details" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-3 text-sm">
            {[
              ['Owner',   [garageDetail.firstName, garageDetail.lastName].filter(Boolean).join(' ') || '—'],
              ['Mobile',  garageDetail.mobile || '—'],
              ['City',    garageDetail.city   || '—'],
              ['Status',  garageDetail.active !== false ? '✅ Active' : '❌ Inactive'],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="text-xs text-gray-400 mb-0.5">{k}</div>
                <div className="font-medium text-gray-700">{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
