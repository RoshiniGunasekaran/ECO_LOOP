import React, { useState } from 'react';
import { PartnerItem, PickupRequest, Transaction, WasteCategory } from '../types';
import { INITIAL_PARTNERS, INITIAL_PICKUP_REQUESTS, INITIAL_PRICING_RATES, WASTE_SUBCATEGORIES } from '../data';
import { 
  Truck, LayoutDashboard, Navigation, CheckCircle2, DollarSign, MapPin, 
  User, Award, Star, ToggleLeft, ToggleRight, Search, Filter, Play, Check, 
  Upload, AlertTriangle, ArrowRight, Bell, X, FileText, Smartphone, RefreshCw
} from 'lucide-react';

interface DeliveryPartnerProps {
  onLogout: () => void;
}

export default function DeliveryPartnerModule({ onLogout }: DeliveryPartnerProps) {
  // Sidebar Tabs
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Local reactive states
  const [partner, setPartner] = useState<PartnerItem>(INITIAL_PARTNERS[0]);
  const [pickups, setPickups] = useState<PickupRequest[]>(INITIAL_PICKUP_REQUESTS);
  
  // Weights / Billing Form States
  const [billingPickup, setBillingPickup] = useState<PickupRequest | null>(null);
  const [actualWeight, setActualWeight] = useState<number>(10);
  const [verifiedCategory, setVerifiedCategory] = useState<WasteCategory>('Paper');
  const [billingRemarks, setBillingRemarks] = useState('');
  const [billingSuccess, setBillingSuccess] = useState(false);

  // Active Map Trip state
  const [currentTrip, setCurrentTrip] = useState<PickupRequest | null>(null);

  // Computed helper stats
  const assignedList = pickups.filter(p => p.partnerId === partner.id && p.status !== 'Completed' && p.status !== 'Cancelled');
  const availableList = pickups.filter(p => p.status === 'Pending');

  // Handlers
  const handleToggleOnline = () => {
    setPartner({
      ...partner,
      isOnline: !partner.isOnline
    });
  };

  const handleAcceptPickup = (pickupId: string) => {
    setPickups(pickups.map(p => {
      if (p.id === pickupId) {
        return {
          ...p,
          status: 'Assigned',
          partnerId: partner.id,
          partnerName: partner.name,
          partnerPhone: partner.phone
        };
      }
      return p;
    }));
    
    // Increment local driver stats
    setPartner({
      ...partner,
      todayPickups: partner.todayPickups + 1
    });

    alert(`Pickup Accepted! Request moved to "My Assigned Trips" corridor.`);
  };

  const handleRejectPickup = (pickupId: string) => {
    alert("Request hidden from your dispatcher feed.");
  };

  const handleStepProgress = (pId: string, currentStatus: string) => {
    let nextStatus: any = 'Assigned';
    if (currentStatus === 'Assigned') nextStatus = 'In-Transit';
    else if (currentStatus === 'In-Transit') nextStatus = 'Arrived';
    else if (currentStatus === 'Arrived') {
      // Open billing / weighing modal directly!
      const activeP = pickups.find(p => p.id === pId)!;
      setBillingPickup(activeP);
      setActualWeight(activeP.estimatedWeight);
      setVerifiedCategory(activeP.category);
      return;
    }

    setPickups(pickups.map(p => p.id === pId ? { ...p, status: nextStatus } : p));
  };

  const handleGenerateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingPickup) return;

    const rate = INITIAL_PRICING_RATES.find(pr => pr.category === verifiedCategory)?.pricePerKg || 0.10;
    const finalVal = parseFloat((actualWeight * rate).toFixed(2));

    setPickups(pickups.map(p => {
      if (p.id === billingPickup.id) {
        return {
          ...p,
          status: 'Completed',
          actualWeight: actualWeight,
          finalAmount: finalVal,
          paymentStatus: 'Paid',
          invoiceId: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`
        };
      }
      return p;
    }));

    // Update partner aggregate balance
    setPartner({
      ...partner,
      completedPickups: partner.completedPickups + 1,
      earnings: partner.earnings + finalVal,
      distanceTraveled: partner.distanceTraveled + 4.2
    });

    setBillingSuccess(true);
    setTimeout(() => {
      setBillingSuccess(false);
      setBillingPickup(null);
      setActiveTab('dashboard');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      
      {/* MOBILE HEADER */}
      <header className="md:hidden bg-brand-900 text-brand-50 border-b border-brand-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-1.5">
          <Truck className="w-5 h-5 text-brand-300" />
          <span className="font-display font-bold text-sm text-white">EcoLoop Partner</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleToggleOnline} className="flex items-center gap-1 text-[11px] font-bold">
            {partner.isOnline ? (
              <span className="text-brand-300">● ONLINE</span>
            ) : (
              <span className="text-brand-500">● OFFLINE</span>
            )}
          </button>
          <button onClick={onLogout} className="text-[10px] bg-brand-950 text-brand-100 hover:bg-brand-800 font-semibold px-2.5 py-1.5 rounded-lg border border-brand-800">Logout</button>
        </div>
      </header>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-brand-900 text-brand-50 border-r border-brand-800 p-5 shrink-0">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center text-white"><Truck className="w-5 h-5" /></div>
          <div>
            <h2 className="font-display font-extrabold text-sm leading-tight text-white">EcoLoop Drive</h2>
            <p className="text-[10px] font-mono text-brand-300 font-bold uppercase tracking-widest">Partner Portal</p>
          </div>
        </div>

        {/* Driver Online Control Card */}
        <div className="bg-brand-950 p-4 rounded-xl border border-brand-800 flex flex-col gap-3 mb-6">
          <div className="flex items-center gap-3">
            <img className="w-10 h-10 rounded-full object-cover border border-brand-700 shadow-sm" src={partner.profilePic} alt="driver" />
            <div className="min-w-0">
              <h4 className="text-xs font-bold truncate text-white">{partner.name}</h4>
              <p className="text-[9px] text-brand-300 font-mono">{partner.vehicleNumber}</p>
            </div>
          </div>
          
          <div className="border-t border-brand-800 pt-2 flex items-center justify-between">
            <span className="text-[10px] text-brand-200 font-bold uppercase">Online Dispatch</span>
            <button onClick={handleToggleOnline} className="text-brand-400 transition hover:scale-105">
              {partner.isOnline ? <ToggleRight className="w-8 h-8 text-brand-400" /> : <ToggleLeft className="w-8 h-8 text-brand-600" />}
            </button>
          </div>
        </div>

        {/* Navigation Corridor links */}
        <nav className="flex-1 flex flex-col gap-1">
          {[
            { id: 'dashboard', label: 'Partner Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
            { id: 'dispatcher', label: 'Nearby Dispatcher', icon: <Navigation className="w-4 h-4 text-brand-300" />, badge: partner.isOnline ? availableList.length : 0 },
            { id: 'assigned', label: 'Assigned Trips', icon: <CheckCircle2 className="w-4 h-4" />, badge: assignedList.length },
            { id: 'earnings', label: 'Earning Records', icon: <DollarSign className="w-4 h-4" /> },
            { id: 'profile', label: 'Driver Profile', icon: <User className="w-4 h-4" /> },
          ].map((item) => (
            <button
              key={item.id}
              disabled={item.id === 'dispatcher' && !partner.isOnline}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition ${
                activeTab === item.id 
                  ? 'bg-brand-800 text-white shadow-lg font-bold' 
                  : item.id === 'dispatcher' && !partner.isOnline 
                    ? 'text-brand-700 cursor-not-allowed opacity-40' 
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
          <span className="block font-mono text-brand-300 font-bold uppercase tracking-wider">Device status</span>
          <span className="text-brand-400">✔ Scaler scale paired</span>
          <span className="text-brand-400">✔ GPS locator active</span>
          <button onClick={onLogout} className="text-xs bg-brand-950 border border-brand-800 hover:bg-brand-800 font-bold py-2 rounded-xl text-brand-200 hover:text-white transition mt-4">
            Logout Session
          </button>
        </div>
      </aside>

      {/* MOBILE FOOTER NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 py-2.5 px-4 flex justify-around items-center z-40 shadow-xl">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'dashboard' ? 'text-brand-600 font-bold' : 'text-slate-400'}`}>
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-[9px]">Dash</span>
        </button>
        <button 
          disabled={!partner.isOnline}
          onClick={() => setActiveTab('dispatcher')} 
          className={`flex flex-col items-center gap-0.5 ${!partner.isOnline ? 'opacity-30' : activeTab === 'dispatcher' ? 'text-brand-600 font-bold' : 'text-slate-400'}`}
        >
          <Navigation className="w-4 h-4" />
          <span className="text-[9px]">Nearby</span>
        </button>
        <button onClick={() => setActiveTab('assigned')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'assigned' ? 'text-brand-600 font-bold' : 'text-slate-400'}`}>
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-[9px]">Triops ({assignedList.length})</span>
        </button>
        <button onClick={() => setActiveTab('earnings')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'earnings' ? 'text-brand-600 font-bold' : 'text-slate-400'}`}>
          <DollarSign className="w-4 h-4" />
          <span className="text-[9px]">Earnings</span>
        </button>
      </nav>

      {/* PRIMARY WORKSPACE */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-h-screen overflow-y-auto">
        
        {/* PARTNER DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-display font-extrabold text-slate-900">Partner Driving Suite</h1>
                <p className="text-xs text-slate-500 mt-1">Logged in: {partner.name} · Vehicle: {partner.vehicleType} ({partner.vehicleNumber})</p>
              </div>

              <div className="flex items-center gap-3 bg-white border border-slate-100 p-2 rounded-xl shadow-xs">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-xs font-bold text-slate-800">Rating: {partner.rating}</span>
              </div>
            </div>

            {/* Offline Alert Warning */}
            {!partner.isOnline && (
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold">You are currently OFFLINE!</h4>
                    <p className="text-[11px] text-amber-700 leading-relaxed mt-0.5">Go online to stream live household pickup routes within your coordinates.</p>
                  </div>
                </div>
                <button onClick={handleToggleOnline} className="text-xs bg-slate-950 text-white font-bold px-4 py-2 rounded-xl transition shadow-xs self-start sm:self-center shrink-0">
                  Go Online Now
                </button>
              </div>
            )}

            {/* DRIVER STATS CARD BENTO */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between h-28">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Today's collection trips</span>
                <div className="mt-2">
                  <p className="text-xl sm:text-2xl font-bold font-mono text-slate-900">{partner.todayPickups}</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">Awaiting verification: {assignedList.length}</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between h-28">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Completed collection trips</span>
                <div className="mt-2">
                  <p className="text-xl sm:text-2xl font-bold font-mono text-slate-900">{partner.completedPickups}</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">All-time collection count</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between h-28">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Driver Earnings Ledger</span>
                <div className="mt-2">
                  <p className="text-xl sm:text-2xl font-bold font-mono text-emerald-600">₹{partner.earnings.toFixed(2)}</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">Transferred directly</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between h-28">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Distance Traveled</span>
                <div className="mt-2">
                  <p className="text-xl sm:text-2xl font-bold font-mono text-slate-900">{partner.distanceTraveled.toFixed(1)} Km</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">Eco-vehicle carbon-neutral trips</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* CURRENTLY ASSIGNED RUNS */}
              <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Assigned Active Collection Runs</h3>
                <div className="flex flex-col gap-2">
                  {assignedList.map((p) => (
                    <div key={p.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs gap-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800">{p.customerName}</span>
                          <span className="bg-brand-50 text-brand-700 text-[8px] px-1.5 py-0.5 rounded-full uppercase font-mono">{p.status}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-none mt-1 truncate max-w-[200px]">{p.pickupAddress}</p>
                        <p className="text-[10px] text-brand-600 font-bold font-mono mt-1">{p.category} · est. {p.estimatedWeight} Kg</p>
                      </div>
                      <button onClick={() => setActiveTab('assigned')} className="bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg">
                        Manage Run
                      </button>
                    </div>
                  ))}
                  {assignedList.length === 0 && (
                    <div className="py-10 text-center text-slate-400">
                      <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-[10px] font-semibold uppercase tracking-wider">No active collection runs assigned</p>
                    </div>
                  )}
                </div>
              </div>

              {/* RECENT NOTIFS LOG */}
              <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Announcements & Dispatch Logs</h3>
                <div className="flex flex-col gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <p className="font-bold text-slate-800">Summer Bonus active!</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Collect +100kg total e-waste today to receive an automatic ₹2,500 bonus pay.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <p className="font-bold text-slate-800">New Category Added</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">"Batteries" are now open for bulk commercial industrial recycling.</p>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Dispatch nearby router */}
        {activeTab === 'dispatcher' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <div>
              <h1 className="text-xl font-display font-extrabold text-slate-900">Nearby dispatch collection router</h1>
              <p className="text-xs text-slate-500 mt-1">Accept nearby pending recycling pickups to fill your route load.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableList.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 font-mono">REQ ID: {p.id}</span>
                    <span className="bg-indigo-50 text-indigo-700 text-[9px] font-bold px-2 py-0.5 rounded-full font-mono">~1.4 Miles away</span>
                  </div>

                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800">{p.customerName}</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed truncate max-w-[280px]">{p.pickupAddress}</p>
                    <div className="flex gap-2 items-center mt-2.5">
                      <span className="bg-slate-100 text-slate-700 text-[10px] font-bold font-mono px-2 py-0.5 rounded-md">💻 {p.category}</span>
                      <span className="text-xs font-mono text-slate-500">est. {p.estimatedWeight} Kg</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-50 pt-3 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase font-mono">Estimated Driver Earnings</p>
                      <p className="text-sm font-bold text-brand-600 font-mono">₹{(p.estimatedAmount * 0.4).toFixed(2)}</p>
                    </div>

                    <div className="flex gap-1.5">
                      <button onClick={() => handleRejectPickup(p.id)} className="bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-[10px] px-3 py-2 rounded-xl transition">Ignore</button>
                      <button onClick={() => handleAcceptPickup(p.id)} className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-[10px] px-4 py-2 rounded-xl transition shadow-sm">Accept Trip</button>
                    </div>
                  </div>
                </div>
              ))}
              {availableList.length === 0 && (
                <div className="py-12 text-center bg-white border border-slate-100 rounded-2xl col-span-2">
                  <RefreshCw className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-spin" />
                  <h3 className="text-xs font-bold text-slate-800">Searching dispatch loop...</h3>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">No unassigned recycling requests found nearby. Refreshing dynamically.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ASSIGNED TRIP STEPPERS */}
        {activeTab === 'assigned' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <div>
              <h1 className="text-xl font-display font-extrabold text-slate-900">Assigned Trip Runner</h1>
              <p className="text-xs text-slate-500 mt-1">Manage accepted collection stops. Trigger GPS coordinates and verify materials weight.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignedList.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 font-mono">REQ ID: {p.id}</span>
                    <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase font-mono">{p.status}</span>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 shadow-inner"><MapPin className="w-5 h-5" /></div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{p.customerName}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{p.pickupAddress}</p>
                      {p.landmark && <p className="text-[10px] text-slate-400 mt-1">Landmark: {p.landmark}</p>}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/50 flex justify-between text-xs font-mono">
                    <div>
                      <span className="block text-[9px] text-slate-400 uppercase">Estimated Recyclable</span>
                      <strong className="text-slate-800">{p.category} ({p.subcategory})</strong>
                    </div>
                    <div className="text-right">
                      <span className="block text-[9px] text-slate-400 uppercase font-mono">Weight</span>
                      <strong className="text-slate-800">{p.estimatedWeight} Kg</strong>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end mt-2">
                    <button 
                      onClick={() => handleStepProgress(p.id, p.status)}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2 px-5 rounded-xl transition flex items-center gap-1.5"
                    >
                      {p.status === 'Assigned' && <><Play className="w-3.5 h-3.5" /> Start Trip</>}
                      {p.status === 'In-Transit' && <><Check className="w-3.5 h-3.5" /> Mark Arrived</>}
                      {p.status === 'Arrived' && <><Check className="w-3.5 h-3.5" /> Start Weighing & Billing</>}
                    </button>
                  </div>
                </div>
              ))}
              {assignedList.length === 0 && (
                <div className="py-12 text-center bg-white border border-slate-100 rounded-2xl col-span-2">
                  <CheckCircle2 className="w-8 h-8 text-brand-500 mx-auto mb-2" />
                  <h3 className="text-xs font-bold text-slate-800">All assigned trips complete!</h3>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">Toggle online to accept more nearby requests.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BILLING / WEIGHING MODAL */}
        {billingPickup && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 flex flex-col gap-4 animate-scale-up relative">
              <button onClick={() => setBillingPickup(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
              
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-brand-600" />
                <h3 className="font-display text-sm font-bold text-slate-950">Scale Weight verification</h3>
              </div>

              {billingSuccess ? (
                <div className="py-8 text-center flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 animate-pulse" />
                  <h4 className="text-xs font-bold text-slate-800">Invoice Generated & Earnings Dispatched!</h4>
                </div>
              ) : (
                <form onSubmit={handleGenerateInvoice} className="flex flex-col gap-4">
                  <p className="text-xs text-slate-500 leading-relaxed">Perform a physical digital scale weight audit. Modify the final verified weight below to update customer pricing payouts.</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Verified category</label>
                      <select 
                        value={verifiedCategory}
                        onChange={(e) => setVerifiedCategory(e.target.value as WasteCategory)}
                        className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                      >
                        {Object.keys(WASTE_SUBCATEGORIES).map((cat) => (
                          <option key={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Actual Scale Weight (Kg)</label>
                      <input 
                        type="number" 
                        step="0.1" 
                        required 
                        value={actualWeight}
                        onChange={(e) => setActualWeight(parseFloat(e.target.value) || 0)}
                        className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold text-slate-800" 
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Remarks/Notes (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. materials dry, unsorted" 
                      value={billingRemarks}
                      onChange={(e) => setBillingRemarks(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" 
                    />
                  </div>

                  <div className="p-3 bg-brand-50 border border-brand-100 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="block text-[8px] text-brand-700 uppercase font-bold tracking-wider font-mono">Calculated final payment</span>
                      <strong className="text-brand-900 text-sm font-mono">₹{(actualWeight * (INITIAL_PRICING_RATES.find(pr => pr.category === verifiedCategory)?.pricePerKg || 0.10)).toFixed(2)}</strong>
                    </div>
                    <span className="bg-brand-100 text-brand-800 font-bold text-[9px] px-2 py-0.5 rounded-md font-mono">₹{(INITIAL_PRICING_RATES.find(pr => pr.category === verifiedCategory)?.pricePerKg || 0.10).toFixed(2)} / Kg</span>
                  </div>

                  <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-md">
                    Complete weigh & Generate Bill
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* EARNINGS RECORD TAB */}
        {activeTab === 'earnings' && (
          <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-fade-in">
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xl flex flex-col gap-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-mono">Earnings History Ledger</h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase font-mono">All-Time Driver Pay</span>
                  <span className="block text-xl font-bold font-mono text-slate-800 mt-1">₹{partner.earnings.toFixed(2)}</span>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase font-mono">Active balance</span>
                  <span className="block text-xl font-bold font-mono text-emerald-600 mt-1">₹{(partner.earnings * 0.95).toFixed(2)}</span>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase font-mono">Completed Runs</span>
                  <span className="block text-xl font-bold font-mono text-slate-800 mt-1">{partner.completedPickups} Runs</span>
                </div>
              </div>
            </div>

            {/* List of past payouts */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Completed Collection Ledger</h3>
              <div className="flex flex-col gap-2">
                {pickups.filter(p => p.partnerId === partner.id && p.status === 'Completed').map((p) => (
                  <div key={p.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800">REQ ID: {p.id} · {p.category}</span>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">Verified load: {p.actualWeight} Kg · Date: {p.preferredDate}</p>
                    </div>
                    <span className="font-mono font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">+₹{p.finalAmount?.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-100 p-6 flex flex-col gap-6 animate-fade-in shadow-xl">
            <div className="flex flex-col sm:flex-row items-center gap-5 border-b border-slate-100 pb-5">
              <img className="w-16 h-16 rounded-full object-cover border-2 border-brand-500 shadow-md" src={partner.profilePic} alt="profile" />
              <div className="text-center sm:text-left">
                <h2 className="text-base font-bold text-slate-800">{partner.name}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{partner.email} · ID: {partner.id}</p>
                <span className="inline-block bg-brand-50 text-brand-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-1.5">★ 4.9 Premium Verified EcoLoop Driver</span>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); alert("Profile successfully updated in local state!"); }} className="flex flex-col gap-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Driver License & National ID credentials</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">National ID Number</label>
                  <input type="text" readOnly value={partner.aadhaarNumber} className="bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs cursor-not-allowed" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Driving License ID</label>
                  <input type="text" readOnly value={partner.drivingLicense} className="bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs cursor-not-allowed" />
                </div>
              </div>

              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Vehicle logistics specs</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Vehicle Type</label>
                  <input type="text" value={partner.vehicleType} onChange={(e) => setPartner({ ...partner, vehicleType: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">License Plate Number</label>
                  <input type="text" value={partner.vehicleNumber} onChange={(e) => setPartner({ ...partner, vehicleNumber: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
                </div>
              </div>

              <button type="submit" className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-sm text-center mt-2">
                Save Profile Specs
              </button>
            </form>
          </div>
        )}

      </main>

    </div>
  );
}
