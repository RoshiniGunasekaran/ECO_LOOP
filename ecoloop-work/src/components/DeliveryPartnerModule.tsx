/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  DELIVERY PARTNER MODULE — Module 12 (Partner Dashboard)
 * ============================================================
 *  Every tab in this file now reads/writes real Supabase data
 *  through `usePartnerDashboard` (see src/hooks/usePartnerDashboard.ts
 *  and src/services/partnerService.ts). Nothing here reads from
 *  the old `DatabaseContext` mock (`INITIAL_PARTNERS` /
 *  `INITIAL_PICKUP_REQUESTS`) any more.
 * ============================================================
 */

import React, { useEffect, useState } from 'react';
import { usePartnerDashboard } from '../hooks/usePartnerDashboard';
import { WASTE_SUBCATEGORIES } from '../data';
import { downloadInvoice } from '../utils/invoice';
import {
  Truck, LayoutDashboard, Navigation, CheckCircle2, DollarSign, MapPin,
  User, Award, Star, ToggleLeft, ToggleRight, Search, Filter, Play, Check,
  Upload, AlertTriangle, ArrowRight, Bell, X, FileText, Smartphone, RefreshCw, Loader2
} from 'lucide-react';

interface DeliveryPartnerProps {
  onLogout: () => void;
}

export default function DeliveryPartnerModule({ onLogout }: DeliveryPartnerProps) {
  // Sidebar Tabs
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Real Supabase-backed partner profile + pickups (Module 12)
  const {
    loading,
    partner,
    availablePickups,
    myPickups,
    toggleOnline,
    acceptPickup,
    advanceStatus,
    collectPickup,
    completePickup,
    confirmPayment,
    updatePersonalDetails,
    uploadProfilePhoto,
    updateVehicleDetails,
    uploadDocument,
  } = usePartnerDashboard();

  // Local list of ignored pickups in this session only (never written to the DB —
  // any other online partner must still see the request; see partnerService.ts header).
  const [ignoredPickupIds, setIgnoredPickupIds] = useState<number[]>([]);

  // Weights / Billing Form States
  const [billingPickup, setBillingPickup] = useState<(typeof myPickups)[number] | null>(null);
  const [actualWeight, setActualWeight] = useState<number>(10);
  const [verifiedCategory, setVerifiedCategory] = useState<string>('Paper');
  const [billingRemarks, setBillingRemarks] = useState('');
  const [billingSuccess, setBillingSuccess] = useState(false);
  const [billingSubmitting, setBillingSubmitting] = useState(false);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [advancingId, setAdvancingId] = useState<number | null>(null);

  // Collect / Upload Proof modal state (Module 13)
  const [collectPickupTarget, setCollectPickupTarget] = useState<(typeof myPickups)[number] | null>(null);
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [collectSubmitting, setCollectSubmitting] = useState(false);
  const [confirmingPaymentId, setConfirmingPaymentId] = useState<number | null>(null);

  // Profile tab state (Module 15)
  const [personalForm, setPersonalForm] = useState<{ fullName: string; phone: string } | null>(null);
  const [personalSaving, setPersonalSaving] = useState(false);
  const [personalMessage, setPersonalMessage] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  const [vehicleForm, setVehicleForm] = useState<{
    vehicleType: string;
    vehicleNumber: string;
    drivingLicense: string;
    aadhaarNumber: string;
  } | null>(null);
  const [vehicleSaving, setVehicleSaving] = useState(false);
  const [vehicleMessage, setVehicleMessage] = useState<string | null>(null);
  const [uploadingDocType, setUploadingDocType] = useState<'license' | 'aadhaar' | null>(null);

  useEffect(() => {
    if (partner) {
      setPersonalForm({ fullName: partner.name ?? '', phone: partner.phone ?? '' });
      setVehicleForm({
        vehicleType: partner.vehicleType ?? 'Electric Box Truck',
        vehicleNumber: partner.vehicleNumber ?? '',
        drivingLicense: partner.drivingLicense ?? '',
        aadhaarNumber: partner.aadhaarNumber ?? '',
      });
    }
  }, [partner]);

  if (loading || !partner) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p className="text-xs font-semibold uppercase tracking-wider">Loading partner dashboard…</p>
        </div>
      </div>
    );
  }

  // Computed helper stats
  const assignedList = myPickups.filter((p) => p.status !== 'Completed' && p.status !== 'Cancelled');
  const completedList = myPickups.filter((p) => p.status === 'Completed');
  const availableList = availablePickups.filter((p) => !ignoredPickupIds.includes(p.id));

  // Handlers
  const handleToggleOnline = async () => {
    await toggleOnline();
  };

  const handleAcceptPickup = async (pickupId: number) => {
    setAcceptingId(pickupId);
    const ok = await acceptPickup(pickupId);
    setAcceptingId(null);
    if (!ok) {
      alert('This pickup was just claimed by another partner. Refreshing the list…');
    }
  };

  const handleRejectPickup = (pickupId: number) => {
    setIgnoredPickupIds((prev) => [...prev, pickupId]);
  };

  const handleStepProgress = async (p: (typeof myPickups)[number]) => {
    if (p.status === 'Assigned') {
      setAdvancingId(p.id);
      await advanceStatus(p.id, 'In-Transit');
      setAdvancingId(null);
    } else if (p.status === 'In-Transit') {
      setAdvancingId(p.id);
      await advanceStatus(p.id, 'Arrived');
      setAdvancingId(null);
    } else if (p.status === 'Arrived') {
      // Open the Collect + Upload Proof modal (Module 13)
      setCollectPickupTarget(p);
      setProofFiles([]);
    } else if (p.status === 'Collected') {
      // Open billing / weighing modal
      setBillingPickup(p);
      setActualWeight(p.estimatedWeight);
      setVerifiedCategory(p.category);
      setBillingRemarks('');
    }
  };

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 3 - proofFiles.length);
    setProofFiles((prev) => [...prev, ...files]);
    e.target.value = '';
  };

  const handleRemoveProofFile = (index: number) => {
    setProofFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmCollected = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectPickupTarget) return;

    setCollectSubmitting(true);
    const ok = await collectPickup(collectPickupTarget.id, proofFiles);
    setCollectSubmitting(false);

    if (!ok) {
      alert('Could not mark this pickup as collected. Please try again.');
      return;
    }

    setCollectPickupTarget(null);
    setProofFiles([]);
  };

  const handleConfirmPayment = async (pickupId: number) => {
    setConfirmingPaymentId(pickupId);
    const ok = await confirmPayment(pickupId);
    setConfirmingPaymentId(null);
    if (!ok) {
      alert('Could not confirm payment. Please try again.');
    }
  };

  const handleDownloadInvoice = (p: (typeof myPickups)[number]) => {
    downloadInvoice(p, partner);
  };

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingPickup) return;

    setBillingSubmitting(true);
    const result = await completePickup(billingPickup.id, {
      actualWeight,
      verifiedCategory,
      remarks: billingRemarks,
    });
    setBillingSubmitting(false);

    if (!result) {
      alert('Could not complete this pickup. Please try again.');
      return;
    }

    setBillingSuccess(true);
    setTimeout(() => {
      setBillingSuccess(false);
      setBillingPickup(null);
      setActiveTab('dashboard');
    }, 2000);
  };

  // Module 15 — Profile tab handlers
  const handleSavePersonalDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personalForm) return;
    setPersonalMessage(null);
    setPersonalSaving(true);
    const result = await updatePersonalDetails(personalForm);
    setPersonalSaving(false);
    setPersonalMessage(result.success ? '✓ Personal details updated successfully.' : result.error ?? 'Could not save your changes.');
    if (result.success) setTimeout(() => setPersonalMessage(null), 3000);
  };

  const handleProfilePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoUploading(true);
    const url = await uploadProfilePhoto(file);
    setPhotoUploading(false);
    if (!url) alert('Could not upload your photo. Please try again.');
  };

  const handleSaveVehicleDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleForm) return;
    setVehicleMessage(null);
    setVehicleSaving(true);
    const result = await updateVehicleDetails(vehicleForm);
    setVehicleSaving(false);
    setVehicleMessage(result.success ? '✓ Vehicle & document details updated successfully.' : result.error ?? 'Could not save your changes.');
    if (result.success) setTimeout(() => setVehicleMessage(null), 3000);
  };

  const handleDocumentFileSelected = async (docType: 'license' | 'aadhaar', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingDocType(docType);
    const url = await uploadDocument(docType, file);
    setUploadingDocType(null);
    if (!url) alert(`Could not upload your ${docType === 'license' ? 'driving license' : 'Aadhaar'} document. Please try again.`);
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
            <img className="w-10 h-10 rounded-full object-cover border border-brand-700 shadow-sm" src={partner.profilePicUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(partner.name)} alt="driver" />
            <div className="min-w-0">
              <h4 className="text-xs font-bold truncate text-white">{partner.name}</h4>
              <p className="text-[9px] text-brand-300 font-mono">{partner.vehicleNumber || 'No vehicle on file'}</p>
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
          <span className="text-[9px]">Trips ({assignedList.length})</span>
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
                <p className="text-xs text-slate-500 mt-1">Logged in: {partner.name} · Vehicle: {partner.vehicleType || '—'} ({partner.vehicleNumber || '—'})</p>
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
                    <span className="bg-indigo-50 text-indigo-700 text-[9px] font-bold px-2 py-0.5 rounded-full font-mono">New request</span>
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
                      <p className="text-[9px] text-slate-400 font-bold uppercase font-mono">Estimated Pickup Value</p>
                      <p className="text-sm font-bold text-brand-600 font-mono">₹{(p.estimatedAmount * 0.4).toFixed(2)}</p>
                    </div>

                    <div className="flex gap-1.5">
                      <button onClick={() => handleRejectPickup(p.id)} className="bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-[10px] px-3 py-2 rounded-xl transition">Ignore</button>
                      <button
                        disabled={acceptingId === p.id}
                        onClick={() => handleAcceptPickup(p.id)}
                        className="bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold text-[10px] px-4 py-2 rounded-xl transition shadow-sm"
                      >
                        {acceptingId === p.id ? 'Accepting…' : 'Accept Trip'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {availableList.length === 0 && (
                <div className="py-12 text-center bg-white border border-slate-100 rounded-2xl col-span-2">
                  <RefreshCw className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <h3 className="text-xs font-bold text-slate-800">No pending requests right now</h3>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">No unassigned recycling requests found. Check back shortly, or tap Nearby Dispatcher again to refresh.</p>
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

                  {p.images.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {p.images.length} proof photo{p.images.length > 1 ? 's' : ''} uploaded
                    </div>
                  )}

                  <div className="flex gap-2 justify-end mt-2">
                    <button
                      disabled={advancingId === p.id}
                      onClick={() => handleStepProgress(p)}
                      className="bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold py-2 px-5 rounded-xl transition flex items-center gap-1.5"
                    >
                      {p.status === 'Assigned' && <><Play className="w-3.5 h-3.5" /> Start Trip</>}
                      {p.status === 'In-Transit' && <><Check className="w-3.5 h-3.5" /> Mark Arrived</>}
                      {p.status === 'Arrived' && <><Upload className="w-3.5 h-3.5" /> Mark Collected & Upload Proof</>}
                      {p.status === 'Collected' && <><Check className="w-3.5 h-3.5" /> Start Weighing & Billing</>}
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

        {/* COLLECT + UPLOAD PROOF MODAL (Module 13) */}
        {collectPickupTarget && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 flex flex-col gap-4 animate-scale-up relative">
              <button onClick={() => setCollectPickupTarget(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>

              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-brand-600" />
                <h3 className="font-display text-sm font-bold text-slate-950">Mark Collected & Upload Proof</h3>
              </div>

              <form onSubmit={handleConfirmCollected} className="flex flex-col gap-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Confirm the recyclable materials for REQ ID: {collectPickupTarget.id} have been physically
                  collected from {collectPickupTarget.customerName}. Attach up to 3 proof photos (optional but recommended).
                </p>

                <div className="flex flex-wrap gap-2">
                  {proofFiles.map((file, index) => (
                    <div key={index} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                      <img src={URL.createObjectURL(file)} alt={`proof ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveProofFile(index)}
                        className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                  {proofFiles.length < 3 && (
                    <label htmlFor="proof-photo-file" className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 cursor-pointer hover:border-brand-400 hover:text-brand-500 transition">
                      <Upload className="w-4 h-4" />
                    </label>
                  )}
                  <input
                    id="proof-photo-file"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleProofFileChange}
                    className="hidden"
                    disabled={proofFiles.length >= 3}
                  />
                </div>

                <button type="submit" disabled={collectSubmitting} className="bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-md">
                  {collectSubmitting ? 'Saving…' : 'Confirm Collected'}
                </button>
              </form>
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
                  <h4 className="text-xs font-bold text-slate-800">Invoice Generated!</h4>
                  <p className="text-[10px] text-slate-500 max-w-[220px]">Payment is marked Pending until confirmed on the Earning Records tab.</p>
                </div>
              ) : (
                <form onSubmit={handleGenerateInvoice} className="flex flex-col gap-4">
                  <p className="text-xs text-slate-500 leading-relaxed">Perform a physical digital scale weight audit. Modify the final verified weight below to update customer pricing payouts.</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Verified category</label>
                      <select
                        value={verifiedCategory}
                        onChange={(e) => setVerifiedCategory(e.target.value)}
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

                  <button type="submit" disabled={billingSubmitting} className="bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-md">
                    {billingSubmitting ? 'Submitting…' : 'Complete weigh & Generate Bill'}
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
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
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
                <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl">
                  <span className="block text-[10px] text-amber-600 font-bold uppercase font-mono">Payment Pending</span>
                  <span className="block text-xl font-bold font-mono text-amber-700 mt-1">
                    {completedList.filter((p) => p.paymentStatus === 'Pending').length} Invoice{completedList.filter((p) => p.paymentStatus === 'Pending').length === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            </div>

            {/* List of past payouts / invoices */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Completed Collection Ledger & Invoices</h3>
              <div className="flex flex-col gap-2">
                {completedList.map((p) => (
                  <div key={p.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800">REQ ID: {p.id} · {p.category}</span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase font-mono ${p.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {p.paymentStatus === 'Paid' ? 'Paid' : 'Payment Pending'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">Verified load: {p.actualWeight ?? '—'} Kg · Date: {p.preferredDate} · Invoice: {p.invoiceId ?? '—'}</p>
                      </div>
                      <span className="font-mono font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg shrink-0">+₹{p.finalAmount?.toFixed(2) ?? '0.00'}</span>
                    </div>
                    <div className="flex gap-2 justify-end border-t border-slate-100 pt-2">
                      <button
                        onClick={() => handleDownloadInvoice(p)}
                        className="bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-bold text-[10px] px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" /> Download Invoice
                      </button>
                      {p.paymentStatus === 'Pending' && (
                        <button
                          disabled={confirmingPaymentId === p.id}
                          onClick={() => handleConfirmPayment(p.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" /> {confirmingPaymentId === p.id ? 'Confirming…' : 'Confirm Payment'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {completedList.length === 0 && (
                  <p className="text-[11px] text-slate-400 text-center py-6">No completed pickups yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PROFILE TAB — Module 15 */}
        {activeTab === 'profile' && personalForm && vehicleForm && (
          <div className="max-w-2xl mx-auto flex flex-col gap-6 animate-fade-in">

            {/* Identity card + photo upload */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="relative">
                  <img className="w-16 h-16 rounded-full object-cover border-2 border-brand-500 shadow-md" src={partner.profilePicUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(partner.name)} alt="profile" />
                  <label className="absolute -bottom-1 -right-1 bg-brand-600 hover:bg-brand-700 text-white rounded-full p-1.5 cursor-pointer shadow-md transition">
                    <Upload className="w-3 h-3" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleProfilePhotoSelected} disabled={photoUploading} />
                  </label>
                </div>
                <div className="text-center sm:text-left">
                  <h2 className="text-base font-bold text-slate-800">{partner.name}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{partner.email} · ID: {partner.displayCode ?? partner.id}</p>
                  <span className="inline-block bg-brand-50 text-brand-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-1.5">★ {partner.rating.toFixed(1)} · {partner.status}</span>
                  {photoUploading && <p className="text-[10px] text-slate-400 mt-1">Uploading photo…</p>}
                </div>
              </div>
            </div>

            {/* Personal details form (Task 15.1) */}
            <form onSubmit={handleSavePersonalDetails} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xl flex flex-col gap-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Personal details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Full Name</label>
                  <input type="text" required value={personalForm.fullName} onChange={(e) => setPersonalForm({ ...personalForm, fullName: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Phone Number</label>
                  <input type="tel" value={personalForm.phone} onChange={(e) => setPersonalForm({ ...personalForm, phone: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Email</label>
                  <input type="email" readOnly disabled value={partner.email} className="bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs cursor-not-allowed text-slate-400" />
                </div>
              </div>
              {personalMessage && (
                <p className={`text-[11px] font-semibold ${personalMessage.startsWith('✓') ? 'text-emerald-600' : 'text-red-600'}`}>{personalMessage}</p>
              )}
              <button type="submit" disabled={personalSaving} className="self-start bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-md">
                {personalSaving ? 'Saving…' : 'Save Personal Details'}
              </button>
            </form>

            {/* Vehicle + document numbers form (Task 15.2) */}
            <form onSubmit={handleSaveVehicleDetails} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xl flex flex-col gap-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Vehicle & document credentials</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Vehicle Type</label>
                  <select value={vehicleForm.vehicleType} onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleType: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option>Electric Box Truck</option>
                    <option>Heavy Duty Van</option>
                    <option>E-Cargo Bike</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">License Plate Number</label>
                  <input type="text" value={vehicleForm.vehicleNumber} onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleNumber: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Driving License ID</label>
                  <input type="text" value={vehicleForm.drivingLicense} onChange={(e) => setVehicleForm({ ...vehicleForm, drivingLicense: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">National ID (Aadhaar) Number</label>
                  <input type="text" value={vehicleForm.aadhaarNumber} onChange={(e) => setVehicleForm({ ...vehicleForm, aadhaarNumber: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
              {vehicleMessage && (
                <p className={`text-[11px] font-semibold ${vehicleMessage.startsWith('✓') ? 'text-emerald-600' : 'text-red-600'}`}>{vehicleMessage}</p>
              )}
              <button type="submit" disabled={vehicleSaving} className="self-start bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-md">
                {vehicleSaving ? 'Saving…' : 'Save Vehicle & Document Details'}
              </button>
            </form>

            {/* Document photo uploads (Task 15.3) */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xl flex flex-col gap-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Uploaded documents</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Driving License Photo</label>
                  {partner.drivingLicenseDocUrl ? (
                    <img src={partner.drivingLicenseDocUrl} alt="Driving license" className="w-full h-28 object-cover rounded-lg border border-slate-200" />
                  ) : (
                    <div className="w-full h-28 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-[10px] text-slate-400">No document uploaded</div>
                  )}
                  <label className="text-[10px] font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg px-3 py-2 text-center cursor-pointer transition">
                    {uploadingDocType === 'license' ? 'Uploading…' : partner.drivingLicenseDocUrl ? 'Replace Photo' : 'Upload Photo'}
                    <input type="file" accept="image/*" className="hidden" disabled={uploadingDocType !== null} onChange={(e) => handleDocumentFileSelected('license', e)} />
                  </label>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Aadhaar (National ID) Photo</label>
                  {partner.aadhaarDocUrl ? (
                    <img src={partner.aadhaarDocUrl} alt="Aadhaar" className="w-full h-28 object-cover rounded-lg border border-slate-200" />
                  ) : (
                    <div className="w-full h-28 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-[10px] text-slate-400">No document uploaded</div>
                  )}
                  <label className="text-[10px] font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg px-3 py-2 text-center cursor-pointer transition">
                    {uploadingDocType === 'aadhaar' ? 'Uploading…' : partner.aadhaarDocUrl ? 'Replace Photo' : 'Upload Photo'}
                    <input type="file" accept="image/*" className="hidden" disabled={uploadingDocType !== null} onChange={(e) => handleDocumentFileSelected('aadhaar', e)} />
                  </label>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 bg-slate-50 border border-slate-100 rounded-xl p-3 leading-relaxed">
                Uploaded documents are visible to EcoLoop admins for verification. Re-uploading replaces what's shown here; the previous file is kept in storage but no longer linked to your profile.
              </p>
            </div>
          </div>
        )}

      </main>

    </div>
  );
}
