import React, { useState } from 'react';
import { UserRole, WasteCategory } from '../types';
import { 
  Leaf, Recycle, ArrowRight, ShieldCheck, DollarSign, Gift, Trophy, HelpCircle, 
  MapPin, Phone, Mail, Globe, Search, ChevronDown, CheckCircle, Upload, ArrowLeft,
  Briefcase, Truck, Users, Activity, BarChart3, Star, Award, Heart
} from 'lucide-react';
import { INITIAL_PRICING_RATES } from '../data';
import { useAuth } from '../context/AuthContext';
import VerifyEmailNotice from './VerifyEmailNotice';
import ForgotPasswordForm from './ForgotPasswordForm';

interface PublicModuleProps {
  onLoginSuccess: () => void;
  initialTab?: string;
}

export default function PublicModule({ onLoginSuccess, initialTab = 'home' }: PublicModuleProps) {
  const { signIn, signUp, isAuthenticating } = useAuth();
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [faqSearch, setFaqSearch] = useState<string>('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginRole, setLoginRole] = useState<'customer' | 'partner' | 'industry' | 'admin'>('customer');
  const [loginRemember, setLoginRemember] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  // Registration State
  const [registerRole, setRegisterRole] = useState<'customer' | 'partner' | 'industry'>('customer');
  const [regSuccess, setRegSuccess] = useState(false);
  const [regError, setRegError] = useState('');
  const [regNeedsVerification, setRegNeedsVerification] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '', address: '', city: '', state: '', pincode: ''
  });
  const [partnerForm, setPartnerForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '', address: '', vehicleType: 'Electric Box Truck', vehicleNumber: '', license: '', aadhaar: ''
  });
  const [industryForm, setIndustryForm] = useState({
    companyName: '', industryType: '', gstNumber: '', regNumber: '', contactPerson: '', email: '', phone: '', address: '', password: '', confirmPassword: ''
  });

  // Contact Form State
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const categories: { name: WasteCategory; color: string; icon: string; desc: string }[] = [
    { name: 'Paper', color: 'bg-blue-50 text-blue-600 border-blue-200', icon: '📄', desc: 'Notebooks, mail, magazines, office papers' },
    { name: 'Plastic', color: 'bg-teal-50 text-teal-600 border-teal-200', icon: '🥤', desc: 'Beverage bottles, milk jugs, food tubs' },
    { name: 'Glass', color: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: '🍾', desc: 'Beer & wine bottles, jars, glass packaging' },
    { name: 'Metal', color: 'bg-amber-50 text-amber-600 border-amber-200', icon: '🥫', desc: 'Aluminum beverage cans, copper wires, steels' },
    { name: 'E-Waste', color: 'bg-purple-50 text-purple-600 border-purple-200', icon: '💻', desc: 'Laptops, chargers, screens, processors' },
    { name: 'Cardboard', color: 'bg-orange-50 text-orange-600 border-orange-200', icon: '📦', desc: 'Corrugated boxes, packing boards, paperboard' },
    { name: 'Textile', color: 'bg-indigo-50 text-indigo-600 border-indigo-200', icon: '👕', desc: 'Worn out clothes, linens, cotton sheets' },
    { name: 'Organic', color: 'bg-lime-50 text-lime-600 border-lime-200', icon: '🍎', desc: 'Kitchen scraps, coffee dregs, leaves' },
    { name: 'Batteries', color: 'bg-red-50 text-red-600 border-red-200', icon: '🔋', desc: 'Alkaline, Li-ion, rechargeable packs' },
    { name: 'Electronic Devices', color: 'bg-rose-50 text-rose-600 border-rose-200', icon: '📺', desc: 'Computer monitors, heavy laser printers' },
    { name: 'Others', color: 'bg-slate-50 text-slate-600 border-slate-200', icon: '🔄', desc: 'Tires, composite items, unsorted bags' }
  ];

  const faqs = [
    {
      q: "How does the pricing system calculate my waste value?",
      a: "Our system relies on live rates set per kilogram for each specific waste category (e.g., ₹120/kg for E-Waste). During pickup, our Delivery Partner verifies the actual weight on physical scales and generates an invoice immediately. Earnings are credited directly to your EcoLoop Wallet.",
      cat: "pricing"
    },
    {
      q: "Can I redeem my Eco Points for real cashback?",
      a: "Absolutely! There are two channels: Waste sales yield direct withdrawable dollars in your wallet. DIY submissions and community referrals yield 'Eco Points', which can be redeemed in our Rewards Store for shopping vouchers, native trees, or carbon offset credits.",
      cat: "rewards"
    },
    {
      q: "What vehicle types are supported for Delivery Partners?",
      a: "We support Electric Cargo Bikes (best for urban centers), Heavy Duty Vans, and Electric Box Trucks. All delivery partner applicants must upload valid driver licenses and pass background audits.",
      cat: "partner"
    },
    {
      q: "How do recycling industries purchase waste from the platform?",
      a: "Registered and certified recycling industries receive sorted bulk shipments routed by our delivery network. Industrial accounts can view incoming materials, audit the quality grade, and complete automated transactions via pre-integrated smart dashboards.",
      cat: "industry"
    },
    {
      q: "What are DIY eco projects and how do I earn rewards?",
      a: "DIY projects are custom creations built entirely of recycled materials (like plastic bottle vertical gardens). By uploading 'before' and 'after' images alongside material lists, customers receive special Eco Points upon administrator validation.",
      cat: "rewards"
    }
  ];

  const filteredFaqs = faqs.filter(f => 
    f.q.toLowerCase().includes(faqSearch.toLowerCase()) || 
    f.a.toLowerCase().includes(faqSearch.toLowerCase())
  );

  // Task 4.2 — Email Login (real Supabase auth; role comes from the profiles table afterward)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!loginEmail || !loginPassword) {
      setLoginError('Please enter both your email and password.');
      return;
    }

    const result = await signIn(loginEmail, loginPassword);
    if (!result.success) {
      setLoginError(result.error || 'Login failed. Please try again.');
      return;
    }

    // AuthContext resolves the real role from `profiles`; App.tsx routes to the
    // matching module automatically once the session updates.
    onLoginSuccess();
  };

  // Task 4.1 — Email Signup (real Supabase auth + profile creation via DB trigger)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    let payload: Parameters<typeof signUp>[0] | null = null;

    if (registerRole === 'customer') {
      const f = customerForm;
      if (f.password !== f.confirmPassword) {
        setRegError('Passwords do not match.');
        return;
      }
      payload = {
        role: 'customer',
        email: f.email,
        password: f.password,
        fullName: f.name,
        phone: f.phone,
        address: f.address,
        city: f.city,
        state: f.state,
        pincode: f.pincode,
      };
    } else if (registerRole === 'partner') {
      const f = partnerForm;
      if (f.password !== f.confirmPassword) {
        setRegError('Passwords do not match.');
        return;
      }
      payload = {
        role: 'partner',
        email: f.email,
        password: f.password,
        fullName: f.name,
        phone: f.phone,
        address: f.address,
        vehicleType: f.vehicleType,
        vehicleNumber: f.vehicleNumber,
        drivingLicense: f.license,
        aadhaarNumber: f.aadhaar,
      };
    } else {
      const f = industryForm;
      if (f.password !== f.confirmPassword) {
        setRegError('Passwords do not match.');
        return;
      }
      payload = {
        role: 'industry',
        email: f.email,
        password: f.password,
        fullName: f.contactPerson,
        phone: f.phone,
        address: f.address,
        companyName: f.companyName,
        industryType: f.industryType,
        gstNumber: f.gstNumber,
        regNumber: f.regNumber,
        contactPerson: f.contactPerson,
      };
    }

    const result = await signUp(payload);
    if (!result.success) {
      setRegError(result.error || 'Registration failed. Please try again.');
      return;
    }

    setRegNeedsVerification(Boolean(result.needsEmailVerification));
    setRegSuccess(true);
  };

  const autofillCredentials = (role: 'customer' | 'partner' | 'industry' | 'admin') => {
    setLoginRole(role);
    setLoginPassword('');
    setLoginError('');
    if (role === 'admin') {
      setLoginEmail('admin@ecoloop.com');
    } else if (role === 'partner') {
      setLoginEmail('daniel.cruz@ecoloop-partner.com');
    } else if (role === 'industry') {
      setLoginEmail('contact@evergreenpaper.com');
    } else {
      setLoginEmail('alex.rivera@gmail.com');
    }
  };

  return (
    <div id="public-module-container" className="min-h-screen bg-slate-50 flex flex-col font-sans pb-24 md:pb-0">
      {/* Dynamic Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-md shadow-brand-200">
              <Leaf className="w-5 h-5" />
            </div>
            <div>
              <span className="font-display text-xl font-bold tracking-tight text-slate-900">Eco<span className="text-brand-600">Loop</span></span>
              <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500">Smart Waste Hub</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <button onClick={() => setActiveTab('home')} className={`text-xs font-semibold px-2 py-1 transition ${activeTab === 'home' ? 'text-brand-600 font-bold' : 'text-slate-600 hover:text-slate-900'}`}>Home</button>
            <button onClick={() => setActiveTab('about')} className={`text-xs font-semibold px-2 py-1 transition ${activeTab === 'about' ? 'text-brand-600 font-bold' : 'text-slate-600 hover:text-slate-900'}`}>About</button>
            <button onClick={() => setActiveTab('faq')} className={`text-xs font-semibold px-2 py-1 transition ${activeTab === 'faq' ? 'text-brand-600 font-bold' : 'text-slate-600 hover:text-slate-900'}`}>FAQs & Pricing</button>
            <button onClick={() => setActiveTab('contact')} className={`text-xs font-semibold px-2 py-1 transition ${activeTab === 'contact' ? 'text-brand-600 font-bold' : 'text-slate-600 hover:text-slate-900'}`}>Contact</button>
          </nav>

          <div className="flex items-center gap-2.5">
            <button onClick={() => setActiveTab('login')} className="text-xs font-semibold text-slate-700 hover:text-brand-600 px-3.5 py-2 rounded-lg transition">Login</button>
            <button onClick={() => setActiveTab('register')} className="text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl transition shadow-xs">Register</button>
          </div>
        </div>
      </header>

      {/* Main Public Pages */}
      <main className="flex-1">
        {/* HOME VIEW */}
        {activeTab === 'home' && (
          <div className="animate-fade-in">
            {/* HERO */}
            <section className="relative overflow-hidden py-16 md:py-24 bg-gradient-to-b from-brand-50/50 via-white to-slate-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                <div className="lg:col-span-7 flex flex-col gap-6">
                  <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-800 px-3 py-1 rounded-full text-xs font-semibold w-fit">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Join the #1 Recycling Revolution</span>
                  </div>
                  <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
                    Turn Your <span className="text-brand-600 relative inline-block">Waste<span className="absolute bottom-1.5 left-0 w-full h-2.5 bg-brand-100 -z-10 rounded-sm"></span></span> Into <br /> 
                    <span className="text-slate-800">Durable Value</span>
                  </h1>
                  <p className="text-sm sm:text-base text-slate-600 max-w-xl leading-relaxed">
                    Schedule reliable doorstop pickups, track your environmental impact, and get paid instantly. EcoLoop connects homes, local eco-drivers, and industrial recycling centers seamlessly.
                  </p>
                  <div className="flex flex-wrap gap-3.5 pt-2">
                    <button onClick={() => { setActiveTab('register'); setRegisterRole('customer'); }} className="text-xs sm:text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl transition flex items-center gap-2 shadow-lg shadow-brand-100">
                      Start Recycling Now <ArrowRight className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setActiveTab('register'); setRegisterRole('partner'); }} className="text-xs sm:text-sm font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-5 py-3 rounded-xl transition">
                      Become a Partner
                    </button>
                  </div>
                  
                  {/* Small social trust footer */}
                  <div className="flex items-center gap-3 pt-4">
                    <div className="flex -space-x-2">
                      <img className="w-8 h-8 rounded-full border-2 border-white" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100" alt="user" />
                      <img className="w-8 h-8 rounded-full border-2 border-white" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100" alt="user" />
                      <img className="w-8 h-8 rounded-full border-2 border-white" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100" alt="user" />
                    </div>
                    <span className="text-xs text-slate-500 font-medium">Loved by over <strong className="text-slate-900 font-semibold">12,500+ households</strong> & businesses</span>
                  </div>
                </div>

                {/* Right Side Mockup Canvas */}
                <div className="lg:col-span-5 relative">
                  <div className="relative mx-auto max-w-[340px] md:max-w-[380px] bg-slate-900 p-3 rounded-[3rem] shadow-2xl border-4 border-slate-800">
                    <div className="absolute top-1/2 -left-6 bg-white border border-slate-100 shadow-xl p-3.5 rounded-2xl flex items-center gap-3 animate-pulse-subtle z-20">
                      <div className="p-2 rounded-xl bg-green-100 text-green-600">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium">Paid to Users</p>
                        <p className="text-xs font-bold text-slate-900 font-mono">₹18,45,290.00</p>
                      </div>
                    </div>
                    <div className="absolute -bottom-4 -right-2 bg-slate-900 text-white p-3.5 rounded-2xl flex items-center gap-3 border border-slate-800 shadow-xl z-20">
                      <div className="p-2 rounded-xl bg-brand-600 text-white">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium">Eco Points Issued</p>
                        <p className="text-xs font-bold text-brand-400 font-mono">1.26M Points</p>
                      </div>
                    </div>

                    {/* Screenshot Frame */}
                    <div className="bg-slate-50 rounded-[2.5rem] overflow-hidden aspect-[9/18] relative flex flex-col border border-slate-100">
                      {/* Top status bar */}
                      <div className="bg-white px-5 py-2.5 flex items-center justify-between border-b border-slate-100">
                        <span className="text-[10px] font-bold text-slate-800 font-mono">09:41 AM</span>
                        <div className="w-16 h-4 bg-slate-200 rounded-full flex items-center justify-center">
                          <span className="inline-block w-2 h-2 rounded-full bg-brand-500 mr-1.5" />
                          <span className="text-[7px] text-slate-500 font-bold uppercase tracking-wider font-mono">EL-V3.8</span>
                        </div>
                      </div>
                      {/* App Mock Content */}
                      <div className="p-4 flex-1 flex flex-col gap-3.5 overflow-hidden">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-slate-200" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100')`, backgroundSize: 'cover' }}></div>
                            <div>
                              <p className="text-[9px] text-slate-400 font-medium">Welcome back,</p>
                              <p className="text-[11px] font-bold text-slate-800 leading-none">Alex Rivera</p>
                            </div>
                          </div>
                          <div className="bg-brand-50 text-brand-700 px-2 py-1 rounded-md text-[9px] font-bold">★ Gold Level</div>
                        </div>

                        {/* Balance Panel */}
                        <div className="bg-brand-900 text-white p-3 rounded-2xl flex flex-col gap-1 shadow-md">
                          <span className="text-[9px] text-brand-200 font-medium">WALLET & ECO-BALANCE</span>
                          <span className="text-xl font-bold font-mono">₹12,850.00</span>
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-brand-800/50 text-[9px] text-brand-100">
                            <span>Points: 2,450 XP</span>
                            <span className="bg-brand-700 px-1.5 py-0.5 rounded text-white font-semibold">Redeem Store</span>
                          </div>
                        </div>

                        {/* Mini Form Mock */}
                        <div className="bg-white p-3 rounded-2xl border border-slate-200/60 flex flex-col gap-2">
                          <p className="text-[10px] font-bold text-slate-800">Schedule New Pickup</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100 text-center">
                              <span className="block text-[8px] text-slate-400">Category</span>
                              <span className="text-[10px] font-semibold text-slate-700">💻 E-Waste</span>
                            </div>
                            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100 text-center">
                              <span className="block text-[8px] text-slate-400">Est. Weight</span>
                              <span className="text-[10px] font-semibold text-slate-700">12.5 Kg</span>
                            </div>
                          </div>
                          <button className="w-full bg-brand-600 text-white text-[10px] font-bold py-2 rounded-xl mt-1 text-center">
                            Confirm Pickup Request
                          </button>
                        </div>

                        {/* Recent Activity Mini */}
                        <div className="flex-1 flex flex-col gap-1.5 min-h-0">
                          <p className="text-[10px] font-bold text-slate-800">Active Request</p>
                          <div className="bg-white p-2 rounded-xl border border-slate-200/60 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">♻️</span>
                              <div>
                                <p className="text-[9px] font-bold text-slate-800">Assigned Driver</p>
                                <p className="text-[8px] text-slate-500">Daniel Cruz (Box Truck)</p>
                              </div>
                            </div>
                            <span className="bg-indigo-50 text-indigo-700 text-[8px] px-2 py-0.5 rounded-md font-bold">Arrived</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* KEY PLATFORM METRICS */}
            <section className="bg-slate-900 text-white py-12">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <p className="text-center text-xs font-mono tracking-widest text-brand-400 uppercase mb-8">Platform Aggregates & Impact History</p>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 text-center">
                  <div className="p-3">
                    <span className="block font-mono text-2xl sm:text-3xl font-extrabold text-brand-400">12.5K+</span>
                    <span className="text-xs text-slate-400 font-medium">Households</span>
                  </div>
                  <div className="p-3">
                    <span className="block font-mono text-2xl sm:text-3xl font-extrabold text-brand-400">842</span>
                    <span className="text-xs text-slate-400 font-medium">Eco Partners</span>
                  </div>
                  <div className="p-3">
                    <span className="block font-mono text-2xl sm:text-3xl font-extrabold text-brand-400">56</span>
                    <span className="text-xs text-slate-400 font-medium">Recycling Industries</span>
                  </div>
                  <div className="p-3">
                    <span className="block font-mono text-2xl sm:text-3xl font-extrabold text-brand-400">2,845T</span>
                    <span className="text-xs text-slate-400 font-medium">Waste Collected</span>
                  </div>
                  <div className="p-3">
                    <span className="block font-mono text-2xl sm:text-3xl font-extrabold text-brand-400">₹18.4L</span>
                    <span className="text-xs text-slate-400 font-medium">Paid to Public</span>
                  </div>
                  <div className="p-3">
                    <span className="block font-mono text-2xl sm:text-3xl font-extrabold text-brand-400">126K</span>
                    <span className="text-xs text-slate-400 font-medium">Reward Badges</span>
                  </div>
                </div>
              </div>
            </section>

            {/* WASTE CATEGORIES */}
            <section className="py-16 bg-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-10">
                <div className="text-center max-w-xl mx-auto flex flex-col gap-2">
                  <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">What Waste We Accept & Recycle</h2>
                  <p className="text-xs sm:text-sm text-slate-500">Every material sorted is redirected to verified processing hubs, yielding real rewards for your sustainable effort.</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {categories.map((c) => {
                    const priceInfo = INITIAL_PRICING_RATES.find(pr => pr.category === c.name);
                    return (
                      <div key={c.name} className={`p-4 rounded-2xl border border-slate-100 flex flex-col gap-3 transition-all hover:shadow-md ${c.color.split(' ')[0]}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl">{c.icon}</span>
                          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-white/80 border border-slate-100">
                            ₹{priceInfo ? priceInfo.pricePerKg : '10.00'}/Kg
                          </span>
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-800">{c.name}</h4>
                          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{c.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* HOW IT WORKS */}
            <section className="py-16 bg-slate-50 border-t border-b border-slate-100">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-12">
                <div className="text-center max-w-xl mx-auto flex flex-col gap-2">
                  <span className="text-[10px] font-mono tracking-widest text-brand-600 uppercase font-semibold">Automated Eco-System Loop</span>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">The EcoLoop Journey</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { step: '01', title: 'Register & Schedule', text: 'Sign up as a customer, input your address, and select waste categories with a preferred time slot.' },
                    { step: '02', title: 'Partner Collects & Weights', text: 'A local delivery partner accepts, arrives at your doorstep, weighs items on audited digital scales, and updates the bill.' },
                    { step: '03', title: 'Get Paid Instantly', text: 'Receive automated earnings directly into your EcoLoop digital wallet, withdrawable to any bank account instantly.' },
                    { step: '04', title: 'Bulk Industrial Recycling', text: 'Collected materials are sorted and routed directly to specialized industries for ecological re-fabrication.' }
                  ].map((s) => (
                    <div key={s.step} className="bg-white p-5 rounded-2xl border border-slate-100 relative flex flex-col gap-3 group hover:border-brand-500 transition-all shadow-xs">
                      <span className="absolute -top-3 left-4 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-900 text-white group-hover:bg-brand-600 transition">Step {s.step}</span>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800 mt-2">{s.title}</h4>
                      <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">{s.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* REWARDS PROGRAM HIGHLIGHT */}
            <section className="py-16 bg-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="flex flex-col gap-6">
                  <span className="text-[10px] font-mono tracking-widest text-brand-600 uppercase font-semibold">Community Gamification</span>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-tight">
                    Earn Eco Points, Collect Badges, <br />& Save the Planet
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                    Recycling on EcoLoop goes beyond receiving cashback. Accumulate special Eco Points to level up through bronze, silver, and gold tiers, unlocking badges that reflect your carbon footprint savings.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600"><Gift className="w-4 h-4" /></div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">Gift Vouchers</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">Redeem points for real store credits.</p>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-brand-100 text-brand-600"><Leaf className="w-4 h-4" /></div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">Tree Planting</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">We plant native forest trees in your name.</p>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-purple-100 text-purple-600"><Award className="w-4 h-4" /></div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">DIY Challenges</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">Submit scrap crafts and earn up to 500 XP.</p>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-amber-100 text-amber-600"><Trophy className="w-4 h-4" /></div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">Leaderboards</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">Compete with neighborhoods for bonuses.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Left illustrative card stack */}
                <div className="bg-slate-50 border border-slate-200/60 p-6 rounded-2xl flex flex-col gap-4">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                    <Trophy className="w-4 h-4 text-brand-600" /> Reward Store Hot Items
                  </h4>
                  <div className="flex flex-col gap-3">
                    {[
                      { name: '₹1,000 Amazon Pay E-Voucher', pts: '500 Pts', img: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=150', cat: 'Online Voucher' },
                      { name: 'Plant a Native Tree (Certificate)', pts: '300 Pts', img: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=150', cat: 'Reforestation Credit' }
                    ].map((item, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between shadow-xs">
                        <div className="flex items-center gap-3">
                          <img className="w-12 h-12 rounded-lg object-cover" src={item.img} alt={item.name} />
                          <div>
                            <span className="text-[9px] text-brand-600 font-bold uppercase tracking-wider">{item.cat}</span>
                            <h5 className="text-xs font-bold text-slate-800 leading-tight">{item.name}</h5>
                          </div>
                        </div>
                        <span className="bg-slate-900 text-brand-400 font-mono text-[10px] font-bold px-2.5 py-1 rounded-md">{item.pts}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ABOUT PAGE VIEW */}
        {activeTab === 'about' && (
          <div className="max-w-4xl mx-auto px-4 py-12 flex flex-col gap-10 animate-fade-in">
            <div className="text-center flex flex-col gap-3">
              <span className="text-[10px] font-mono tracking-widest text-brand-600 uppercase font-semibold">Corporate Overview</span>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900">About the EcoLoop Platform</h1>
              <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
                Pioneering waste logistics through community empowerment, real-time pricing transparency, and closed-loop manufacturing channels.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col gap-3 shadow-xs">
                <span className="text-2xl">🎯</span>
                <h3 className="text-sm font-bold text-slate-800">Our Mission</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  To eliminate city-scale landfill waste by converting recyclable consumer debris into verified digital values, establishing a seamless loop between citizens, eco-partners, and heavy manufacturers.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col gap-3 shadow-xs">
                <span className="text-2xl">🌱</span>
                <h3 className="text-sm font-bold text-slate-800">Our Vision</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  To drive a decentralized, carbon-neutral circular economy where household waste collection is as effortless as standard food deliveries, saving billions of metric tons from landfill.
                </p>
              </div>
            </div>

            <div className="bg-slate-900 text-white p-8 rounded-2xl flex flex-col gap-4">
              <h3 className="text-sm font-bold tracking-wider font-mono text-brand-400 uppercase">Environmental Impact Report</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                By integrating specialized tracking logs across the supply-chain, the EcoLoop model directly mitigates global carbon emission burdens. For every 100 kg of E-waste collected, we reclaim 4.2 kg of high-grade copper and 1.8 kg of rare cobalt, offsetting mining carbon footprints by 88%.
              </p>
              <div className="grid grid-cols-3 gap-4 text-center mt-4 pt-4 border-t border-slate-800">
                <div>
                  <span className="block font-mono text-xl font-extrabold text-brand-400">142,400+ Kg</span>
                  <span className="text-[10px] text-slate-400">Methane Reduced</span>
                </div>
                <div>
                  <span className="block font-mono text-xl font-extrabold text-brand-400">2.1 Million</span>
                  <span className="text-[10px] text-slate-400">Gallons Water Saved</span>
                </div>
                <div>
                  <span className="block font-mono text-xl font-extrabold text-brand-400">4,100+ Tons</span>
                  <span className="text-[10px] text-slate-400">CO2 Equivalent Saved</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FAQ & PRICING VIEW */}
        {activeTab === 'faq' && (
          <div className="max-w-4xl mx-auto px-4 py-12 flex flex-col gap-10 animate-fade-in">
            <div className="text-center flex flex-col gap-3">
              <span className="text-[10px] font-mono tracking-widest text-brand-600 uppercase font-semibold">Knowledge Database</span>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900">FAQs & Live Recycling Prices</h1>
            </div>

            {/* Current rates tables */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-brand-600 animate-pulse" /> Live Price Per Kilogram Index
                </h3>
                <span className="text-[9px] font-mono text-slate-400">Refreshed: Today (UTC)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {INITIAL_PRICING_RATES.map((pr, index) => (
                  <div key={index} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-brand-300 transition-all">
                    <span className="text-xs font-semibold text-slate-700">{pr.category}</span>
                    <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-lg">₹{pr.pricePerKg.toFixed(2)} / Kg</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Expandable FAQs */}
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search frequently asked questions..." 
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent shadow-xs"
                />
              </div>

              <div className="flex flex-col gap-2">
                {filteredFaqs.map((faq, idx) => (
                  <div key={idx} className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-xs transition">
                    <button 
                      onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                      className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3 text-xs sm:text-sm font-bold text-slate-800 hover:bg-slate-50 transition"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedFaq === idx ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedFaq === idx && (
                      <div className="px-4 pb-4 pt-1 border-t border-slate-50 text-xs text-slate-500 leading-relaxed bg-slate-50/50">
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
                {filteredFaqs.length === 0 && (
                  <div className="p-12 text-center bg-white rounded-xl border border-slate-100">
                    <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-medium">No results found for your search queries.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CONTACT PAGE VIEW */}
        {activeTab === 'contact' && (
          <div className="max-w-4xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-12 gap-8 animate-fade-in">
            <div className="md:col-span-5 flex flex-col gap-6">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-brand-600 uppercase font-semibold">Get In Touch</span>
                <h1 className="font-display text-3xl font-extrabold text-slate-900 mt-1">Contact Support</h1>
                <p className="text-xs text-slate-500 leading-relaxed mt-2">
                  Our regional support centers are available 24/7 to resolve collection logistics queries, commercial recycling agreements, or reward store issues.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-100 text-brand-600 shadow-xs"><MapPin className="w-4 h-4" /></div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Head Office</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">404 Eco Corridor, Green City, California</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-100 text-brand-600 shadow-xs"><Phone className="w-4 h-4" /></div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Hotlines</h4>
                    <p className="text-[11px] text-slate-500 font-mono">+1 (555) 012-7700</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-100 text-brand-600 shadow-xs"><Mail className="w-4 h-4" /></div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Inquiries</h4>
                    <p className="text-[11px] text-slate-500 font-mono">support@ecoloop-platform.com</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-7 bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
              {contactSubmitted ? (
                <div className="py-12 text-center flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2"><CheckCircle className="w-6 h-6" /></div>
                  <h3 className="text-sm font-bold text-slate-800">Thank you for your message!</h3>
                  <p className="text-xs text-slate-400 max-w-xs leading-relaxed">Our regional representative will review your message and reach back to you within 24 working hours.</p>
                  <button onClick={() => { setContactSubmitted(false); setContactForm({ name: '', email: '', subject: '', message: '' }); }} className="text-[11px] font-bold text-brand-600 mt-2 hover:underline">Send another message</button>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); setContactSubmitted(true); }} className="flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-slate-800">Send an Inquiry Message</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Your Name</label>
                      <input 
                        type="text" 
                        required 
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" 
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Email Address</label>
                      <input 
                        type="email" 
                        required 
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" 
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Subject</label>
                    <input 
                      type="text" 
                      required 
                      value={contactForm.subject}
                      onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" 
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Inquiry Description</label>
                    <textarea 
                      required 
                      rows={4}
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                    ></textarea>
                  </div>
                  <button type="submit" className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-sm">
                    Submit Message Form
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* LOGIN VIEW */}
        {activeTab === 'login' && (
          <div className="max-w-md mx-auto px-4 py-16 flex flex-col gap-6 animate-fade-in">
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xl flex flex-col gap-5">
              <div className="text-center flex flex-col gap-1">
                <span className="font-display text-xl font-bold tracking-tight text-slate-950">Welcome to Eco<span className="text-brand-600">Loop</span></span>
                <p className="text-[11px] text-slate-500">Access your personalized smart recycling console</p>
              </div>

              {loginError && <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 text-[11px] font-semibold">{loginError}</div>}

              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Registered Email</label>
                  <input 
                    type="email" 
                    required 
                    placeholder="Enter email address..."
                    value={loginEmail}
                    onChange={(e) => { setLoginEmail(e.target.value); setLoginError(''); }}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" 
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Security Password</label>
                    <button type="button" onClick={() => setActiveTab('forgot-password')} className="text-[10px] text-brand-600 hover:underline">Forgot Password?</button>
                  </div>
                  <input 
                    type="password" 
                    required 
                    placeholder="Enter account password..."
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" 
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={loginRemember} 
                      onChange={(e) => setLoginRemember(e.target.checked)} 
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span>Remember me on this applet</span>
                  </label>
                </div>

                <button type="submit" disabled={isAuthenticating} className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-md shadow-brand-100">
                  {isAuthenticating ? 'Authenticating...' : 'Authenticate Account'}
                </button>
              </form>

              {/* Quick autofill helper boxes for prototype demo */}
              <div className="border-t border-slate-100 pt-4 flex flex-col gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Developer Quick Login Demo</span>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => autofillCredentials('customer')} className="p-2 border border-slate-200 rounded-lg text-[10px] font-bold hover:bg-slate-50 text-slate-700 text-left">
                    👤 Customer (Alex)
                  </button>
                  <button onClick={() => autofillCredentials('partner')} className="p-2 border border-slate-200 rounded-lg text-[10px] font-bold hover:bg-slate-50 text-slate-700 text-left">
                    🚚 Partner (Daniel)
                  </button>
                  <button onClick={() => autofillCredentials('industry')} className="p-2 border border-slate-200 rounded-lg text-[10px] font-bold hover:bg-slate-50 text-slate-700 text-left">
                    🏭 Industry (EverGreen)
                  </button>
                  <button onClick={() => autofillCredentials('admin')} className="p-2 border border-slate-200 rounded-lg text-[10px] font-bold hover:bg-slate-50 text-slate-700 text-left">
                    👑 Admin Portal
                  </button>
                </div>
              </div>

              <div className="text-center pt-2">
                <span className="text-[11px] text-slate-500">Don't have an account? </span>
                <button onClick={() => setActiveTab('register')} className="text-[11px] text-brand-600 font-bold hover:underline">Register Now</button>
              </div>
            </div>
          </div>
        )}

        {/* Task 4.4 — Forgot Password */}
        {activeTab === 'forgot-password' && (
          <ForgotPasswordForm initialEmail={loginEmail} onBackToLogin={() => setActiveTab('login')} />
        )}

        {/* REGISTER VIEW */}
        {activeTab === 'register' && (
          <div className="max-w-2xl mx-auto px-4 py-12 flex flex-col gap-6 animate-fade-in">
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xl flex flex-col gap-5">
              {regSuccess ? (
                <div className="py-12 text-center flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2"><CheckCircle className="w-6 h-6" /></div>
                  <h3 className="text-sm font-bold text-slate-800">Registration Request Submitted!</h3>
                  <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                    {registerRole === 'customer'
                      ? 'Account created successfully.'
                      : 'Account created successfully. Administrators will review your submitted credentials within 24 hours before your account is activated.'}
                    {regNeedsVerification && ' Please verify your email before logging in — check your inbox for the verification link.'}
                  </p>
                  <button onClick={() => { setRegSuccess(false); setActiveTab('login'); }} className="text-xs font-semibold bg-slate-900 text-white px-4 py-2 rounded-xl mt-3 hover:bg-slate-800 transition">
                    Go to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-5">
                  <div className="text-center">
                    <span className="font-display text-xl font-bold tracking-tight text-slate-950">Join the EcoLoop Loop</span>
                    <p className="text-[11px] text-slate-500 mt-1">Select your specialized platform role to proceed registration</p>
                  </div>

                  {regError && <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 text-[11px] font-semibold">{regError}</div>}

                  {/* Role selection tab button group */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-xl">
                    <button 
                      type="button"
                      onClick={() => setRegisterRole('customer')}
                      className={`py-2 text-[10px] sm:text-xs font-bold rounded-lg transition ${registerRole === 'customer' ? 'bg-white text-brand-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      👤 Customer
                    </button>
                    <button 
                      type="button"
                      onClick={() => setRegisterRole('partner')}
                      className={`py-2 text-[10px] sm:text-xs font-bold rounded-lg transition ${registerRole === 'partner' ? 'bg-white text-brand-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      🚚 Partner
                    </button>
                    <button 
                      type="button"
                      onClick={() => setRegisterRole('industry')}
                      className={`py-2 text-[10px] sm:text-xs font-bold rounded-lg transition ${registerRole === 'industry' ? 'bg-white text-brand-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      🏭 Industry
                    </button>
                  </div>

                  <div className="border-t border-slate-100 pt-2 flex flex-col gap-4">
                    {/* CUSTOMER REGISTRATION FIELDS */}
                    {registerRole === 'customer' && (
                      <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Full Name</label>
                            <input type="text" required placeholder="Alex Rivera" value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Phone Number</label>
                            <input type="tel" required placeholder="+1 (555) 019-2834" value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Email Address</label>
                          <input type="email" required placeholder="alex@gmail.com" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Password</label>
                            <input type="password" required placeholder="••••••••" value={customerForm.password} onChange={(e) => setCustomerForm({ ...customerForm, password: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Confirm Password</label>
                            <input type="password" required placeholder="••••••••" value={customerForm.confirmPassword} onChange={(e) => setCustomerForm({ ...customerForm, confirmPassword: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Street Address</label>
                          <input type="text" required placeholder="482 Maple Avenue, Green District" value={customerForm.address} onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">City</label>
                            <input type="text" required placeholder="Metro City" value={customerForm.city} onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">State</label>
                            <input type="text" required placeholder="California" value={customerForm.state} onChange={(e) => setCustomerForm({ ...customerForm, state: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Pincode</label>
                            <input type="text" required placeholder="94043" value={customerForm.pincode} onChange={(e) => setCustomerForm({ ...customerForm, pincode: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* PARTNER REGISTRATION FIELDS */}
                    {registerRole === 'partner' && (
                      <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Full Name</label>
                            <input type="text" required placeholder="Daniel Cruz" value={partnerForm.name} onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Phone Number</label>
                            <input type="tel" required placeholder="+1 (555) 012-7744" value={partnerForm.phone} onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Email Address</label>
                          <input type="email" required placeholder="daniel.cruz@example.com" value={partnerForm.email} onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Password</label>
                            <input type="password" required placeholder="••••••••" value={partnerForm.password} onChange={(e) => setPartnerForm({ ...partnerForm, password: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Confirm Password</label>
                            <input type="password" required placeholder="••••••••" value={partnerForm.confirmPassword} onChange={(e) => setPartnerForm({ ...partnerForm, confirmPassword: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Vehicle Type</label>
                            <select value={partnerForm.vehicleType} onChange={(e) => setPartnerForm({ ...partnerForm, vehicleType: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500">
                              <option>Electric Box Truck</option>
                              <option>Heavy Duty Van</option>
                              <option>E-Cargo Bike</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Vehicle Number</label>
                            <input type="text" required placeholder="EL-TRUCK-09" value={partnerForm.vehicleNumber} onChange={(e) => setPartnerForm({ ...partnerForm, vehicleNumber: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Driving License ID</label>
                            <input type="text" required placeholder="DL-9823102-A" value={partnerForm.license} onChange={(e) => setPartnerForm({ ...partnerForm, license: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">National ID Number</label>
                            <input type="text" required placeholder="1234-5678-9012" value={partnerForm.aadhaar} onChange={(e) => setPartnerForm({ ...partnerForm, aadhaar: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Driving License Copy (PDF/JPEG)</label>
                          <div className="border-2 border-dashed border-slate-200 hover:border-brand-500 rounded-lg p-4 text-center cursor-pointer flex flex-col items-center gap-1">
                            <Upload className="w-5 h-5 text-slate-400" />
                            <span className="text-[10px] font-semibold text-slate-600">Click to upload license copy</span>
                            <span className="text-[9px] text-slate-400">Max size: 5MB</span>
                          </div>
                          <span className="text-[9px] text-slate-400 mt-1">File upload wiring comes in Module 26 (External Services) — not required to submit registration.</span>
                        </div>
                      </div>
                    )}

                    {/* INDUSTRY REGISTRATION FIELDS */}
                    {registerRole === 'industry' && (
                      <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Registered Company Name</label>
                            <input type="text" required placeholder="EverGreen Paper Mills" value={industryForm.companyName} onChange={(e) => setIndustryForm({ ...industryForm, companyName: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Industry Processing Type</label>
                            <input type="text" required placeholder="Paper Recycling & Pulper" value={industryForm.industryType} onChange={(e) => setIndustryForm({ ...industryForm, industryType: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">GST Registration ID</label>
                            <input type="text" required placeholder="GST-99283102-ECO" value={industryForm.gstNumber} onChange={(e) => setIndustryForm({ ...industryForm, gstNumber: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Corporate License ID</label>
                            <input type="text" required placeholder="REG-88102-PVT" value={industryForm.regNumber} onChange={(e) => setIndustryForm({ ...industryForm, regNumber: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="flex flex-col gap-1 col-span-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Contact Person</label>
                            <input type="text" required placeholder="David Vance" value={industryForm.contactPerson} onChange={(e) => setIndustryForm({ ...industryForm, contactPerson: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                          </div>
                          <div className="flex flex-col gap-1 col-span-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Work Email</label>
                            <input type="email" required placeholder="contact@evergreen.com" value={industryForm.email} onChange={(e) => setIndustryForm({ ...industryForm, email: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                          </div>
                          <div className="flex flex-col gap-1 col-span-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Work Hotline</label>
                            <input type="tel" required placeholder="+1 (555) 015-4421" value={industryForm.phone} onChange={(e) => setIndustryForm({ ...industryForm, phone: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Password</label>
                            <input type="password" required placeholder="••••••••" value={industryForm.password} onChange={(e) => setIndustryForm({ ...industryForm, password: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Confirm Password</label>
                            <input type="password" required placeholder="••••••••" value={industryForm.confirmPassword} onChange={(e) => setIndustryForm({ ...industryForm, confirmPassword: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Corporate Address</label>
                          <input type="text" required placeholder="Industrial Sector 4, Green Lane" value={industryForm.address} onChange={(e) => setIndustryForm({ ...industryForm, address: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                        </div>
                      </div>
                    )}
                  </div>

                  <button type="submit" disabled={isAuthenticating} className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-md">
                    {isAuthenticating ? 'Submitting...' : 'Submit Registration Request'}
                  </button>

                  <div className="text-center pt-2">
                    <span className="text-[11px] text-slate-500">Already registered? </span>
                    <button onClick={() => setActiveTab('login')} className="text-[11px] text-brand-600 font-bold hover:underline">Log in here</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white mt-auto border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-sm">
                <Leaf className="w-4 h-4" />
              </div>
              <span className="font-display text-lg font-bold">Eco<span className="text-brand-400">Loop</span></span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Building a zero-waste future through technology-driven circular economy solutions.
            </p>
            <p className="text-[10px] text-slate-500 mt-2 font-mono">© 2026 EcoLoop Platform. All rights reserved.</p>
          </div>
          <div>
            <h4 className="text-xs font-bold tracking-widest uppercase text-brand-400 font-mono mb-3">Resources</h4>
            <ul className="flex flex-col gap-2 text-xs text-slate-400">
              <li><button onClick={() => setActiveTab('faq')} className="hover:text-white transition">Live Pricing List</button></li>
              <li><button onClick={() => setActiveTab('faq')} className="hover:text-white transition">Platform FAQs</button></li>
              <li><button onClick={() => setActiveTab('about')} className="hover:text-white transition">Platform Workflows</button></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold tracking-widest uppercase text-brand-400 font-mono mb-3">Support Hub</h4>
            <ul className="flex flex-col gap-2 text-xs text-slate-400">
              <li><button onClick={() => setActiveTab('contact')} className="hover:text-white transition">Help Center</button></li>
              <li><button onClick={() => setActiveTab('contact')} className="hover:text-white transition">Report an Issue</button></li>
              <li><button onClick={() => setActiveTab('contact')} className="hover:text-white transition">Terms & Privacy</button></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold tracking-widest uppercase text-brand-400 font-mono mb-3">Eco Community</h4>
            <ul className="flex flex-col gap-2 text-xs text-slate-400">
              <li><button onClick={() => setActiveTab('home')} className="hover:text-white transition">Eco Point Badges</button></li>
              <li><button onClick={() => setActiveTab('home')} className="hover:text-white transition">DIY Showcase</button></li>
              <li><button onClick={() => setActiveTab('home')} className="hover:text-white transition">Referral Rewards</button></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}