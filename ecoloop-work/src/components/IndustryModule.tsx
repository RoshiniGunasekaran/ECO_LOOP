import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { IndustryItem, PickupRequest } from '../types';
import { INITIAL_INDUSTRIES, INITIAL_PICKUP_REQUESTS } from '../data';
import { 
  Factory, LayoutDashboard, Inbox, Database, RefreshCw, BarChart3, 
  User, CheckCircle2, AlertCircle, X, Download, ShieldCheck, Mail, Phone, 
  MapPin, Settings, HelpCircle, ChevronRight, ArrowRight
} from 'lucide-react';

interface IndustryModuleProps {
  onLogout: () => void;
}

export default function IndustryModule({ onLogout }: IndustryModuleProps) {
  // Sidebar tabs
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Active Shared States connected to Database Context
  const { industry, setIndustry, pickups, setPickups } = useDatabase();

  const deliveries = pickups.filter(
    p => p.assignedIndustryId === industry.id || p.status === 'Completed' || p.status === 'Delivered'
  );

  // Storage / Stock inventory levels in Kg
  const [stocks, setStocks] = useState<Record<string, { qty: number; max: number; loc: string }>>({
    'Paper': { qty: 8450, max: 20000, loc: 'Silo A-1' },
    'Plastic': { qty: 4120, max: 15000, loc: 'Silo B-4' },
    'Glass': { qty: 1200, max: 10000, loc: 'Dry Shed 2' },
    'Metal': { qty: 2900, max: 12000, loc: 'Heavy Yard' },
    'E-Waste': { qty: 450, max: 5000, loc: 'Secure Vault' },
    'Organic': { qty: 0, max: 8000, loc: 'Compost Bin 1' }
  });

  const [processingStatus, setProcessingStatus] = useState<Record<string, 'Received' | 'Sorting' | 'Processing' | 'Completed'>>({
    'BATCH-8823': 'Sorting',
    'BATCH-1093': 'Completed',
    'BATCH-4021': 'Processing'
  });

  // Handlers
  const handleAcceptDelivery = (deliveryId: string) => {
    const targetDel = deliveries.find(d => d.id === deliveryId);
    if (!targetDel) return;

    // Transition status to Delivered
    setPickups(pickups.map(d => {
      if (d.id === deliveryId) {
        return {
          ...d,
          status: 'Delivered',
          paymentStatus: 'Paid'
        };
      }
      return d;
    }));

    // Add to actual inventory stock
    const cat = targetDel.category;
    const addedWeight = targetDel.actualWeight || targetDel.estimatedWeight;
    
    if (stocks[cat]) {
      setStocks({
        ...stocks,
        [cat]: {
          ...stocks[cat],
          qty: Math.min(stocks[cat].qty + addedWeight, stocks[cat].max)
        }
      });
    }

    setIndustry({
      ...industry,
      wasteReceivedKg: industry.wasteReceivedKg + addedWeight,
      deliveriesCount: industry.deliveriesCount + 1
    });

    alert(`Bulk Cargo Accepted! ${addedWeight} Kg added to your local warehouse stock silos.`);
  };

  const handleUpdateBatchProgress = (batchId: string, current: string) => {
    let next: any = 'Sorting';
    if (current === 'Sorting') next = 'Processing';
    else if (current === 'Processing') next = 'Completed';

    setProcessingStatus({
      ...processingStatus,
      [batchId]: next
    });
  };

  const pendingCargoList = deliveries.filter(d => d.status === 'Assigned' || d.status === 'In-Transit');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      
      {/* MOBILE HEADER */}
      <header className="md:hidden bg-brand-900 text-brand-50 border-b border-brand-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-1.5">
          <Factory className="w-5 h-5 text-brand-300" />
          <span className="font-display font-bold text-sm text-white">EcoLoop Industry</span>
        </div>
        <button onClick={onLogout} className="text-[10px] bg-brand-950 text-brand-100 hover:bg-brand-800 font-bold px-3 py-1.5 rounded-lg border border-brand-800">Logout</button>
      </header>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-brand-900 text-brand-50 border-r border-brand-800 p-5 shrink-0">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center text-white"><Factory className="w-5 h-5" /></div>
          <div>
            <h2 className="font-display font-extrabold text-sm leading-tight text-white">EcoLoop Industrial</h2>
            <p className="text-[10px] font-mono text-brand-300 font-bold uppercase tracking-widest">Processing Suite</p>
          </div>
        </div>

        {/* Corporate Identity Profile */}
        <div className="bg-brand-950 p-4 rounded-xl border border-brand-800 flex flex-col gap-2 mb-6">
          <h4 className="text-xs font-bold text-white truncate">{industry.companyName}</h4>
          <span className="inline-flex items-center gap-1.5 text-[9px] text-brand-300 font-bold font-mono">
            <ShieldCheck className="w-3.5 h-3.5" /> Certified Recycling Partner
          </span>
        </div>

        {/* Links Corridor */}
        <nav className="flex-1 flex flex-col gap-1">
          {[
            { id: 'dashboard', label: 'Overview Metrics', icon: <LayoutDashboard className="w-4 h-4" /> },
            { id: 'deliveries', label: 'Incoming Bulk Cargo', icon: <Inbox className="w-4 h-4" />, badge: pendingCargoList.length },
            { id: 'inventory', label: 'Warehouse Silos', icon: <Database className="w-4 h-4" /> },
            { id: 'processing', label: 'Processing Status', icon: <RefreshCw className="w-4 h-4" /> },
            { id: 'reports', label: 'Material Yield Reports', icon: <BarChart3 className="w-4 h-4" /> },
            { id: 'profile', label: 'Company Credentials', icon: <User className="w-4 h-4" /> },
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
                <span className="bg-brand-500 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="border-t border-brand-800 pt-4 flex flex-col gap-1 text-[10px] text-brand-300">
          <button onClick={onLogout} className="text-xs bg-brand-950 border border-brand-800 hover:bg-brand-800 font-bold py-2 rounded-xl text-brand-200 hover:text-white transition mt-2">
            Logout Industrial Portal
          </button>
        </div>
      </aside>

      {/* MOBILE NAVIGATION TABFOOTER */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 py-2.5 px-4 flex justify-around items-center z-40 shadow-xl">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'dashboard' ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-[9px]">Dash</span>
        </button>
        <button onClick={() => setActiveTab('deliveries')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'deliveries' ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
          <Inbox className="w-4 h-4" />
          <span className="text-[9px]">Cargo ({pendingCargoList.length})</span>
        </button>
        <button onClick={() => setActiveTab('inventory')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'inventory' ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
          <Database className="w-4 h-4" />
          <span className="text-[9px]">Silos</span>
        </button>
        <button onClick={() => setActiveTab('processing')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'processing' ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
          <RefreshCw className="w-4 h-4" />
          <span className="text-[9px]">Process</span>
        </button>
      </nav>

      {/* CORE WORKSPACE */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-h-screen overflow-y-auto">
        
        {/* OVERVIEW DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-extrabold text-slate-900">Industrial Facility Workspace</h1>
              <p className="text-xs text-slate-500 mt-1">Logged in: {industry.companyName} · Facility Location: {industry.address}</p>
            </div>

            {/* QUICK STATS CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between h-28">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Waste Reclaimed (Kg)</span>
                <div className="mt-2">
                  <p className="text-xl sm:text-2xl font-bold font-mono text-slate-900">{industry.wasteReceivedKg.toLocaleString()} Kg</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">All-time ecological tonnage intake</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between h-28">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Registered Cargo Shipments</span>
                <div className="mt-2">
                  <p className="text-xl sm:text-2xl font-bold font-mono text-slate-900">{industry.deliveriesCount}</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">Sourced from Eco-Drivers network</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between h-28">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Incoming Bulk Shipments</span>
                <div className="mt-2">
                  <p className="text-xl sm:text-2xl font-bold font-mono text-amber-600">{pendingCargoList.length}</p>
                  <button onClick={() => setActiveTab('deliveries')} className="text-[10px] text-amber-600 font-bold hover:underline flex items-center gap-1 mt-1">Review Deliveries <ChevronRight className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>

            {/* COMPACT BATCH SUMMARY */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* CURRENT STOCK BAR GRIDS */}
              <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Silo Storage Quantity Levels</h3>
                <div className="flex flex-col gap-3">
                  {Object.entries(stocks).map(([cat, details]: [string, any]) => {
                    const percent = Math.min((details.qty / details.max) * 100, 100);
                    return (
                      <div key={cat} className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-700">{cat} Stocks <span className="text-[10px] font-normal text-slate-400">({details.loc})</span></span>
                          <span className="font-mono font-bold text-slate-800">{details.qty.toLocaleString()} / {details.max.toLocaleString()} Kg</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-amber-500 h-full rounded-full" style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* INDUSTRIAL ALERTS PANEL */}
              <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Operations Feed Alerts</h3>
                <div className="flex flex-col gap-3">
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Paper Silo Capacity Notice</p>
                      <p className="text-[10px] text-rose-600 mt-0.5">Silo A-1 is currently at 84% maximum storage. Please initiate sorting batch runs.</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-600">
                    <p className="font-bold text-slate-800">Automated Smart Billing</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">All cargo clearances are processed under standard electronic invoicing directly with our central escrow ledger.</p>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* INCOMING SHIPMENTS LIST */}
        {activeTab === 'deliveries' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <div>
              <h1 className="text-xl font-display font-extrabold text-slate-900">Incoming Bulk Shipments</h1>
              <p className="text-xs text-slate-500 mt-1">Inspect cargo batches dispatched by local Eco-Drivers. Review weights before approving silo storage entry.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {deliveries.filter(d => d.status === 'Assigned' || d.status === 'In-Transit').map((d) => (
                <div key={d.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 font-mono">BATCH ID: {d.id}</span>
                    <span className="bg-amber-50 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase font-mono">{d.status}</span>
                  </div>

                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800">Carrier: {d.partnerName || 'Daniel Cruz'}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{d.partnerPhone}</p>
                    <div className="flex gap-2 items-center mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100/60 text-xs">
                      <span className="font-bold text-slate-800">{d.category} Cargo</span>
                      <span className="text-slate-400 font-mono">|</span>
                      <span className="font-mono font-bold text-slate-800">{d.actualWeight || d.estimatedWeight} Kg Load</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-50 pt-3.5 flex justify-end gap-2">
                    <button className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold px-3.5 py-1.5 rounded-xl transition">Reject Batch</button>
                    <button onClick={() => handleAcceptDelivery(d.id)} className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold px-4 py-1.5 rounded-xl transition shadow-sm">Accept Silo Load</button>
                  </div>
                </div>
              ))}
              {deliveries.filter(d => d.status === 'Assigned' || d.status === 'In-Transit').length === 0 && (
                <div className="py-12 text-center bg-white border border-slate-100 rounded-2xl col-span-2">
                  <CheckCircle2 className="w-8 h-8 text-brand-500 mx-auto mb-2" />
                  <h3 className="text-xs font-bold text-slate-800">All dispatched cargo safely sorted!</h3>
                  <p className="text-[10px] text-slate-400 mt-1">Incoming Box Trucks will automatically appear here once drivers complete household collections.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* WAREHOUSE SILOS LIST */}
        {activeTab === 'inventory' && (
          <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-fade-in">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(stocks).map(([cat, details]: [string, any]) => {
                const percent = Math.min((details.qty / details.max) * 100, 100);
                return (
                  <div key={cat} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between h-36">
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-800">{cat} Silo</h4>
                        <span className="text-[9px] font-bold text-slate-400 font-mono uppercase bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{details.loc}</span>
                      </div>
                      <p className="text-lg font-bold font-mono text-slate-900 mt-2">{details.qty.toLocaleString()} Kg</p>
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1">
                        <span>Intake Capacity</span>
                        <span>{percent.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PROCESSING WORKFLOW STATUS */}
        {activeTab === 'processing' && (
          <div className="max-w-3xl mx-auto bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-4 animate-fade-in">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-mono">Active Processing Batches</h2>
              <p className="text-xs text-slate-500 mt-0.5">Control facility machinery stages. Advance material loads through sorting, pulping, and completion.</p>
            </div>

            <div className="flex flex-col gap-3 mt-2">
              {Object.entries(processingStatus).map(([batchId, status]: [string, any]) => (
                <div key={batchId} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-slate-800">Batch Code: {batchId}</h4>
                    <div className="flex gap-1.5 items-center mt-1">
                      <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>{status} Stage</span>
                    </div>
                  </div>

                  {status !== 'Completed' && (
                    <button 
                      onClick={() => handleUpdateBatchProgress(batchId, status)}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] px-3.5 py-1.5 rounded-xl transition flex items-center gap-1"
                    >
                      Advance Machinery Loop <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REPORTS LOGS */}
        {activeTab === 'reports' && (
          <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-fade-in">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-mono">Commercial Recycling Tonnage Reports</h2>
                <button onClick={() => alert("Downloading CSV/Excel commercial recycling reports...")} className="bg-slate-900 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" /> Download Full CSV
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase font-mono">Carbon Mining Mitigation</span>
                  <span className="block text-xl font-bold font-mono text-emerald-600 mt-1">11.4 Tons Co2</span>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase font-mono">Reclaimed raw grade value</span>
                  <span className="block text-xl font-bold font-mono text-slate-800 mt-1">₹4,85,210.00 Est.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* INDUSTRIAL PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-100 p-6 flex flex-col gap-6 animate-fade-in shadow-xl">
            <div className="flex flex-col sm:flex-row items-center gap-5 border-b border-slate-100 pb-5">
              <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 text-3xl font-bold border-2 border-amber-500 shadow-md">🏭</div>
              <div className="text-center sm:text-left">
                <h2 className="text-base font-bold text-slate-800">{industry.companyName}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{industry.email} · ID: {industry.id}</p>
                <span className="inline-block bg-amber-50 text-amber-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-1.5">GST registered: {industry.gstNumber}</span>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); alert("Profile successfully updated in local state!"); }} className="flex flex-col gap-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Corporate business credentials</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">GST ID Number</label>
                  <input type="text" readOnly value={industry.gstNumber} className="bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs cursor-not-allowed font-mono" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Corporate license ID</label>
                  <input type="text" readOnly value={industry.regNumber} className="bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs cursor-not-allowed font-mono" />
                </div>
              </div>

              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Facility contact details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Facility Manager</label>
                  <input type="text" value={industry.contactPerson} onChange={(e) => setIndustry({ ...industry, contactPerson: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Corporate hotline</label>
                  <input type="text" value={industry.phone} onChange={(e) => setIndustry({ ...industry, phone: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
                </div>
              </div>

              <button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-sm text-center mt-2">
                Save Facility Specs
              </button>
            </form>
          </div>
        )}

      </main>

    </div>
  );
}
