import React, { useState } from 'react';
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
  Edit3, Play, Plus, RefreshCw, ChevronRight, Check, X, Search, Filter
} from 'lucide-react';

interface AdminModuleProps {
  onLogout: () => void;
}

export default function AdminModule({ onLogout }: AdminModuleProps) {
  // Active Sidebar Tabs
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // In-Memory Database states
  const [customers, setCustomers] = useState<CustomerItem[]>(INITIAL_CUSTOMERS);
  const [partners, setPartners] = useState<PartnerItem[]>(INITIAL_PARTNERS);
  const [industries, setIndustries] = useState<IndustryItem[]>(INITIAL_INDUSTRIES);
  const [pickups, setPickups] = useState<PickupRequest[]>(INITIAL_PICKUP_REQUESTS);
  const [diyProjects, setDiyProjects] = useState<DIYProject[]>(INITIAL_DIY_PROJECTS);
  const [pricingRates, setPricingRates] = useState<PricingRate[]>(INITIAL_PRICING_RATES);

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
            { id: 'partners', label: 'Partner Verification', icon: <Truck className="w-4 h-4" />, badge: partners.filter(p => p.status === 'Pending Approval').length },
            { id: 'industries', label: 'Industry Certification', icon: <Factory className="w-4 h-4" />, badge: industries.filter(i => i.status === 'Pending Approval').length },
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
        
        {/* DASHBOARD VIEW */}
        {activeTab === 'dashboard' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-extrabold text-slate-900">Administrator Control Cabin</h1>
              <p className="text-xs text-slate-500 mt-1">Global ecosystem oversight across certified users, dispatch loops, and financial ledgers.</p>
            </div>

            {/* QUICK STATS METRICS BENTO */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between h-28">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Total Customers</span>
                <div className="mt-2">
                  <p className="text-xl sm:text-2xl font-bold font-mono text-slate-900">{customers.length}</p>
                  <button onClick={() => setActiveTab('customers')} className="text-[10px] text-rose-600 font-bold hover:underline flex items-center gap-1 mt-1">Manage Database <ChevronRight className="w-3 h-3" /></button>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between h-28">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Pending Drivers</span>
                <div className="mt-2">
                  <p className="text-xl sm:text-2xl font-bold font-mono text-rose-600">{partners.filter(p => p.status === 'Pending Approval').length}</p>
                  <button onClick={() => setActiveTab('partners')} className="text-[10px] text-slate-500 font-bold hover:underline flex items-center gap-1 mt-1">Review Profiles <ChevronRight className="w-3 h-3" /></button>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between h-28">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Unassigned Pickups</span>
                <div className="mt-2">
                  <p className="text-xl sm:text-2xl font-bold font-mono text-slate-900">{pickups.filter(p => p.status === 'Pending').length}</p>
                  <button onClick={() => setActiveTab('pickups')} className="text-[10px] text-slate-500 font-bold hover:underline flex items-center gap-1 mt-1">Manual Allocation <ChevronRight className="w-3 h-3" /></button>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between h-28">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Unverified DIY Crafts</span>
                <div className="mt-2">
                  <p className="text-xl sm:text-2xl font-bold font-mono text-slate-900">{diyProjects.filter(d => d.status === 'Pending').length}</p>
                  <button onClick={() => setActiveTab('diy-approvals')} className="text-[10px] text-slate-500 font-bold hover:underline flex items-center gap-1 mt-1">Perform Auditing <ChevronRight className="w-3 h-3" /></button>
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
                    <strong className="text-lg font-bold font-mono">₹18,45,290.00</strong>
                  </div>
                  <span className="text-[10px] text-slate-400">Escrow Audited</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* CUSTOMER DATABASE TAB */}
        {activeTab === 'customers' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl font-display font-extrabold text-slate-900">Customer Account Directories</h1>
                <p className="text-xs text-slate-500">View balances, accumulated points, and toggle account bans.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {customers.map((c) => (
                <div key={c.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs flex flex-col justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img className="w-10 h-10 rounded-full object-cover border border-slate-100 shadow-inner" src={c.profilePic} alt="customer" />
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
                      onClick={() => handleToggleUserStatus(c.id, 'customer')}
                      className={`text-[9px] font-bold px-3 py-1.5 rounded-lg transition ${
                        c.status === 'Active' ? 'bg-rose-50 border border-rose-100 text-rose-700' : 'bg-slate-900 text-white'
                      }`}
                    >
                      {c.status === 'Active' ? 'Suspend Account' : 'Re-Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PARTNERS QUEUE */}
        {activeTab === 'partners' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <div>
              <h1 className="text-xl font-display font-extrabold text-slate-900">Partner driver Verification Queue</h1>
              <p className="text-xs text-slate-500">Audit driving licenses and background national identity numbers before driver dispatch clearances.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {partners.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img className="w-10 h-10 rounded-full object-cover" src={p.profilePic} alt="partner" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">{p.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono">{p.vehicleType} ({p.vehicleNumber})</p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase font-mono ${
                      p.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}>{p.status}</span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[10px] font-mono leading-relaxed flex flex-col gap-1">
                    <p>DRIVER LICENSE ID: {p.drivingLicense}</p>
                    <p>NATIONAL ID CODE: {p.aadhaarNumber}</p>
                  </div>

                  {p.status === 'Pending Approval' && (
                    <div className="flex gap-2 justify-end mt-1 border-t border-slate-50 pt-3">
                      <button onClick={() => handleApprovePartner(p.id, 'Suspended')} className="bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-bold px-3 py-1.5 rounded-xl transition">Reject Profile</button>
                      <button onClick={() => handleApprovePartner(p.id, 'Approved')} className="bg-rose-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-xl transition shadow-xs">Approve and Dispatch</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INDUSTRIES TAB */}
        {activeTab === 'industries' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <div>
              <h1 className="text-xl font-display font-extrabold text-slate-900">Industry certification management</h1>
              <p className="text-xs text-slate-500">Audit corporate registration license IDs, GST numbers, and environmental recycling scopes.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {industries.map((ind) => (
                <div key={ind.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col justify-between gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 text-2xl border">🏭</div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">{ind.companyName}</h4>
                        <p className="text-[10px] text-slate-400 font-mono">{ind.industryType}</p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase font-mono ${
                      ind.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>{ind.status}</span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[10px] font-mono flex flex-col gap-1">
                    <p>GST REGISTER ID: {ind.gstNumber}</p>
                    <p>FACILITY LOGISTICS: {ind.address}</p>
                  </div>

                  {ind.status === 'Pending Approval' && (
                    <div className="flex gap-2 justify-end border-t border-slate-50 pt-3">
                      <button onClick={() => handleApproveIndustry(ind.id, 'Suspended')} className="bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-bold px-3 py-1.5 rounded-xl transition">Reject Corporate Account</button>
                      <button onClick={() => handleApproveIndustry(ind.id, 'Approved')} className="bg-rose-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-xl transition shadow-xs">Authorize Industry Certificate</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
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

      </main>

    </div>
  );
}
