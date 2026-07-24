import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Wrench, LayoutDashboard, FileText, BellRing, UserCircle, FileSpreadsheet,
  ShoppingCart, Package, BarChart2, BookOpen, Calendar, CreditCard, Database,
  Users, Settings, ArrowRight, Check, ShieldCheck, MessageCircle, Printer,
  Smartphone, Zap, Building2, Menu, X, Star, TrendingUp, Clock, IndianRupee,
} from 'lucide-react';

/* ── Feature catalogue (mirrors the actual product modules) ── */
const FEATURES = [
  {
    icon: FileText, color: 'text-primary', bg: 'bg-primary/10',
    title: 'Jobcards & Workflow',
    desc: 'Create jobcards with customer search, vehicle details, fuel level, labour, spares & lubes. Move them through Open → Completed → Closed with a guided status flow.',
  },
  {
    icon: LayoutDashboard, color: 'text-info', bg: 'bg-info/10',
    title: 'Live Dashboard',
    desc: 'Revenue, purchases and pending amounts at a glance — with weekly / monthly / 6-month revenue trends, vehicle-make split and closed-jobcard charts.',
  },
  {
    icon: BellRing, color: 'text-warning', bg: 'bg-warning/10',
    title: 'Service Reminders',
    desc: 'Never miss a follow-up. Automatic service-due reminders keep customers coming back, sent straight to WhatsApp in a click.',
  },
  {
    icon: UserCircle, color: 'text-purple-500', bg: 'bg-purple-500/10',
    title: 'Customer CRM',
    desc: 'A full history for every customer and vehicle — past jobcards, spend, and service timeline. Search or add customers inline while billing.',
  },
  {
    icon: FileSpreadsheet, color: 'text-emerald-500', bg: 'bg-emerald-500/10',
    title: 'Estimates',
    desc: 'Build professional estimates in seconds and convert them to jobcards or invoices. Share printable estimates with your customers instantly.',
  },
  {
    icon: ShoppingCart, color: 'text-cyan-500', bg: 'bg-cyan-500/10',
    title: 'Counter Sale (POS)',
    desc: 'Fast over-the-counter billing for walk-in parts and accessories sales, with printable invoices and stock auto-deduction.',
  },
  {
    icon: Package, color: 'text-amber-600', bg: 'bg-amber-600/10',
    title: 'Inventory & Purchase',
    desc: 'Track stock, suppliers and purchase orders with a full movement history. Add stock, manage low-stock items and keep costs under control.',
  },
  {
    icon: BarChart2, color: 'text-rose-500', bg: 'bg-rose-500/10',
    title: 'Comprehensive Reports',
    desc: 'Revenue, usage, customer, vehicle, mechanic, pending, services-due, recurring, PO and counter-sale reports — all filterable and exportable to CSV.',
  },
  {
    icon: BookOpen, color: 'text-indigo-500', bg: 'bg-indigo-500/10',
    title: 'Cashbook',
    desc: 'A running ledger of every rupee in and out. Reconcile daily collections and payments without touching a spreadsheet.',
  },
  {
    icon: Calendar, color: 'text-teal-500', bg: 'bg-teal-500/10',
    title: 'Appointments',
    desc: 'Schedule and manage bookings so your bays are always full and your team knows what’s coming next.',
  },
  {
    icon: CreditCard, color: 'text-pink-500', bg: 'bg-pink-500/10',
    title: 'Expenses',
    desc: 'Log workshop expenses against categories and keep an accurate picture of your true profitability.',
  },
  {
    icon: Users, color: 'text-blue-600', bg: 'bg-blue-600/10',
    title: 'Staff & Roles',
    desc: 'Add staff members and control exactly which modules each role can see with fine-grained, menu-level access.',
  },
];

/* ── Secondary highlight strip ── */
const HIGHLIGHTS = [
  { icon: Printer,    title: 'Print-ready documents', desc: 'Branded worksheets, estimates & GST invoices designed to print perfectly.' },
  { icon: MessageCircle, title: 'WhatsApp & gate-pass', desc: 'Send reminders, invoices and gate-passes to customers over WhatsApp.' },
  { icon: Settings,   title: 'Your brand, your colours', desc: 'Custom logo, primary colour, sidebar and header theming per garage.' },
  { icon: Database,   title: 'Configurable masters', desc: 'Jobcard types, statuses, makes, models, labour, spares, lubes & packages.' },
  { icon: ShieldCheck, title: 'Secure multi-garage', desc: 'JWT auth with every record safely scoped to your own garage.' },
  { icon: Smartphone, title: 'Works on any device', desc: 'A responsive interface that runs on desktop, tablet and phone.' },
];

const STATS = [
  { icon: TrendingUp, value: '12+', label: 'Powerful modules' },
  { icon: Clock,      value: '70%',  label: 'Less paperwork time' },
  { icon: IndianRupee, value: '100%', label: 'Billing accuracy' },
  { icon: Star,       value: '24/7', label: 'Access anywhere' },
];

const STEPS = [
  { n: '01', title: 'Register your garage', desc: 'Sign up in minutes with a quick OTP verification and set up your workshop profile.' },
  { n: '02', title: 'Configure your masters', desc: 'Add your labour rates, spares, lubes, vehicle makes and staff roles once.' },
  { n: '03', title: 'Create jobcards & bill', desc: 'Raise jobcards, add line items, collect payments and print branded invoices.' },
  { n: '04', title: 'Track & grow', desc: 'Watch dashboards, send service reminders and grow repeat business.' },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans overflow-x-hidden">
      {/* ─────────────────────────  NAV  ───────────────────────── */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-border' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
              <Wrench size={18} className="text-white" />
            </div>
            <div className="leading-tight">
              <div className="font-heading font-extrabold text-gray-900 text-lg">RECKON MOTORS</div>
              <div className="text-[10px] text-gray-400 -mt-0.5 tracking-wide">MANAGEMENT SYSTEM</div>
            </div>
          </a>

          {/* desktop links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#workflow" className="hover:text-primary transition-colors">How it works</a>
            <a href="#modules" className="hover:text-primary transition-colors">Modules</a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/superadmin"
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 px-3.5 py-2 rounded-xl transition-colors"
            >
              <ShieldCheck size={16} /> Admin
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-1.5 text-sm font-semibold text-white bg-primary hover:bg-primary-600 px-5 py-2.5 rounded-xl shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40"
            >
              Portal Login <ArrowRight size={15} />
            </Link>
          </div>

          {/* mobile toggle */}
          <button className="md:hidden p-2 text-gray-700" onClick={() => setMenuOpen(v => !v)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-border px-5 py-4 space-y-3">
            <a href="#features" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700 py-1.5">Features</a>
            <a href="#workflow" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700 py-1.5">How it works</a>
            <a href="#modules" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700 py-1.5">Modules</a>
            <div className="flex gap-3 pt-2">
              <Link to="/superadmin" className="flex-1 text-center text-sm font-semibold text-gray-700 border border-border px-4 py-2.5 rounded-xl">Admin</Link>
              <Link to="/login" className="flex-1 text-center text-sm font-semibold text-white bg-primary px-4 py-2.5 rounded-xl">Portal Login</Link>
            </div>
          </div>
        )}
      </header>

      {/* ─────────────────────────  HERO  ───────────────────────── */}
      <section id="top" className="relative pt-28 pb-20 sm:pt-36 sm:pb-28">
        {/* background flourish */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-32 w-[38rem] h-[38rem] bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute top-40 -left-40 w-[32rem] h-[32rem] bg-info/10 rounded-full blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                'linear-gradient(to right, #eef1f6 1px, transparent 1px), linear-gradient(to bottom, #eef1f6 1px, transparent 1px)',
              backgroundSize: '44px 44px',
              maskImage: 'radial-gradient(ellipse 80% 55% at 50% 30%, black 40%, transparent 75%)',
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-14 items-center">
          {/* copy */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6">
              <Zap size={13} /> The all-in-one garage OS
            </div>
            <h1 className="font-heading font-extrabold text-4xl sm:text-5xl lg:text-6xl leading-[1.05] text-gray-900">
              Run your garage
              <span className="block text-primary">the smart way.</span>
            </h1>
            <p className="mt-6 text-lg text-gray-500 max-w-xl mx-auto lg:mx-0">
              RECKON MOTORS brings jobcards, billing, inventory, customers, reminders and
              reports into one beautiful platform — so you can spend less time on paperwork
              and more time on cars.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                to="/login"
                className="group inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-600 text-white font-semibold text-base px-7 py-3.5 rounded-2xl shadow-xl shadow-primary/30 transition-all"
              >
                Open the Portal
                <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                to="/superadmin"
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-800 font-semibold text-base px-7 py-3.5 rounded-2xl border border-border shadow-sm transition-all"
              >
                <ShieldCheck size={18} /> Admin Login
              </Link>
            </div>

            <div className="mt-8 flex items-center gap-6 justify-center lg:justify-start text-sm text-gray-400">
              <span className="flex items-center gap-1.5"><Check size={16} className="text-success" /> No paperwork</span>
              <span className="flex items-center gap-1.5"><Check size={16} className="text-success" /> Print-ready invoices</span>
              <span className="flex items-center gap-1.5"><Check size={16} className="text-success" /> WhatsApp ready</span>
            </div>
          </div>

          {/* mock dashboard card */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 to-info/20 rounded-[2rem] blur-2xl -z-10" />
            <div className="rounded-3xl border border-border bg-white shadow-2xl shadow-gray-300/40 overflow-hidden">
              {/* window bar */}
              <div className="flex items-center gap-2 px-4 h-10 bg-sidebar-bg">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-green-400" />
                <span className="ml-3 text-[11px] text-white/50">app.ttngarage.com/dashboard</span>
              </div>
              <div className="flex">
                {/* mini sidebar */}
                <div className="hidden sm:flex flex-col gap-1.5 w-12 bg-sidebar-bg py-4 px-2">
                  {[LayoutDashboard, FileText, Package, BarChart2, Users].map((Ic, i) => (
                    <div key={i} className={`h-8 rounded-lg flex items-center justify-center ${i === 0 ? 'bg-primary' : 'hover:bg-white/5'}`}>
                      <Ic size={15} className="text-white/80" />
                    </div>
                  ))}
                </div>
                {/* body */}
                <div className="flex-1 p-4 bg-page">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { l: 'Revenue', v: '₹4.8L', c: 'text-primary', b: 'bg-primary/10' },
                      { l: 'Pending', v: '₹62K', c: 'text-warning', b: 'bg-warning/10' },
                      { l: 'Jobcards', v: '128', c: 'text-info', b: 'bg-info/10' },
                    ].map((s) => (
                      <div key={s.l} className="rounded-xl bg-white border border-border p-3">
                        <div className="text-[10px] text-gray-400">{s.l}</div>
                        <div className={`font-heading font-bold text-base ${s.c}`}>{s.v}</div>
                        <div className={`mt-2 h-1.5 rounded-full ${s.b}`}>
                          <div className={`h-full rounded-full ${s.c.replace('text', 'bg')}`} style={{ width: `${45 + Math.random() * 40}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* chart */}
                  <div className="rounded-xl bg-white border border-border p-3">
                    <div className="text-[10px] text-gray-400 mb-2">Revenue trend</div>
                    <div className="flex items-end gap-1.5 h-24">
                      {[40, 62, 48, 75, 58, 88, 70, 95, 82, 100, 78, 92].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-primary/40 to-primary" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* floating badge */}
            <div className="absolute -bottom-5 -left-3 sm:-left-6 bg-white rounded-2xl shadow-xl border border-border px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 bg-success/10 rounded-xl flex items-center justify-center">
                <BellRing size={16} className="text-success" />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-800">Service reminder sent</div>
                <div className="text-[10px] text-gray-400">via WhatsApp · just now</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────  STATS  ───────────────────────── */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 -mt-4 mb-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map(({ icon: Ic, value, label }) => (
            <div key={label} className="rounded-2xl bg-sidebar-bg text-white p-6 text-center">
              <Ic size={22} className="mx-auto text-primary mb-2.5" />
              <div className="font-heading font-extrabold text-3xl">{value}</div>
              <div className="text-sm text-white/50 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────────  FEATURES  ───────────────────────── */}
      <section id="features" className="max-w-7xl mx-auto px-5 sm:px-8 py-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-block text-primary text-xs font-bold tracking-widest uppercase mb-3">Everything you need</div>
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-gray-900">
            One platform for the entire workshop
          </h2>
          <p className="mt-4 text-gray-500 text-lg">
            From the moment a vehicle rolls in to the final invoice and follow-up — every step is covered.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Ic, color, bg, title, desc }) => (
            <div
              key={title}
              className="group rounded-2xl border border-border bg-white p-6 hover:shadow-xl hover:shadow-gray-200/60 hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
                <Ic size={22} className={color} />
              </div>
              <h3 className="font-heading font-bold text-lg text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────────  HIGHLIGHT STRIP  ───────────────────────── */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-16">
        <div className="rounded-3xl bg-sidebar-bg px-6 sm:px-12 py-12 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-primary/20 rounded-full blur-3xl" />
          <div className="relative">
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-white text-center mb-3">
              Built for the way garages really work
            </h2>
            <p className="text-white/50 text-center max-w-2xl mx-auto mb-10">
              Thoughtful touches that save your team time every single day.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {HIGHLIGHTS.map(({ icon: Ic, title, desc }) => (
                <div key={title} className="flex gap-4 rounded-2xl bg-white/5 border border-white/10 p-5 hover:bg-white/10 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Ic size={18} className="text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm mb-1">{title}</div>
                    <div className="text-xs text-white/50 leading-relaxed">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────  WORKFLOW  ───────────────────────── */}
      <section id="workflow" className="max-w-7xl mx-auto px-5 sm:px-8 py-16">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-block text-primary text-xs font-bold tracking-widest uppercase mb-3">How it works</div>
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-gray-900">
            Up and running in four steps
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {STEPS.map((s, i) => (
            <div key={s.n} className="relative rounded-2xl border border-border bg-white p-6">
              <div className="font-heading font-extrabold text-4xl text-primary/15">{s.n}</div>
              <h3 className="font-heading font-bold text-lg text-gray-900 mt-2 mb-2">{s.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              {i < STEPS.length - 1 && (
                <ArrowRight className="hidden lg:block absolute top-1/2 -right-3 text-gray-200" size={22} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────────  MODULES LIST  ───────────────────────── */}
      <section id="modules" className="max-w-7xl mx-auto px-5 sm:px-8 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-block text-primary text-xs font-bold tracking-widest uppercase mb-3">Complete toolkit</div>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-gray-900 mb-4">
              Every module your garage will ever need
            </h2>
            <p className="text-gray-500 text-lg mb-8">
              A single login unlocks your whole operation. Configure it once, then let your team
              work with role-based access to exactly what they need.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-600 text-white font-semibold px-6 py-3 rounded-2xl shadow-lg shadow-primary/25 transition-all"
            >
              Get started <ArrowRight size={17} />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              ['Dashboard', LayoutDashboard], ['Jobcards', FileText], ['Reminders', BellRing],
              ['Customers', UserCircle], ['Estimates', FileSpreadsheet], ['Counter Sale', ShoppingCart],
              ['Inventory', Package], ['Reports', BarChart2], ['Cashbook', BookOpen],
              ['Appointments', Calendar], ['Expenses', CreditCard], ['Masters', Database],
              ['Staff & Roles', Users], ['Settings & Branding', Settings],
            ].map(([label, Ic]) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3">
                <Ic size={17} className="text-primary flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────  CTA  ───────────────────────── */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-16">
        <div className="relative rounded-[2rem] bg-gradient-to-br from-primary to-primary-700 px-6 sm:px-12 py-16 text-center overflow-hidden">
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
          <div className="relative">
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-white mb-4">
              Ready to modernise your garage?
            </h2>
            <p className="text-white/80 text-lg max-w-xl mx-auto mb-9">
              Log in to your portal and start managing jobcards, billing and inventory today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 bg-white text-primary font-bold px-8 py-3.5 rounded-2xl shadow-xl hover:bg-gray-50 transition-all"
              >
                Portal Login <ArrowRight size={18} />
              </Link>
              <Link
                to="/superadmin"
                className="inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white font-semibold px-8 py-3.5 rounded-2xl border border-white/30 backdrop-blur-sm transition-all"
              >
                <ShieldCheck size={18} /> Admin Portal
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────  FOOTER  ───────────────────────── */}
      <footer className="border-t border-border bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
                <Wrench size={18} className="text-white" />
              </div>
              <span className="font-heading font-extrabold text-lg text-gray-900">RECKON MOTORS</span>
            </div>
            <p className="text-sm text-gray-400 max-w-xs">
              The complete management system for modern automotive workshops.
            </p>
          </div>

          <div>
            <div className="font-semibold text-gray-800 text-sm mb-3">Product</div>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#features" className="hover:text-primary">Features</a></li>
              <li><a href="#workflow" className="hover:text-primary">How it works</a></li>
              <li><a href="#modules" className="hover:text-primary">Modules</a></li>
            </ul>
          </div>

          <div>
            <div className="font-semibold text-gray-800 text-sm mb-3">Access</div>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/login" className="hover:text-primary">Portal Login</Link></li>
              <li><Link to="/signup" className="hover:text-primary">Register a garage</Link></li>
              <li><Link to="/superadmin" className="hover:text-primary">Admin Login</Link></li>
            </ul>
          </div>

          <div>
            <div className="font-semibold text-gray-800 text-sm mb-3">Get started</div>
            <p className="text-sm text-gray-400 mb-3">Bring your whole workshop online.</p>
            <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-2.5 transition-all">
              Open the portal <ArrowRight size={15} />
            </Link>
          </div>
        </div>
        <div className="border-t border-border">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
            <span>© {new Date().getFullYear()} RECKON MOTORS · All rights reserved.</span>
            <span className="flex items-center gap-1.5"><Building2 size={13} /> Built for automotive workshops</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
