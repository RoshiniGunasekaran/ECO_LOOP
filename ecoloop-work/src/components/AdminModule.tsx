import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useAdminDashboard } from '../hooks/useAdminDashboard';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  CustomerItem, PartnerItem, IndustryItem, PickupRequest, DIYProject, 
  PricingRate, WasteCategory 
} from '../types';
import { 
  INITIAL_CUSTOMERS, INITIAL_PARTNERS, INITIAL_INDUSTRIES, 
  INITIAL_PICKUP_REQUESTS, INITIAL_DIY_PROJECTS, INITIAL_PRICING_RATES 
} from '../data';
import { 
  ShieldAlert, LayoutDashboard, Users, Truck, Factory, History, Tag, 
  DollarSign, Award, BarChart3, Bell, User, CheckCircle, XCircle, Trash2, 
  Edit3, Play, Plus, RefreshCw, ChevronRight, Check, X, Search, Filter,
  MapPin, Activity, Signal, Clock, FileText, Loader2, UserPlus, PackagePlus, Hammer
} from 'lucide-react';

interface AdminModuleProps {
  onLogout: () => void;
}

const PIE_COLORS = ['#f43f5e', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];

export default function AdminModule({ onLogout }: AdminModuleProps) {
  // Sidebar tabs
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Real Supabase-backed platform overview stats + charts + activity feed
  // (Module 19), and real Customer/Partner/Industry directories with
  // approve/reject/suspend (Module 20) — powers the Dashboard, Customer
  // Database, Partner Verification, and Industry Certification tabs.
  // Every other tab below still reads/writes the DatabaseContext mock
  // (Modules 21–25 scope).
  const {
    loading: dashboardLoading,
    stats,
    pickupsByDay,
    categoryBreakdown,
    recentActivity,
    customers: realCustomers,
    partners: realPartners,
    industries: realIndustries,
    updateUserStatus,
  } = useAdminDashboard();

  // Active Shared States connected to Database Context
  const {
    customers, setCustomers,
    partners, setPartners,
    industries, setIndustries,
    pickups, setPickups,
    diyProjects, setDiyProjects,
    pricingRates, setPricingRates
  } = useDatabase();

  // Simulated Live Activity Logs state
  const [liveLogs, setLiveLogs] = useState([
    { id: 'log-1', timestamp: '01:52:10', partnerId: 'P-101', partnerName: 'Amit Sharma', type: 'info', message: 'Rider is ONLINE at West Bandra Hub' },
    { id: 'log-2', timestamp: '01:45:05', partnerId: 'P-102', partnerName: 'Vikram Singh', type: 'success', message: 'Assigned route REQ-3921 successfully completed' },
    { id: 'log-3', timestamp: '01:38:22', partnerId: 'P-103', partnerName: 'Sanjay Patil', type: 'warning', message: 'Rerouting due to high water-clogging near Thane' },
    { id: 'log-4', timestamp: '01:29:40', partnerId: 'P-101', partnerName: 'Amit Sharma', type: 'success', message: 'Dispatched 450 Kg of Cardboard to Apex Industry' },
    { id: 'log-5', timestamp: '01:12:15', partnerId: 'P-104', partnerName: 'Pooja Patil', type: 'info', message: 'Driver status switched to IDLE near Dadar' },
  ]);

  const [logFilter, setLogFilter] = useState('All');
  const [selectedPartnerIdForLog, setSelectedPartnerIdForLog] = useState('All');

  // Search filter states
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState('All');

  // New Category input form
  const [newCatName, setNewCatName] = useState('');
  const [newCatPrice, setNewCatPrice] = useState('');

  // Manual Driver allocation form state
  const [allocatingPickupId, setAllocatingPickupId] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');

  // Broadcast message form
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'customer' | 'partner' | 'industry'>('all');
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  // Simulation controls state
  const [simulatedPartnerId, setSimulatedPartnerId] = useState('');
  const [simulatedZone, setSimulatedZone] = useState('West Bandra Hub');
  const [customLogMessage, setCustomLogMessage] = useState('');

  // Pricing edit modal state
  const [editingPriceCat, setEditingPriceCat] = useState<WasteCategory | null>(null);
  const [editingPriceVal, setEditingPriceVal] = useState('');

  // Handlers
  const handleToggleUserStatus = (userId: string, role: 'customer' | 'partner' | 'industry') => {
    if (role === 'customer') {
      setCustomers(customers.map(c => {
        if (c.id === userId) {
          const nextS = c.status === 'Active' ? 'Suspended' : 'Active';
          return { ...c, status: nextS as any };
        }
        return c;
      }));
    } else if (role === 'partner') {
      setPartners(partners.map(p => {
        if (p.id === userId) {
          const nextS = p.status === 'Approved' ? 'Suspended' : 'Approved';
          return { ...p, status: nextS as any };
        }
        return p;
      }));
    } else if (role === 'industry') {
      setIndustries(industries.map(i => {
        if (i.id === userId) {
          const nextS = i.status === 'Approved' ? 'Suspended' : 'Approved';
          return { ...i, status: nextS as any };
        }
        return i;
      }));
    }
    alert("User account status updated successfully!");
  };

  const handleApprovePartner = (partnerId: string, action: 'Approved' | 'Suspended') => {
    setPartners(partners.map(p => p.id === partnerId ? { ...p, status: action } : p));
    alert(`Partner profile successfully flagged as: ${action}`);
  };

  const handleApproveIndustry = (industryId: string, action: 'Approved' | 'Suspended') => {
    setIndustries(industries.map(i => i.id === industryId ? { ...i, status: action } : i));
    alert(`Industry corporate credentials successfully flagged as: ${action}`);
  };

  // Module 20 — real approve/reject/suspend for Customer Database, Partner
  // Verification, and Industry Certification. One shared handler since it's
  // the same underlying `profiles.status` write for every role.
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const handleUpdateRealUserStatus = async (userId: string, status: 'Active' | 'Suspended' | 'Pending Approval') => {
    setUpdatingUserId(userId);
    const result = await updateUserStatus(userId, status);
    setUpdatingUserId(null);
    if (!result.success) alert(result.error ?? 'Could not update this account.');
  };

  const matchesUserSearch = (name: string, email: string) =>
    name.toLowerCase().includes(userSearch.toLowerCase()) || email.toLowerCase().includes(userSearch.toLowerCase());
  const matchesUserStatus = (status: string) => userFilter === 'All' || status === userFilter;

  const handleApproveDIY = (diyId: string, action: 'Approved' | 'Rejected') => {
    setDiyProjects(diyProjects.map(proj => {
      if (proj.id === diyId) {
        // Find customer and award points!
        if (action === 'Approved') {
          const awardPoints = 150;
          setCustomers(customers.map(cust => {
            if (cust.id === proj.customerId) {
              return {
                ...cust,
                rewardPoints: cust.rewardPoints + awardPoints
              };
            }
            return cust;
          }));
          return { ...proj, status: action, rewardEarned: awardPoints };
        }
        return { ...proj, status: action };
      }
      return proj;
    }));

    alert(`DIY Project Audit complete! Flagged: ${action}. Points dispatched directly to customer.`);
  };

  const handleAssignDriverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocatingPickupId || !selectedDriverId) return;

    const dr = partners.find(p => p.id === selectedDriverId);
    if (!dr) return;

    setPickups(pickups.map(p => {
      if (p.id === allocatingPickupId) {
        return {
          ...p,
          status: 'Assigned',
          partnerId: dr.id,
          partnerName: dr.name,
          partnerPhone: dr.phone
        };
      }
      return p;
    }));

    setAllocatingPickupId(null);
    setSelectedDriverId('');
    alert("Driver assigned successfully to collection route!");
  };

  const handleBroadcastSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBroadcastSuccess(true);
    setTimeout(() => {
      setBroadcastSuccess(false);
      setBroadcastTitle('');
      setBroadcastMessage('');
    }, 2000);
  };

  const handleUpdatePrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPriceCat) return;

    const val = parseFloat(editingPriceVal);
    if (isNaN(val) || val < 0) {
      alert("Invalid price per kilogram");
      return;
    }

    setPricingRates(pricingRates.map(pr => pr.category === editingPriceCat ? { ...pr, pricePerKg: val, lastUpdated: new Date().toISOString().slice(0, 10) } : pr));
    setEditingPriceCat(null);
    setEditingPriceVal('');
    alert("Market pricing rate revised successfully!");
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const priceVal = parseFloat(newCatPrice);
    if (!newCatName || isNaN(priceVal) || priceVal < 0) {
      alert("Please provide valid category name and price per Kg.");
      return;
    }

    const newRate: PricingRate = {
      category: newCatName as WasteCategory,
      pricePerKg: priceVal,
      lastUpdated: new Date().toISOString().slice(0, 10)
    };

    setPricingRates([...pricingRates, newRate]);
    setNewCatName('');
    setNewCatPrice('');
    alert("New Waste Category successfully listed into active loop index!");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      
      {/* MOBILE HEADER */}
      <header className="md:hidden bg-brand-900 text-brand-50 border-b border-brand-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-1.5">
          <ShieldAlert className="w-5 h-5 text-brand-300 animate-pulse" />
          <span className="font-display font-bold text-sm text-white">EcoLoop Admin</span>
        </div>
        <button onClick={onLogout} className="text-[10px] bg-brand-950 text-brand-100 hover:bg-brand-800 font-bold px-3 py-1.5 rounded-lg border border-brand-800">Logout</button>
      </header>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-brand-900 text-brand-50 border-r border-brand-800 p-5 shrink-0">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center text-white"><ShieldAlert className="w-5 h-5" /></div>
          <div>
            <h2 className="font-display font-extrabold text-sm leading-tight text-white">EcoLoop Central</h2>
            <p className="text-[10px] font-mono text-brand-300 font-bold uppercase tracking-widest">Administrator</p>
          </div>
        </div>

        {/* Links Corridor */}
        <nav className="flex-1 flex flex-col gap-1">
          {[
            { id: 'dashboard', label: 'Overview Metrics', icon: <LayoutDashboard className="w-4 h-4" /> },
            { id: 'customers', label: 'Customer Database', icon: <Users className="w-4 h-4" /> },
            { id: 'partners', label: 'Partner Verification', icon: <Truck className="w-4 h-4" />, badge: stats?.pendingPartnerApprovals ?? 0 },
            { id: 'partners-live', label: 'Live Partners & Logs', icon: <Play className="w-4 h-4 text-emerald-500 animate-pulse" />, badge: partners.filter(p => p.isOnline).length },
            { id: 'industries', label: 'Industry Certification', icon: <Factory className="w-4 h-4" />, badge: stats?.pendingIndustryApprovals ?? 0 },
            { id: 'pickups', label: 'Global Dispatch Log', icon: <History className="w-4 h-4" />, badge: pickups.filter(p => p.status === 'Pending').length },
            { id: 'pricing', label: 'Silo Pricing & Index', icon: <DollarSign className="w-4 h-4" /> },
            { id: 'diy-approvals', label: 'DIY Auditing', icon: <Award className="w-4 h-4 text-brand-300" />, badge: diyProjects.filter(d => d.status === 'Pending').length },
            { id: 'broadcast', label: 'Broadcaster System', icon: <Bell className="w-4 h-4" /> },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition ${
                activeTab === item.id 
                  ? 'bg-brand-800 text-white shadow-lg font-bold' 
                  : 'text-brand-200 hover:text-white hover:bg-brand-800/60'
              }`}
            >
              <span className="flex items-center gap-3">
                {item.icon}
                <span>{item.label}</span>
              </span>
              {!!item.badge && (
                <span className="bg-rose-500 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="border-t border-brand-800 pt-4 flex flex-col gap-1 text-[10px] text-brand-300">
          <button onClick={onLogout} className="text-xs bg-brand-950 border border-brand-800 hover:bg-brand-800 font-bold py-2 rounded-xl text-brand-200 hover:text-white transition mt-2">
            Logout Control Panel
          </button>
        </div>
      </aside>

      {/* MOBILE NAVIGATION TABFOOTER */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 py-2.5 px-4 flex justify-around items-center z-40 shadow-xl">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'dashboard' ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-[9px]">Overview</span>
        </button>
        <button onClick={() => setActiveTab('customers')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'customers' ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
          <Users className="w-4 h-4" />
          <span className="text-[9px]">Customers</span>
        </button>
        <button onClick={() => setActiveTab('partners-live')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'partners-live' ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
          <Play className="w-4 h-4 text-emerald-600 animate-pulse" />
          <span className="text-[9px]">Live Partners</span>
        </button>
        <button onClick={() => setActiveTab('pickups')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'pickups' ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
          <History className="w-4 h-4" />
          <span className="text-[9px]">Dispatch</span>
        </button>
        <button onClick={() => setActiveTab('pricing')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'pricing' ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
          <DollarSign className="w-4 h-4" />
          <span className="text-[9px]">Pricing</span>
        </button>
      </nav>

      {/* CORE WORKSPACE */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-h-screen overflow-y-auto">
        
        {/* DASHBOARD VIEW — Module 19 */}
        {activeTab === 'dashboard' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-extrabold text-slate-900">Administrator Control Cabin</h1>
              <p className="text-xs text-slate-500 mt-1">Global ecosystem oversight across certified users, dispatch loops, and financial ledgers.</p>
            </div>

            {dashboardLoading || !stats ? (
              <div className="py-20 flex flex-col items-center gap-3 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin" />
                <p className="text-xs font-semibold uppercase tracking-wider">Loading platform overview…</p>
              </div>
            ) : (
              <>
                {/* QUICK STATS METRICS BENTO */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between h-28">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Total Customers</span>
                    <div className="mt-2">
                      <p className="text-xl sm:text-2xl font-bold font-mono text-slate-900">{stats.totalCustomers}</p>
                      <button onClick={() => setActiveTab('customers')} className="text-[10px] text-rose-600 font-bold hover:underline flex items-center gap-1 mt-1">Manage Database <ChevronRight className="w-3 h-3" /></button>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between h-28">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Pending Drivers</span>
                    <div className="mt-2">
                      <p className="text-xl sm:text-2xl font-bold font-mono text-rose-600">{stats.pendingPartnerApprovals}</p>
                      <button onClick={() => setActiveTab('partners')} className="text-[10px] text-slate-500 font-bold hover:underline flex items-center gap-1 mt-1">Review Profiles <ChevronRight className="w-3 h-3" /></button>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between h-28">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Unassigned Pickups</span>
                    <div className="mt-2">
                      <p className="text-xl sm:text-2xl font-bold font-mono text-slate-900">{stats.unassignedPickups}</p>
                      <button onClick={() => setActiveTab('pickups')} className="text-[10px] text-slate-500 font-bold hover:underline flex items-center gap-1 mt-1">Manual Allocation <ChevronRight className="w-3 h-3" /></button>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between h-28">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Unverified DIY Crafts</span>
                    <div className="mt-2">
                      <p className="text-xl sm:text-2xl font-bold font-mono text-slate-900">{stats.pendingDIYSubmissions}</p>
                      <button onClick={() => setActiveTab('diy-approvals')} className="text-[10px] text-slate-500 font-bold hover:underline flex items-center gap-1 mt-1">Perform Auditing <ChevronRight className="w-3 h-3" /></button>
                    </div>
                  </div>
                </div>

                {/* DASHBOARD CHARTS — Analytics & Charts (Tasks 19.2/19.3) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Pickup Requests — Last 7 Days</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Real submission volume across the whole platform.</p>
                    </div>
                    <div className="h-44 w-full text-xs">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={pickupsByDay} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                          <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                            labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                          />
                          <Bar dataKey="count" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={22} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Waste Category Breakdown</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">All-time pickup requests by category, platform-wide.</p>
                    </div>
                    <div className="h-44 flex items-center justify-around gap-2 text-xs">
                      {categoryBreakdown.length === 0 ? (
                        <div className="w-full h-full flex items-center justify-center text-center text-[10px] text-slate-400 px-4">
                          No pickups yet — this chart fills in once the first pickup is recorded.
                        </div>
                      ) : (
                        <>
                          <div className="w-1/2 h-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={categoryBreakdown} dataKey="count" nameKey="category" cx="50%" cy="50%" innerRadius={30} outerRadius={55}>
                                  {categoryBreakdown.map((entry, index) => (
                                    <Cell key={entry.category} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex flex-col gap-1.5 text-[10px]">
                            {categoryBreakdown.slice(0, 6).map((entry, index) => (
                              <div key={entry.category} className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                                <span className="text-slate-600 font-semibold">{entry.category}</span>
                                <span className="text-slate-400 font-mono">({entry.count})</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* AUDIT SKELETON */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                  {/* DIY AUDITING CARD MINI */}
                  <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-4">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">DIY Craft Audit Queue</h3>
                    <div className="flex flex-col gap-2">
                      {diyProjects.filter(d => d.status === 'Pending').map((p) => (
                        <div key={p.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs gap-3">
                          <div>
                            <h4 className="font-bold text-slate-800">{p.projectName}</h4>
                            <p className="text-[10px] text-slate-500 truncate max-w-[200px]">By: {p.customerName}</p>
                          </div>
                          <button onClick={() => setActiveTab('diy-approvals')} className="bg-rose-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg">
                            Audit
                          </button>
                        </div>
                      ))}
                      {diyProjects.filter(d => d.status === 'Pending').length === 0 && (
                        <div className="py-8 text-center text-slate-400 text-xs">All DIY submissions successfully audited!</div>
                      )}
                    </div>
                  </div>

                  {/* REVENUE OVERVIEW METRICS */}
                  <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Platform Revenue Log</h3>
                    <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between text-xs font-mono">
                      <div>
                        <span className="block text-[8px] text-rose-400 font-bold uppercase">All-time collection revenue</span>
                        <strong className="text-lg font-bold font-mono">₹{stats.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                      </div>
                      <span className="text-[10px] text-slate-400">Sum of Paid pickups</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-mono mt-1">
                      <p>PARTNERS: <b className="text-slate-800">{stats.totalPartners}</b></p>
                      <p>INDUSTRIES: <b className="text-slate-800">{stats.totalIndustries}</b></p>
                    </div>
                  </div>

                </div>

                {/* RECENT PLATFORM ACTIVITY — Activity logs (Task 19.4) */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-rose-500" /> Recent Platform Activity
                  </h3>
                  <div className="flex flex-col gap-2">
                    {recentActivity.map((event) => (
                      <div key={event.id} className="flex items-center gap-3 text-xs p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          event.type === 'signup' ? 'bg-brand-50 text-brand-600' : event.type === 'pickup' ? 'bg-amber-50 text-amber-600' : 'bg-purple-50 text-purple-600'
                        }`}>
                          {event.type === 'signup' && <UserPlus className="w-3.5 h-3.5" />}
                          {event.type === 'pickup' && <PackagePlus className="w-3.5 h-3.5" />}
                          {event.type === 'diy' && <Hammer className="w-3.5 h-3.5" />}
                        </span>
                        <span className="text-slate-700 font-medium flex-1">{event.message}</span>
                        <span className="text-[9px] text-slate-400 font-mono shrink-0">{new Date(event.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ))}
                    {recentActivity.length === 0 && (
                      <div className="py-8 text-center text-slate-400 text-xs">No platform activity recorded yet.</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* CUSTOMER DATABASE TAB — Module 20 */}
        {activeTab === 'customers' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl font-display font-extrabold text-slate-900">Customer Account Directories</h1>
                <p className="text-xs text-slate-500">View balances, accumulated points, and toggle account bans.</p>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input type="text" placeholder="Search name or email…" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs w-56 focus:outline-none focus:ring-2 focus:ring-rose-500" />
                </div>
                <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500">
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>

            {dashboardLoading ? (
              <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <p className="text-xs font-semibold uppercase tracking-wider">Loading customer directory…</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {realCustomers.filter((c) => matchesUserSearch(c.name, c.email) && matchesUserStatus(c.status)).map((c) => (
                  <div key={c.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs flex flex-col justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img className="w-10 h-10 rounded-full object-cover border border-slate-100 shadow-inner" src={c.profilePic || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(c.name)} alt="customer" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">{c.name}</h4>
                        <p className="text-[9px] text-slate-400 font-mono">{c.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono bg-slate-50 p-2 rounded-xl">
                      <div>
                        <span className="block text-slate-400 text-[8px] uppercase">Balance</span>
                        <strong className="text-slate-700">₹{c.walletBalance.toFixed(2)}</strong>
                      </div>
                      <div>
                        <span className="block text-slate-400 text-[8px] uppercase">Points</span>
                        <strong className="text-slate-700">{c.rewardPoints} XP</strong>
                      </div>
                      <div>
                        <span className="block text-slate-400 text-[8px] uppercase">Status</span>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold ${c.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{c.status}</span>
                      </div>
                    </div>

                    <div className="flex gap-1.5 justify-end mt-1 border-t border-slate-50 pt-2">
                      <button
                        onClick={() => handleUpdateRealUserStatus(c.id, c.status === 'Active' ? 'Suspended' : 'Active')}
                        disabled={updatingUserId === c.id}
                        className={`text-[9px] font-bold px-3 py-1.5 rounded-lg transition disabled:opacity-60 ${
                          c.status === 'Active' ? 'bg-rose-50 border border-rose-100 text-rose-700' : 'bg-slate-900 text-white'
                        }`}
                      >
                        {updatingUserId === c.id ? 'Saving…' : c.status === 'Active' ? 'Suspend Account' : 'Re-Activate'}
                      </button>
                    </div>
                  </div>
                ))}
                {realCustomers.length === 0 && (
                  <div className="col-span-3 py-12 text-center text-slate-400 text-xs">No customer accounts yet.</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PARTNERS QUEUE — Module 20 */}
        {activeTab === 'partners' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl font-display font-extrabold text-slate-900">Partner driver Verification Queue</h1>
                <p className="text-xs text-slate-500">Audit driving licenses and background national identity numbers before driver dispatch clearances.</p>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input type="text" placeholder="Search name or email…" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs w-56 focus:outline-none focus:ring-2 focus:ring-rose-500" />
                </div>
                <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500">
                  <option value="All">All Statuses</option>
                  <option value="Active">Approved</option>
                  <option value="Pending Approval">Pending Approval</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>

            {dashboardLoading ? (
              <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <p className="text-xs font-semibold uppercase tracking-wider">Loading partner directory…</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {realPartners.filter((p) => matchesUserSearch(p.name, p.email) && matchesUserStatus(p.status)).map((p) => (
                  <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img className="w-10 h-10 rounded-full object-cover" src={p.profilePic || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(p.name)} alt="partner" />
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">{p.name}</h4>
                          <p className="text-[10px] text-slate-400 font-mono">{p.vehicleType ?? '—'} ({p.vehicleNumber ?? '—'})</p>
                        </div>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase font-mono ${
                        p.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : p.status === 'Suspended' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>{p.status === 'Active' ? 'Approved' : p.status}</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[10px] font-mono leading-relaxed flex flex-col gap-1">
                      <p>DRIVER LICENSE ID: {p.drivingLicense ?? '—'}</p>
                      <p>NATIONAL ID CODE: {p.aadhaarNumber ?? '—'}</p>
                    </div>

                    {p.status === 'Pending Approval' && (
                      <div className="flex gap-2 justify-end mt-1 border-t border-slate-50 pt-3">
                        <button onClick={() => handleUpdateRealUserStatus(p.id, 'Suspended')} disabled={updatingUserId === p.id} className="bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-bold px-3 py-1.5 rounded-xl transition disabled:opacity-60">Reject Profile</button>
                        <button onClick={() => handleUpdateRealUserStatus(p.id, 'Active')} disabled={updatingUserId === p.id} className="bg-rose-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-xl transition shadow-xs disabled:opacity-60">{updatingUserId === p.id ? 'Saving…' : 'Approve and Dispatch'}</button>
                      </div>
                    )}
                    {p.status === 'Active' && (
                      <div className="flex gap-2 justify-end mt-1 border-t border-slate-50 pt-3">
                        <button onClick={() => handleUpdateRealUserStatus(p.id, 'Suspended')} disabled={updatingUserId === p.id} className="bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-bold px-3 py-1.5 rounded-xl transition disabled:opacity-60">{updatingUserId === p.id ? 'Saving…' : 'Suspend Driver'}</button>
                      </div>
                    )}
                    {p.status === 'Suspended' && (
                      <div className="flex gap-2 justify-end mt-1 border-t border-slate-50 pt-3">
                        <button onClick={() => handleUpdateRealUserStatus(p.id, 'Active')} disabled={updatingUserId === p.id} className="bg-slate-900 text-white text-[10px] font-bold px-4 py-1.5 rounded-xl transition disabled:opacity-60">{updatingUserId === p.id ? 'Saving…' : 'Re-Activate Driver'}</button>
                      </div>
                    )}
                  </div>
                ))}
                {realPartners.length === 0 && (
                  <div className="col-span-2 py-12 text-center text-slate-400 text-xs">No partner accounts yet.</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* INDUSTRIES TAB — Module 20 */}
        {activeTab === 'industries' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl font-display font-extrabold text-slate-900">Industry certification management</h1>
                <p className="text-xs text-slate-500">Audit corporate registration license IDs, GST numbers, and environmental recycling scopes.</p>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input type="text" placeholder="Search name or email…" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs w-56 focus:outline-none focus:ring-2 focus:ring-rose-500" />
                </div>
                <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500">
                  <option value="All">All Statuses</option>
                  <option value="Active">Approved</option>
                  <option value="Pending Approval">Pending Approval</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>

            {dashboardLoading ? (
              <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <p className="text-xs font-semibold uppercase tracking-wider">Loading industry directory…</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {realIndustries.filter((ind) => matchesUserSearch(ind.companyName, ind.email) && matchesUserStatus(ind.status)).map((ind) => (
                  <div key={ind.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col justify-between gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 text-2xl border">🏭</div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">{ind.companyName}</h4>
                          <p className="text-[10px] text-slate-400 font-mono">{ind.industryType ?? '—'}</p>
                        </div>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase font-mono ${
                        ind.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : ind.status === 'Suspended' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                      }`}>{ind.status === 'Active' ? 'Approved' : ind.status}</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[10px] font-mono flex flex-col gap-1">
                      <p>GST REGISTER ID: {ind.gstNumber ?? '—'}</p>
                      <p>FACILITY LOGISTICS: {ind.address ?? '—'}</p>
                    </div>

                    {ind.status === 'Pending Approval' && (
                      <div className="flex gap-2 justify-end border-t border-slate-50 pt-3">
                        <button onClick={() => handleUpdateRealUserStatus(ind.id, 'Suspended')} disabled={updatingUserId === ind.id} className="bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-bold px-3 py-1.5 rounded-xl transition disabled:opacity-60">Reject Corporate Account</button>
                        <button onClick={() => handleUpdateRealUserStatus(ind.id, 'Active')} disabled={updatingUserId === ind.id} className="bg-rose-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-xl transition shadow-xs disabled:opacity-60">{updatingUserId === ind.id ? 'Saving…' : 'Authorize Industry Certificate'}</button>
                      </div>
                    )}
                    {ind.status === 'Active' && (
                      <div className="flex gap-2 justify-end border-t border-slate-50 pt-3">
                        <button onClick={() => handleUpdateRealUserStatus(ind.id, 'Suspended')} disabled={updatingUserId === ind.id} className="bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-bold px-3 py-1.5 rounded-xl transition disabled:opacity-60">{updatingUserId === ind.id ? 'Saving…' : 'Suspend Facility'}</button>
                      </div>
                    )}
                    {ind.status === 'Suspended' && (
                      <div className="flex gap-2 justify-end border-t border-slate-50 pt-3">
                        <button onClick={() => handleUpdateRealUserStatus(ind.id, 'Active')} disabled={updatingUserId === ind.id} className="bg-slate-900 text-white text-[10px] font-bold px-4 py-1.5 rounded-xl transition disabled:opacity-60">{updatingUserId === ind.id ? 'Saving…' : 'Re-Activate Facility'}</button>
                      </div>
                    )}
                  </div>
                ))}
                {realIndustries.length === 0 && (
                  <div className="col-span-2 py-12 text-center text-slate-400 text-xs">No industry accounts yet.</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PRICE INDEX MANAGEMENT */}
        {activeTab === 'pricing' && (
          <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* PRICES INDEX TAB */}
              <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Dynamic price index per kilogram</h3>
                <div className="flex flex-col gap-2">
                  {pricingRates.map((pr) => (
                    <div key={pr.category} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-300 transition-all flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700">{pr.category}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-lg">₹{pr.pricePerKg.toFixed(2)}/Kg</span>
                        <button 
                          onClick={() => { setEditingPriceCat(pr.category); setEditingPriceVal(pr.pricePerKg.toString()); }}
                          className="p-1 rounded bg-white hover:bg-slate-100 text-slate-500 border"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ADD NEW CATEGORY */}
              <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">List New waste category</h3>
                <form onSubmit={handleAddCategory} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Category Name</label>
                    <input type="text" required placeholder="e.g. Copper Wire" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Base Price per Kg (₹)</label>
                    <input type="number" step="0.01" required placeholder="0.80" value={newCatPrice} onChange={(e) => setNewCatPrice(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none" />
                  </div>
                  <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] py-2 rounded-xl transition shadow-sm mt-1">
                    Register New Category
                  </button>
                </form>
              </div>

            </div>

            {/* Price Edit Modal popup */}
            {editingPriceCat && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-sm w-full p-6 flex flex-col gap-4 animate-scale-up relative">
                  <button onClick={() => setEditingPriceCat(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
                  <h3 className="font-display text-sm font-bold text-slate-900 uppercase">Revise price: {editingPriceCat}</h3>
                  <form onSubmit={handleUpdatePrice} className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Price per Kilogram (₹)</label>
                      <input type="number" step="0.01" required value={editingPriceVal} onChange={(e) => setEditingPriceVal(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold" />
                    </div>
                    <button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2 rounded-xl transition">
                      Confirm Price Adjustment
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DIY AUDITING DECK */}
        {activeTab === 'diy-approvals' && (
          <div className="max-w-4xl mx-auto flex flex-col gap-4 animate-fade-in">
            <div>
              <h1 className="text-xl font-display font-extrabold text-slate-900">DIY Eco Craft Audit Board</h1>
              <p className="text-xs text-slate-500 mt-1">Audit customer-submitted recycling crafts. Award points dynamically upon approving submissions.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {diyProjects.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs flex flex-col">
                  <div className="grid grid-cols-2 gap-0.5">
                    <img className="h-40 w-full object-cover" src={p.beforeImage} alt="before" />
                    <img className="h-40 w-full object-cover" src={p.afterImage} alt="after" />
                  </div>

                  <div className="p-4 flex flex-col gap-3">
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-slate-400 font-mono">DIY ID: {p.id}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${p.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{p.status}</span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800 mt-1">{p.projectName}</h4>
                      <p className="text-[10px] text-slate-500 leading-relaxed mt-1">{p.projectDescription}</p>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/60 text-[10px] font-mono leading-relaxed">
                      <p>CUSTOMER: {p.customerName}</p>
                      <p>BENEFIT: {p.benefits}</p>
                    </div>

                    {p.status === 'Pending' && (
                      <div className="flex gap-2 justify-end border-t border-slate-50 pt-3 mt-1">
                        <button onClick={() => handleApproveDIY(p.id, 'Rejected')} className="bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-bold px-3 py-1.5 rounded-xl transition">Reject Craft</button>
                        <button onClick={() => handleApproveDIY(p.id, 'Approved')} className="bg-rose-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-xl transition shadow-xs">Approve & Dispatch points</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GLOBAL DISPATCH / PICKUP MANUAL ASSIGNMENT */}
        {activeTab === 'pickups' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <div>
              <h1 className="text-xl font-display font-extrabold text-slate-900">Global dispatch logistics portal</h1>
              <p className="text-xs text-slate-500 mt-1">Review active household pickups. Manually override or assign local drivers to pending schedules.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pickups.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-slate-400 font-mono">REQ ID: {p.id}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${p.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{p.status}</span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-800 mt-2">{p.customerName} · {p.category}</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed truncate mt-0.5">{p.pickupAddress}</p>
                  </div>

                  <div className="border-t border-slate-50 pt-3 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-slate-400 font-mono">Assigned Partner</p>
                      <p className="text-xs font-bold text-slate-700">{p.partnerName || 'None'}</p>
                    </div>

                    {p.status === 'Pending' && (
                      <button 
                        onClick={() => setAllocatingPickupId(p.id)}
                        className="bg-rose-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-rose-700 transition shadow-xs"
                      >
                        Assign Driver
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Allocation driver select dialog popup */}
            {allocatingPickupId && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-sm w-full p-6 flex flex-col gap-4 animate-scale-up relative">
                  <button onClick={() => setAllocatingPickupId(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
                  <h3 className="font-display text-sm font-bold text-slate-900 uppercase">Select Eco Driver for REQ: {allocatingPickupId}</h3>
                  <form onSubmit={handleAssignDriverSubmit} className="flex flex-col gap-4">
                    <select 
                      value={selectedDriverId} 
                      onChange={(e) => setSelectedDriverId(e.target.value)} 
                      required
                      className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none"
                    >
                      <option value="">-- Choose Online Driver --</option>
                      {partners.filter(p => p.status === 'Approved' && p.isOnline).map((dr) => (
                        <option key={dr.id} value={dr.id}>{dr.name} ({dr.vehicleType})</option>
                      ))}
                    </select>
                    <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl shadow-md">
                      Confirm Dispatch Allocation
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* BROADCASTER SYSTEM PANEL */}
        {activeTab === 'broadcast' && (
          <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl border border-slate-100 shadow-xl flex flex-col gap-4 animate-fade-in">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-mono">Global Broadcast Centre</h2>
              <p className="text-xs text-slate-500 mt-0.5">Push real-time push alerts, offers, or announcements across platform roles immediately.</p>
            </div>

            {broadcastSuccess ? (
              <div className="py-8 text-center flex flex-col items-center gap-2">
                <Check className="w-8 h-8 text-emerald-600 bg-emerald-100 rounded-full p-1" />
                <h4 className="text-xs font-bold text-slate-800">Broadcast Transmitted Successfully!</h4>
              </div>
            ) : (
              <form onSubmit={handleBroadcastSubmit} className="flex flex-col gap-4 mt-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Target Audience</label>
                  <select 
                    value={broadcastTarget}
                    onChange={(e: any) => setBroadcastTarget(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none"
                  >
                    <option value="all">Every registered user (Public & All)</option>
                    <option value="customer">Customers only</option>
                    <option value="partner">Delivery partners only</option>
                    <option value="industry">Recycling Industries only</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Broadcast Title</label>
                  <input type="text" required placeholder="e.g. Summer recycling bonus active!" value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none" />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Message description</label>
                  <textarea rows={4} required placeholder="Enter push-notification message description..." value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none"></textarea>
                </div>

                <button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-md">
                  Transmit Broadcast Message
                </button>
              </form>
            )}
          </div>
        )}

        {/* LIVE PARTNERS & LOGS SYSTEM TAB */}
        {activeTab === 'partners-live' && (
          <div className="flex flex-col gap-6 animate-fade-in pb-16">
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-extrabold text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                Live Partner Monitoring & GPS Dispatch Logs
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Audit real-time delivery status, trigger simulated telemetry pings, toggle active shifts, and search systemic event logs.
              </p>
            </div>

            {/* STAT HIGHLIGHTS GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs flex flex-col justify-between">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Total Drivers</span>
                <div className="mt-2">
                  <p className="text-xl sm:text-2xl font-bold font-mono text-slate-900">{partners.length}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Approved in system</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs flex flex-col justify-between">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Active Shifts (Online)</span>
                <div className="mt-2">
                  <p className="text-xl sm:text-2xl font-bold font-mono text-emerald-600">
                    {partners.filter(p => p.isOnline).length}
                  </p>
                  <p className="text-[10px] text-emerald-500 font-semibold mt-0.5">Transmit live coordinates</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs flex flex-col justify-between">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Completed Pickups</span>
                <div className="mt-2">
                  <p className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
                    {partners.reduce((sum, p) => sum + (p.completedPickups || 0), 0)}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Cumulative successful runs</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs flex flex-col justify-between">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Total Fleet Distance</span>
                <div className="mt-2">
                  <p className="text-xl sm:text-2xl font-bold font-mono text-rose-600">
                    {partners.reduce((sum, p) => sum + (p.distanceTraveled || 0), 0)} Km
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Total distance covered</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT COLUMN: SIMULATOR & FORCE COMMANDS */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                
                {/* PARTNER CONTROL BOX */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Activity className="w-4 h-4 text-rose-500" />
                    Shift Status & Remote Overrides
                  </h3>

                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Select Target Partner</label>
                      <select 
                        value={simulatedPartnerId || (partners[0]?.id || '')}
                        onChange={(e) => setSimulatedPartnerId(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                      >
                        <option value="">-- Choose Delivery Partner --</option>
                        {partners.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.vehicleType} · {p.isOnline ? '🟢 ONLINE' : '⚪ OFFLINE'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quick Info of Selected Partner */}
                    {(() => {
                      const selId = simulatedPartnerId || (partners[0]?.id || '');
                      const selPartner = partners.find(p => p.id === selId);
                      if (!selPartner) return null;

                      return (
                        <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex flex-col gap-2.5 text-xs">
                          <div className="flex justify-between items-center">
                            <div>
                              <strong className="block text-slate-800">{selPartner.name}</strong>
                              <span className="text-[10px] text-slate-400 font-mono">{selPartner.vehicleNumber} ({selPartner.vehicleType})</span>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                              selPartner.isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {selPartner.isOnline ? 'Online Shift' : 'Offline'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-mono">
                            <p>TODAY: <b className="text-slate-800">{selPartner.todayPickups || 0}</b> pickups</p>
                            <p>COMPLETED: <b className="text-slate-800">{selPartner.completedPickups || 0}</b> total</p>
                            <p>DISTANCE: <b className="text-slate-800">{selPartner.distanceTraveled || 0}</b> Km</p>
                            <p>REVENUE: <b className="text-slate-800">₹{selPartner.earnings || 0}</b></p>
                          </div>

                          <div className="border-t border-slate-100 pt-2.5 mt-1">
                            <button
                              onClick={() => {
                                const nextOnline = !selPartner.isOnline;
                                setPartners(partners.map(p => p.id === selPartner.id ? { ...p, isOnline: nextOnline } : p));
                                const timeStr = new Date().toTimeString().split(' ')[0];
                                const logMsg = {
                                  id: `log-${Date.now()}`,
                                  timestamp: timeStr,
                                  partnerId: selPartner.id,
                                  partnerName: selPartner.name,
                                  type: nextOnline ? 'info' : 'warning',
                                  message: `Shift status manually set to ${nextOnline ? 'ONLINE' : 'OFFLINE'} via administrator override.`
                                };
                                setLiveLogs([logMsg, ...liveLogs]);
                              }}
                              className={`w-full text-center text-xs font-bold py-2 rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 ${
                                selPartner.isOnline 
                                  ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200' 
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                            >
                              <Signal className="w-3.5 h-3.5" />
                              <span>{selPartner.isOnline ? 'Force Drivers Offline' : 'Force Drivers Online'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* TELEMETRY SIMULATOR PANEL */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2 border-b border-slate-100 pb-3">
                    <MapPin className="w-4 h-4 text-emerald-500 animate-bounce" />
                    Telemetry & GPS Route Simulator
                  </h3>

                  <div className="flex flex-col gap-3 text-xs">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Simulated Hub/Zone</label>
                      <select 
                        value={simulatedZone}
                        onChange={(e) => setSimulatedZone(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                      >
                        <option value="West Bandra Hub">West Bandra Hub (Zone A)</option>
                        <option value="South Mumbai Marine Drive">South Mumbai Marine Drive (Zone B)</option>
                        <option value="Andheri East Industrial Complex">Andheri East Industrial Complex (Zone C)</option>
                        <option value="Thane Logistics Highway">Thane Logistics Highway (Zone D)</option>
                        <option value="Dadar Central Depot">Dadar Central Depot (Zone E)</option>
                        <option value="Colaba Coast Road">Colaba Coast Road (Zone F)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
                      <button
                        onClick={() => {
                          const selId = simulatedPartnerId || (partners[0]?.id || '');
                          const selPartner = partners.find(p => p.id === selId);
                          if (!selPartner) {
                            alert("Select a driver to simulate GPS.");
                            return;
                          }
                          const timeStr = new Date().toTimeString().split(' ')[0];
                          const logMsg = {
                            id: `log-${Date.now()}`,
                            timestamp: timeStr,
                            partnerId: selPartner.id,
                            partnerName: selPartner.name,
                            type: 'success',
                            message: `Telemetry update: GPS ping reported successfully at ${simulatedZone}. Lat: ${(19.0 + Math.random() * 0.1).toFixed(4)}, Lng: ${(72.8 + Math.random() * 0.1).toFixed(4)}. Speed: ${Math.floor(25 + Math.random() * 30)} Km/h.`
                          };
                          setLiveLogs([logMsg, ...liveLogs]);
                        }}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-xl text-[10px] text-center transition"
                      >
                        Trigger GPS Ping
                      </button>

                      <button
                        onClick={() => {
                          const selId = simulatedPartnerId || (partners[0]?.id || '');
                          const selPartner = partners.find(p => p.id === selId);
                          if (!selPartner) {
                            alert("Select a driver to load cargo.");
                            return;
                          }
                          const timeStr = new Date().toTimeString().split(' ')[0];
                          const cargoWeight = Math.floor(40 + Math.random() * 160);
                          const earningsAwarded = 350;
                          const logMsg = {
                            id: `log-${Date.now()}`,
                            timestamp: timeStr,
                            partnerId: selPartner.id,
                            partnerName: selPartner.name,
                            type: 'success',
                            message: `Cargo loaded: Picked up ${cargoWeight} Kg of assorted recyclables. Dispatched route towards sorting silo. Partner earnings updated (+₹${earningsAwarded}).`
                          };
                          setPartners(partners.map(p => p.id === selPartner.id ? {
                            ...p,
                            completedPickups: p.completedPickups + 1,
                            earnings: p.earnings + earningsAwarded,
                            distanceTraveled: p.distanceTraveled + Math.floor(5 + Math.random() * 8)
                          } : p));
                          setLiveLogs([logMsg, ...liveLogs]);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-[10px] text-center transition"
                      >
                        Simulate Cargo Loaded
                      </button>

                      <button
                        onClick={() => {
                          const selId = simulatedPartnerId || (partners[0]?.id || '');
                          const selPartner = partners.find(p => p.id === selId);
                          if (!selPartner) {
                            alert("Select a driver to report warnings.");
                            return;
                          }
                          const timeStr = new Date().toTimeString().split(' ')[0];
                          const warningsList = [
                            `High traffic gridlock reported near ${simulatedZone}. Latency: +15mins.`,
                            `Severe route vibration detected on chassis at ${simulatedZone}. Sensor warning triggered.`,
                            `Speed thresh exceeded: vehicle reached 65 Km/h in narrow zone at ${simulatedZone}. Warning issued.`,
                            `Low signal telemetry warning near basement collection silo of ${simulatedZone}.`
                          ];
                          const chosenWarn = warningsList[Math.floor(Math.random() * warningsList.length)];
                          const logMsg = {
                            id: `log-${Date.now()}`,
                            timestamp: timeStr,
                            partnerId: selPartner.id,
                            partnerName: selPartner.name,
                            type: 'warning',
                            message: chosenWarn
                          };
                          setLiveLogs([logMsg, ...liveLogs]);
                        }}
                        className="bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold py-2 rounded-xl text-[10px] text-center transition"
                      >
                        Log Speed/Traffic Warning
                      </button>
                    </div>
                  </div>
                </div>

                {/* POST CUSTOM SYSTEM LOGS */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2 border-b border-slate-100 pb-3">
                    <FileText className="w-4 h-4 text-brand-600" />
                    Write Custom Dispatch Event Log
                  </h3>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const selId = simulatedPartnerId || (partners[0]?.id || '');
                      const selPartner = partners.find(p => p.id === selId);
                      if (!selPartner || !customLogMessage.trim()) return;

                      const timeStr = new Date().toTimeString().split(' ')[0];
                      const logMsg = {
                        id: `log-${Date.now()}`,
                        timestamp: timeStr,
                        partnerId: selPartner.id,
                        partnerName: selPartner.name,
                        type: 'info',
                        message: customLogMessage
                      };
                      setLiveLogs([logMsg, ...liveLogs]);
                      setCustomLogMessage('');
                    }}
                    className="flex flex-col gap-3 text-xs"
                  >
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Grievance / Telemetry Message</label>
                      <input 
                        type="text"
                        required
                        placeholder="e.g. Completed container offloading to GreenCorp factory..."
                        value={customLogMessage}
                        onChange={(e) => setCustomLogMessage(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!customLogMessage.trim()}
                      className="bg-rose-600 disabled:opacity-40 hover:bg-rose-700 text-white font-bold py-2 rounded-xl text-xs transition shadow-xs"
                    >
                      Post System Log Event
                    </button>
                  </form>
                </div>

              </div>

              {/* RIGHT COLUMN: ACTIVE EVENT LOG STREAM */}
              <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400 animate-spin-slow" />
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                        Systemic dispatch event log stream
                      </h3>
                      <p className="text-[9px] text-slate-400 font-mono">UPDATED SECONDS AGO · REALTIME DATA</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setLiveLogs([]);
                    }}
                    className="text-[10px] text-slate-500 hover:text-rose-600 font-bold border border-slate-200 hover:border-rose-100 px-3 py-1 rounded-lg hover:bg-rose-50 transition"
                  >
                    Clear Feed
                  </button>
                </div>

                {/* FILTERS TOOLBAR */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Severity Filter</span>
                    <select 
                      value={logFilter}
                      onChange={(e) => setLogFilter(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg p-1.5 text-xs focus:outline-none"
                    >
                      <option value="All">All Event Classes</option>
                      <option value="info">Info Logs only</option>
                      <option value="success">Success / Clearance</option>
                      <option value="warning">Warning / Anomalies</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Filter by Partner Name</span>
                    <select 
                      value={selectedPartnerIdForLog}
                      onChange={(e) => setSelectedPartnerIdForLog(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg p-1.5 text-xs focus:outline-none"
                    >
                      <option value="All">All Delivery Partners</option>
                      {partners.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* LOGS LIST FEED CONTAINER */}
                <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {(() => {
                    const filtered = liveLogs.filter((log) => {
                      if (logFilter !== 'All' && log.type !== logFilter) return false;
                      if (selectedPartnerIdForLog !== 'All' && log.partnerId !== selectedPartnerIdForLog) return false;
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="py-16 text-center flex flex-col items-center justify-center gap-2">
                          <Activity className="w-8 h-8 text-slate-300" />
                          <p className="text-xs text-slate-400 font-medium">No event logs matching filters found.</p>
                          <button 
                            onClick={() => {
                              setLogFilter('All');
                              setSelectedPartnerIdForLog('All');
                              setLiveLogs([
                                { id: 'log-1', timestamp: '01:52:10', partnerId: 'P-101', partnerName: 'Amit Sharma', type: 'info', message: 'Rider is ONLINE at West Bandra Hub' },
                                { id: 'log-2', timestamp: '01:45:05', partnerId: 'P-102', partnerName: 'Vikram Singh', type: 'success', message: 'Assigned route REQ-3921 successfully completed' },
                                { id: 'log-3', timestamp: '01:38:22', partnerId: 'P-103', partnerName: 'Sanjay Patil', type: 'warning', message: 'Rerouting due to high water-clogging near Thane' },
                                { id: 'log-4', timestamp: '01:29:40', partnerId: 'P-101', partnerName: 'Amit Sharma', type: 'success', message: 'Dispatched 450 Kg of Cardboard to Apex Industry' },
                                { id: 'log-5', timestamp: '01:12:15', partnerId: 'P-104', partnerName: 'Pooja Patil', type: 'info', message: 'Driver status switched to IDLE near Dadar' },
                              ]);
                            }}
                            className="text-[10px] text-rose-600 font-bold hover:underline"
                          >
                            Restore Default System Logs
                          </button>
                        </div>
                      );
                    }

                    return filtered.map((log) => {
                      let typeBg = 'bg-slate-50 text-slate-700 border-slate-100';
                      let typeLabel = 'INFO';
                      if (log.type === 'success') {
                        typeBg = 'bg-emerald-50 text-emerald-800 border-emerald-100';
                        typeLabel = 'CLEARANCE';
                      } else if (log.type === 'warning') {
                        typeBg = 'bg-rose-50 text-rose-800 border-rose-100';
                        typeLabel = 'ANOMALY / WARN';
                      }

                      return (
                        <div key={log.id} className={`p-3 rounded-xl border flex flex-col gap-1.5 transition-all hover:bg-slate-50 ${typeBg}`}>
                          <div className="flex justify-between items-center text-[9px] font-mono font-bold">
                            <span className="uppercase tracking-wider">[{typeLabel}]</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {log.timestamp}
                            </span>
                          </div>
                          
                          <p className="text-xs leading-relaxed font-sans text-slate-800 font-medium">
                            {log.message}
                          </p>

                          <div className="border-t border-slate-100/50 pt-1.5 mt-0.5 flex items-center justify-between text-[10px] text-slate-400">
                            <span>Partner: <b>{log.partnerName}</b></span>
                            <span className="font-mono text-[9px]">{log.partnerId}</span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>

              </div>
            </div>
          </div>
        )}

      </main>

    </div>
  );
}
