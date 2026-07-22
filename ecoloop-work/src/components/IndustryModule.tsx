import React, { useEffect, useState } from 'react';
import { useIndustryDashboard } from '../hooks/useIndustryDashboard';
import { downloadInventoryReport } from '../utils/industryReport';
import type { IndustryProcessingStatus } from '../services/industryService';
import {
  Factory, LayoutDashboard, Inbox, Database, RefreshCw, BarChart3,
  User, CheckCircle2, AlertCircle, Download, ShieldCheck, ChevronRight,
  ArrowRight, Loader2, Upload
} from 'lucide-react';

interface IndustryModuleProps {
  onLogout: () => void;
}

const INDUSTRY_TYPE_OPTIONS = ['Paper Recycling', 'Plastic Recycling', 'Metal Smelting', 'E-Waste Processing', 'Composting Facility', 'Mixed Materials Recovery'];

export default function IndustryModule({ onLogout }: IndustryModuleProps) {
  // Sidebar tabs
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Real Supabase-backed company profile, inventory, deliveries, and
  // profile-edit actions (Modules 16, 17 & 18) — this hook is now the
  // single source of truth for the whole Industry Module.
  const {
    loading,
    profile,
    inventory,
    reportStats,
    availableDeliveries,
    myDeliveries,
    acceptDelivery,
    advanceProcessingStatus,
    updateCompanyInformation,
    updateContactDetails,
    uploadDocument,
    updateEmailNotificationSetting,
  } = useIndustryDashboard();

  // "Reject" a piece of incoming cargo is a client-only session filter —
  // same pattern as the Partner side's "Ignore" button (Module 12) — so a
  // rejected item just disappears from THIS session's list and stays
  // available for a different Industry account; nothing is persisted.
  const [ignoredDeliveryIds, setIgnoredDeliveryIds] = useState<number[]>([]);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [advancingId, setAdvancingId] = useState<number | null>(null);

  // Profile tab state (Module 18)
  const [companyForm, setCompanyForm] = useState<{ companyName: string; industryType: string; gstNumber: string; regNumber: string } | null>(null);
  const [companySaving, setCompanySaving] = useState(false);
  const [companyMessage, setCompanyMessage] = useState<string | null>(null);

  const [contactForm, setContactForm] = useState<{ contactPerson: string; phone: string } | null>(null);
  const [contactSaving, setContactSaving] = useState(false);
  const [contactMessage, setContactMessage] = useState<string | null>(null);

  const [uploadingDocType, setUploadingDocType] = useState<'gst' | 'registration' | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setCompanyForm({
        companyName: profile.companyName ?? '',
        industryType: profile.industryType ?? INDUSTRY_TYPE_OPTIONS[0],
        gstNumber: profile.gstNumber ?? '',
        regNumber: profile.regNumber ?? '',
      });
      setContactForm({
        contactPerson: profile.contactPerson ?? '',
        phone: profile.phone ?? '',
      });
    }
  }, [profile]);

  if (loading || !profile || !reportStats || !companyForm || !contactForm) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p className="text-xs font-semibold uppercase tracking-wider">Loading industrial facility workspace…</p>
        </div>
      </div>
    );
  }

  const visibleIncoming = availableDeliveries.filter((d) => !ignoredDeliveryIds.includes(d.id));

  // Handlers — Module 17
  const handleAcceptDelivery = async (deliveryId: number) => {
    setAcceptingId(deliveryId);
    const result = await acceptDelivery(deliveryId);
    setAcceptingId(null);
    if (!result.success) {
      alert(result.error ?? 'This cargo may have already been claimed by another facility.');
    }
  };

  const handleRejectDelivery = (deliveryId: number) => {
    setIgnoredDeliveryIds((prev) => [...prev, deliveryId]);
  };

  const handleAdvanceProcessing = async (pickupId: number, currentStatus: IndustryProcessingStatus) => {
    setAdvancingId(pickupId);
    await advanceProcessingStatus(pickupId, currentStatus);
    setAdvancingId(null);
  };

  // Handlers — Module 18
  const handleSaveCompanyInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompanyMessage(null);
    setCompanySaving(true);
    const result = await updateCompanyInformation(companyForm);
    setCompanySaving(false);
    setCompanyMessage(result.success ? '✓ Company information updated successfully.' : result.error ?? 'Could not save your changes.');
    if (result.success) setTimeout(() => setCompanyMessage(null), 3000);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactMessage(null);
    setContactSaving(true);
    const result = await updateContactDetails(contactForm);
    setContactSaving(false);
    setContactMessage(result.success ? '✓ Contact details updated successfully.' : result.error ?? 'Could not save your changes.');
    if (result.success) setTimeout(() => setContactMessage(null), 3000);
  };

  const handleDocumentFileSelected = async (docType: 'gst' | 'registration', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingDocType(docType);
    const url = await uploadDocument(docType, file);
    setUploadingDocType(null);
    if (!url) alert(`Could not upload your ${docType === 'gst' ? 'GST certificate' : 'registration certificate'}. Please try again.`);
  };

  const handleToggleEmailNotifications = async () => {
    setSettingsSaving(true);
    await updateEmailNotificationSetting(!profile.emailNotificationsEnabled);
    setSettingsSaving(false);
  };

  const processingBatches = myDeliveries.filter((d) => d.industryProcessingStatus && d.industryProcessingStatus !== 'Completed');

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
          <h4 className="text-xs font-bold text-white truncate">{profile.companyName}</h4>
          <span className="inline-flex items-center gap-1.5 text-[9px] text-brand-300 font-bold font-mono">
            <ShieldCheck className="w-3.5 h-3.5" /> Certified Recycling Partner
          </span>
        </div>

        {/* Links Corridor */}
        <nav className="flex-1 flex flex-col gap-1">
          {[
            { id: 'dashboard', label: 'Overview Metrics', icon: <LayoutDashboard className="w-4 h-4" /> },
            { id: 'deliveries', label: 'Incoming Bulk Cargo', icon: <Inbox className="w-4 h-4" />, badge: visibleIncoming.length },
            { id: 'inventory', label: 'Warehouse Silos', icon: <Database className="w-4 h-4" /> },
            { id: 'processing', label: 'Processing Status', icon: <RefreshCw className="w-4 h-4" />, badge: processingBatches.length },
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
          <span className="text-[9px]">Cargo ({visibleIncoming.length})</span>
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
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-h-screen overflow-y-auto pb-20 md:pb-8">

        {/* OVERVIEW DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-extrabold text-slate-900">Industrial Facility Workspace</h1>
              <p className="text-xs text-slate-500 mt-1">Logged in: {profile.companyName}{profile.address ? ` · Facility Location: ${profile.address}` : ''}</p>
            </div>

            {/* QUICK STATS CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between h-28">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Waste Reclaimed (Kg)</span>
                <div className="mt-2">
                  <p className="text-xl sm:text-2xl font-bold font-mono text-slate-900">{profile.wasteReceivedKg.toLocaleString()} Kg</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">All-time ecological tonnage intake</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between h-28">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Registered Cargo Shipments</span>
                <div className="mt-2">
                  <p className="text-xl sm:text-2xl font-bold font-mono text-slate-900">{profile.deliveriesCount}</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">Sourced from Eco-Drivers network</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between h-28">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Incoming Bulk Shipments</span>
                <div className="mt-2">
                  <p className="text-xl sm:text-2xl font-bold font-mono text-amber-600">{visibleIncoming.length}</p>
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
                  {inventory.map((item) => {
                    const percent = item.capacityKg > 0 ? Math.min((item.quantityKg / item.capacityKg) * 100, 100) : 0;
                    return (
                      <div key={item.category} className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-700">{item.category} Stocks <span className="text-[10px] font-normal text-slate-400">({item.location ?? '—'})</span></span>
                          <span className="font-mono font-bold text-slate-800">{item.quantityKg.toLocaleString()} / {item.capacityKg.toLocaleString()} Kg</span>
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
                  {inventory.filter((i) => i.capacityKg > 0 && i.quantityKg / i.capacityKg >= 0.8).map((item) => (
                    <div key={item.category} className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">{item.category} Silo Capacity Notice</p>
                        <p className="text-[10px] text-rose-600 mt-0.5">{item.location ?? 'This silo'} is currently at {((item.quantityKg / item.capacityKg) * 100).toFixed(0)}% maximum storage. Please initiate sorting batch runs.</p>
                      </div>
                    </div>
                  ))}
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
              <p className="text-xs text-slate-500 mt-1">Real cargo completed by Eco-Drivers and not yet claimed by any facility. Review weights before approving silo storage entry.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleIncoming.map((d) => (
                <div key={d.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 font-mono">PICKUP ID: #{d.id}</span>
                    <span className="bg-amber-50 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase font-mono">{d.status}</span>
                  </div>

                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800">Carrier: {d.partnerName}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{d.partnerPhone ?? '—'}</p>
                    <div className="flex gap-2 items-center mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100/60 text-xs">
                      <span className="font-bold text-slate-800">{d.category} Cargo</span>
                      <span className="text-slate-400 font-mono">|</span>
                      <span className="font-mono font-bold text-slate-800">{(d.actualWeight ?? d.estimatedWeight).toLocaleString()} Kg Load</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-50 pt-3.5 flex justify-end gap-2">
                    <button onClick={() => handleRejectDelivery(d.id)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold px-3.5 py-1.5 rounded-xl transition">Reject Batch</button>
                    <button
                      onClick={() => handleAcceptDelivery(d.id)}
                      disabled={acceptingId === d.id}
                      className="bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-[10px] font-bold px-4 py-1.5 rounded-xl transition shadow-sm"
                    >
                      {acceptingId === d.id ? 'Accepting…' : 'Accept Silo Load'}
                    </button>
                  </div>
                </div>
              ))}
              {visibleIncoming.length === 0 && (
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
            <div>
              <h1 className="text-xl font-display font-extrabold text-slate-900">Warehouse Silos</h1>
              <p className="text-xs text-slate-500 mt-1">Real-time storage levels per waste category, synced to your account.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {inventory.map((item) => {
                const percent = item.capacityKg > 0 ? Math.min((item.quantityKg / item.capacityKg) * 100, 100) : 0;
                return (
                  <div key={item.category} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between h-36">
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-800">{item.category} Silo</h4>
                        <span className="text-[9px] font-bold text-slate-400 font-mono uppercase bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{item.location ?? '—'}</span>
                      </div>
                      <p className="text-lg font-bold font-mono text-slate-900 mt-2">{item.quantityKg.toLocaleString()} Kg</p>
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
            {inventory.length === 0 && (
              <div className="py-12 text-center bg-white border border-slate-100 rounded-2xl">
                <Database className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <h3 className="text-xs font-bold text-slate-800">No silo data yet</h3>
                <p className="text-[10px] text-slate-400 mt-1">Your default storage categories will appear here automatically.</p>
              </div>
            )}
          </div>
        )}

        {/* PROCESSING WORKFLOW STATUS */}
        {activeTab === 'processing' && (
          <div className="max-w-3xl mx-auto bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-4 animate-fade-in">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-mono">Active Processing Batches</h2>
              <p className="text-xs text-slate-500 mt-0.5">Real cargo you've accepted, advancing through sorting, processing, and completion.</p>
            </div>

            <div className="flex flex-col gap-3 mt-2">
              {myDeliveries.filter((d) => d.industryProcessingStatus).map((d) => {
                const status = d.industryProcessingStatus as IndustryProcessingStatus;
                return (
                  <div key={d.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <h4 className="font-bold text-slate-800">Pickup #{d.id} · {d.category} · {(d.actualWeight ?? d.estimatedWeight).toLocaleString()} Kg</h4>
                      <div className="flex gap-1.5 items-center mt-1">
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>{status} Stage</span>
                      </div>
                    </div>

                    {status !== 'Completed' && (
                      <button
                        onClick={() => handleAdvanceProcessing(d.id, status)}
                        disabled={advancingId === d.id}
                        className="bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold text-[10px] px-3.5 py-1.5 rounded-xl transition flex items-center gap-1"
                      >
                        {advancingId === d.id ? 'Advancing…' : 'Advance Machinery Loop'} <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
              {myDeliveries.filter((d) => d.industryProcessingStatus).length === 0 && (
                <div className="py-10 text-center bg-slate-50 border border-slate-100 rounded-xl">
                  <RefreshCw className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                  <h3 className="text-xs font-bold text-slate-700">No active batches</h3>
                  <p className="text-[10px] text-slate-400 mt-1">Accept a delivery from Incoming Bulk Cargo to start a processing batch.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* REPORTS LOGS */}
        {activeTab === 'reports' && (
          <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-fade-in">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-mono">Commercial Recycling Tonnage Reports</h2>
                <button onClick={() => downloadInventoryReport(profile, inventory, reportStats)} className="bg-slate-900 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" /> Download Full CSV
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase font-mono">Carbon Mining Mitigation</span>
                  <span className="block text-xl font-bold font-mono text-emerald-600 mt-1">{reportStats.co2MitigatedTons.toLocaleString()} Tons Co2</span>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase font-mono">Reclaimed raw grade value</span>
                  <span className="block text-xl font-bold font-mono text-slate-800 mt-1">₹{reportStats.reclaimedValueEstimate.toLocaleString()} Est.</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Estimates derived from your all-time {reportStats.wasteReceivedKg.toLocaleString()} Kg reclaimed across {reportStats.deliveriesCount} shipments, using standard per-Kg conversion factors. Not a certified environmental audit figure.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xl flex flex-col gap-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-mono">Silo Utilization Statistics</h2>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase font-mono">Total Stored</span>
                  <span className="block text-xl font-bold font-mono text-slate-900 mt-1">{reportStats.totalInventoryKg.toLocaleString()} Kg</span>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase font-mono">Total Capacity</span>
                  <span className="block text-xl font-bold font-mono text-slate-900 mt-1">{reportStats.totalInventoryCapacityKg.toLocaleString()} Kg</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xl flex flex-col gap-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-mono">Delivery History</h2>
              <div className="flex flex-col gap-2">
                {myDeliveries.slice(0, 8).map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-xs bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                    <span className="font-bold text-slate-700">#{d.id} · {d.category} · {(d.actualWeight ?? d.estimatedWeight).toLocaleString()} Kg</span>
                    <span className="text-[9px] font-bold font-mono uppercase text-slate-400">{d.industryProcessingStatus ?? d.status}</span>
                  </div>
                ))}
                {myDeliveries.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No deliveries accepted yet.</p>}
              </div>
            </div>
          </div>
        )}

        {/* INDUSTRIAL PROFILE TAB — Module 18 */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto flex flex-col gap-6 animate-fade-in">
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xl flex flex-col sm:flex-row items-center gap-5">
              <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 text-3xl font-bold border-2 border-amber-500 shadow-md">🏭</div>
              <div className="text-center sm:text-left">
                <h2 className="text-base font-bold text-slate-800">{profile.companyName}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{profile.email} · ID: {profile.displayCode ?? profile.id}</p>
                <span className="inline-block bg-amber-50 text-amber-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-1.5">GST registered: {profile.gstNumber ?? '—'}</span>
              </div>
            </div>

            {/* Company information (Task 18.1) */}
            <form onSubmit={handleSaveCompanyInfo} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xl flex flex-col gap-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Corporate business credentials</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Company Name</label>
                  <input type="text" required value={companyForm.companyName} onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Industry Type</label>
                  <select value={companyForm.industryType} onChange={(e) => setCompanyForm({ ...companyForm, industryType: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500">
                    {INDUSTRY_TYPE_OPTIONS.map((opt) => <option key={opt}>{opt}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">GST ID Number</label>
                  <input type="text" value={companyForm.gstNumber} onChange={(e) => setCompanyForm({ ...companyForm, gstNumber: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Corporate License / Registration ID</label>
                  <input type="text" value={companyForm.regNumber} onChange={(e) => setCompanyForm({ ...companyForm, regNumber: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
              </div>
              {companyMessage && (
                <p className={`text-[11px] font-semibold ${companyMessage.startsWith('✓') ? 'text-emerald-600' : 'text-red-600'}`}>{companyMessage}</p>
              )}
              <button type="submit" disabled={companySaving} className="self-start bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-sm">
                {companySaving ? 'Saving…' : 'Save Company Information'}
              </button>
            </form>

            {/* Contact (Task 18.3) */}
            <form onSubmit={handleSaveContact} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xl flex flex-col gap-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Facility contact details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Facility Manager</label>
                  <input type="text" value={contactForm.contactPerson} onChange={(e) => setContactForm({ ...contactForm, contactPerson: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Corporate Hotline</label>
                  <input type="tel" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
              </div>
              {contactMessage && (
                <p className={`text-[11px] font-semibold ${contactMessage.startsWith('✓') ? 'text-emerald-600' : 'text-red-600'}`}>{contactMessage}</p>
              )}
              <button type="submit" disabled={contactSaving} className="self-start bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-sm">
                {contactSaving ? 'Saving…' : 'Save Contact Details'}
              </button>
            </form>

            {/* Documents (Task 18.2) */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xl flex flex-col gap-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Uploaded documents</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">GST Certificate</label>
                  {profile.gstDocUrl ? (
                    <img src={profile.gstDocUrl} alt="GST certificate" className="w-full h-28 object-cover rounded-lg border border-slate-200" />
                  ) : (
                    <div className="w-full h-28 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-[10px] text-slate-400">No document uploaded</div>
                  )}
                  <label className="text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg px-3 py-2 text-center cursor-pointer transition flex items-center justify-center gap-1">
                    <Upload className="w-3 h-3" /> {uploadingDocType === 'gst' ? 'Uploading…' : profile.gstDocUrl ? 'Replace Photo' : 'Upload Photo'}
                    <input type="file" accept="image/*" className="hidden" disabled={uploadingDocType !== null} onChange={(e) => handleDocumentFileSelected('gst', e)} />
                  </label>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Registration Certificate</label>
                  {profile.registrationDocUrl ? (
                    <img src={profile.registrationDocUrl} alt="Registration certificate" className="w-full h-28 object-cover rounded-lg border border-slate-200" />
                  ) : (
                    <div className="w-full h-28 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-[10px] text-slate-400">No document uploaded</div>
                  )}
                  <label className="text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg px-3 py-2 text-center cursor-pointer transition flex items-center justify-center gap-1">
                    <Upload className="w-3 h-3" /> {uploadingDocType === 'registration' ? 'Uploading…' : profile.registrationDocUrl ? 'Replace Photo' : 'Upload Photo'}
                    <input type="file" accept="image/*" className="hidden" disabled={uploadingDocType !== null} onChange={(e) => handleDocumentFileSelected('registration', e)} />
                  </label>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 bg-slate-50 border border-slate-100 rounded-xl p-3 leading-relaxed">
                Uploaded documents are visible to EcoLoop admins for verification. Re-uploading replaces what's shown here; the previous file is kept in storage but no longer linked to your profile.
              </p>
            </div>

            {/* Settings (Task 18.4) */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xl flex flex-col gap-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Settings</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">Email Notifications</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Receive email alerts for new incoming cargo and silo capacity warnings.</p>
                </div>
                <button
                  onClick={handleToggleEmailNotifications}
                  disabled={settingsSaving}
                  className={`relative w-11 h-6 rounded-full transition ${profile.emailNotificationsEnabled ? 'bg-amber-600' : 'bg-slate-200'} disabled:opacity-60`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition ${profile.emailNotificationsEnabled ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

    </div>
  );
}
