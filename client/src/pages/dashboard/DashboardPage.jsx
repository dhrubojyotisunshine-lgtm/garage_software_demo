import { useState, useEffect } from 'react';
import { DateField } from '../../components/ui/DateField';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, ShoppingBag, AlertCircle, RefreshCw,
  Users, FileText, CheckCircle, Banknote, Wrench, Package, Droplets,
  CreditCard, Smartphone, Landmark
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { dashboardApi } from '../../api/dashboard';
import { formatCurrency, formatDate } from '../../utils/format';
import useAuthStore from '../../store/authStore';

const PIE_COLORS = ['#E53935', '#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

function StatCard({ title, value, subtitle, change, icon: Icon, color }) {
  const isPositive = change >= 0;
  return (
    <div className="card flex-1">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{title}</p>
          <p className="font-heading font-bold text-2xl text-gray-800 mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        {change !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(change)}%
          </span>
        )}
        <span className="text-xs text-gray-400">{subtitle}</span>
      </div>
    </div>
  );
}

function MiniStatCard({ title, value, icon: Icon, color, sub }) {
  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon size={17} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 font-medium truncate">{title}</p>
          <p className="font-heading font-bold text-lg text-gray-800 leading-tight">{value}</p>
          {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function BreakdownBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600 font-medium">{label}</span>
        <span className="text-gray-500">{formatCurrency(value)} <span className="text-gray-300 ml-1">{pct}%</span></span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

const PERIOD_OPTIONS = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: '6 Months', value: '6months' }
];

const PAYMENT_ICONS = { Cash: Banknote, UPI: Smartphone, Card: CreditCard, Cheque: Landmark };
const PAYMENT_COLORS = { Cash: 'bg-green-500', UPI: 'bg-blue-500', Card: 'bg-purple-500', Cheque: 'bg-amber-500' };

export default function DashboardPage() {
  const { garage } = useAuthStore();
  const navigate = useNavigate();
  const [summary, setSummary]           = useState(null);
  const [extended, setExtended]         = useState(null);
  const [revenueData, setRevenueData]   = useState([]);
  const [vehicleData, setVehicleData]   = useState([]);
  const [closedData, setClosedData]     = useState([]);
  const [paymentData, setPaymentData]   = useState([]);
  const [recentOpen, setRecentOpen]     = useState([]);
  const [period, setPeriod]             = useState('weekly');
  const [revStart, setRevStart]         = useState('');
  const [revEnd, setRevEnd]             = useState('');
  const [loading, setLoading]           = useState(true);

  const customRange = revStart && revEnd;

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [s, r, v, c, ext, pay, open] = await Promise.all([
        dashboardApi.summary(),
        dashboardApi.revenueChart(period, revStart, revEnd),
        dashboardApi.vehicleMake(),
        dashboardApi.closedJobcards(),
        dashboardApi.extendedSummary(),
        dashboardApi.paymentBreakdown(),
        dashboardApi.recentOpen(),
      ]);
      setSummary(s.data);
      setRevenueData(r.data.data || []);
      setVehicleData(v.data || []);
      setClosedData(c.data || []);
      setExtended(ext.data);
      setPaymentData(pay.data || []);
      setRecentOpen(open.data || []);
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [period, revStart, revEnd]);

  const formatXAxis = (val) => {
    if (!val) return '';
    const parts = val.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    if (parts.length === 2) return `${parts[1]}/${parts[0]}`;
    return val;
  };

  const monthTotal = (extended?.month?.revenue || 0);
  const itemBreakdown = [
    { label: 'Jobs', value: extended?.month?.labour || 0, color: '#22C55E' },
    { label: 'Spare',  value: extended?.month?.spare  || 0, color: '#3B82F6' },
    { label: 'Lube',   value: extended?.month?.lube   || 0, color: '#F97316' },
  ];
  const paymentMax = Math.max(...(paymentData.map(p => p.total)), 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading font-bold text-gray-800 text-2xl">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Welcome back, {garage?.workshopName || garage?.firstName} 👋</p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-gray-600 border border-border px-3 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Today + open KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MiniStatCard title="Today's Revenue" value={formatCurrency(extended?.today?.revenue || 0)} icon={TrendingUp} color="bg-primary" sub={`${extended?.today?.jobcards || 0} jobcards`} />
        <MiniStatCard title="Open Jobcards"   value={extended?.openJobcards ?? '—'} icon={FileText}    color="bg-amber-500" sub="Currently active" />
        <MiniStatCard title="This Month"      value={formatCurrency(extended?.month?.revenue || 0)} icon={CheckCircle} color="bg-green-500" sub={`${extended?.month?.jobcards || 0} jobcards`} />
        <MiniStatCard title="Total Customers" value={extended?.totalCustomers ?? '—'} icon={Users} color="bg-blue-500" sub="All time" />
      </div>

      {/* Original summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
        <StatCard
          title="Revenue"
          value={formatCurrency(summary?.revenue || 0)}
          subtitle="Last 30 Days"
          change={summary?.revenueChange}
          icon={TrendingUp}
          color="bg-primary"
        />
        <StatCard
          title="Purchase"
          value={formatCurrency(summary?.purchase || 0)}
          subtitle="Last 30 Days"
          change={summary?.purchaseChange}
          icon={ShoppingBag}
          color="bg-info"
        />
        <StatCard
          title="Pending Balance"
          value={formatCurrency(summary?.pendingBalance || 0)}
          subtitle="Till Date"
          icon={AlertCircle}
          color="bg-warning"
        />
      </div>

      {/* Revenue chart */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <h3 className="font-heading font-semibold text-gray-800">Revenue Overview</h3>
          <div className="flex items-center gap-3 flex-wrap">
            {/* From / To date range — overrides the period preset when both are set */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <label className="text-xs text-gray-500">From</label>
              <DateField value={revStart} onChange={e => setRevStart(e.target.value)}
                className="border border-border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white" />
              <label className="text-xs text-gray-500">To</label>
              <DateField value={revEnd} onChange={e => setRevEnd(e.target.value)}
                className="border border-border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white" />
              {customRange && (
                <button onClick={() => { setRevStart(''); setRevEnd(''); }}
                  className="text-xs text-gray-400 hover:text-red-500 px-1">Clear</button>
              )}
            </div>
            <div className={`flex gap-1 bg-gray-100 rounded-lg p-1 ${customRange ? 'opacity-40 pointer-events-none' : ''}`}>
              {PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPeriod(opt.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    period === opt.value ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {revenueData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data yet — create some jobcards</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={revenueData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="_id" tickFormatter={formatXAxis} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
              <Tooltip formatter={(v) => formatCurrency(v)} labelFormatter={formatXAxis} />
              <Legend />
              <Line type="monotone" dataKey="spares" stroke="#3B82F6" name="Spares" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="lubes" stroke="#C2762A" name="Lubes" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="jobs" stroke="#22C55E" name="Jobs" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="revenue" stroke="#E53935" name="Revenue" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Breakdowns row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {/* Item type breakdown */}
        <div className="card">
          <h3 className="font-heading font-semibold text-gray-800 mb-4 text-sm">Item Type — This Month</h3>
          {itemBreakdown.every(i => i.value === 0) ? (
            <p className="text-gray-400 text-xs py-4 text-center">No data this month</p>
          ) : (
            itemBreakdown.map(item => (
              <BreakdownBar key={item.label} label={item.label} value={item.value} max={monthTotal} color={item.color} />
            ))
          )}
          {extended?.month?.counterSaleRevenue > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Counter Sales</span>
                <span className="font-medium text-gray-700">{formatCurrency(extended.month.counterSaleRevenue)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Payment mode breakdown */}
        <div className="card">
          <h3 className="font-heading font-semibold text-gray-800 mb-4 text-sm">Payment Mode — Last 30 Days</h3>
          {paymentData.every(p => p.total === 0) ? (
            <p className="text-gray-400 text-xs py-4 text-center">No payments recorded</p>
          ) : (
            paymentData.map(p => (
              <BreakdownBar key={p.mode} label={p.mode} value={p.total} max={paymentMax} color={
                p.mode === 'Cash' ? '#22C55E' : p.mode === 'UPI' ? '#3B82F6' : p.mode === 'Card' ? '#8B5CF6' : '#F59E0B'
              } />
            ))
          )}
        </div>

        {/* Expense vs Revenue */}
        <div className="card">
          <h3 className="font-heading font-semibold text-gray-800 mb-4 text-sm">Revenue vs Expense — This Month</h3>
          <div className="space-y-3">
            {[
              { label: 'Revenue',  value: extended?.month?.revenue  || 0, color: '#22C55E' },
              { label: 'Expenses', value: extended?.month?.expenses || 0, color: '#EF4444' },
            ].map(item => (
              <BreakdownBar key={item.label} label={item.label} value={item.value}
                max={Math.max(extended?.month?.revenue || 0, extended?.month?.expenses || 1)}
                color={item.color} />
            ))}
            <div className="pt-2 border-t border-border">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 font-medium">Net Profit</span>
                <span className={`font-bold ${(extended?.month?.revenue||0) - (extended?.month?.expenses||0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency((extended?.month?.revenue||0) - (extended?.month?.expenses||0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Vehicle make pie */}
        <div className="card">
          <h3 className="font-heading font-semibold text-gray-800 mb-4">Jobcards by Vehicle Make</h3>
          {vehicleData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No jobcard data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={vehicleData} cx="50%" cy="50%" outerRadius={75} dataKey="value" nameKey="name">
                  {vehicleData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Closed jobcards bar */}
        <div className="card">
          <h3 className="font-heading font-semibold text-gray-800 mb-4">Closed Jobcards (Last 7 Days)</h3>
          {closedData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No closed jobcards this week</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={closedData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tickFormatter={v => v ? v.slice(5) : ''} tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={v => v} />
                <Bar dataKey="count" fill="#22C55E" name="Closed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

    </div>
  );
}
