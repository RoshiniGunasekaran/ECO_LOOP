import React, { useState } from 'react';
import { 
  CustomerItem, PickupRequest, DIYProject, Transaction, RewardProduct, 
  NotificationItem, WasteCategory, PickupStatus, SupportTicket, SavedAddress, PickupFeedback 
} from '../types';
import { 
  INITIAL_CUSTOMERS, INITIAL_PICKUP_REQUESTS, INITIAL_DIY_PROJECTS, 
  INITIAL_TRANSACTIONS, INITIAL_REWARD_PRODUCTS, INITIAL_NOTIFICATIONS, 
  WASTE_SUBCATEGORIES, INITIAL_PRICING_RATES, INITIAL_SAVED_ADDRESSES, INITIAL_SUPPORT_TICKETS, INITIAL_FEEDBACKS
} from '../data';
import { 
  LayoutDashboard, PlusCircle, History, Wallet, Gift, Heart, User, Bell,
  Calendar, MapPin, Truck, CheckCircle2, ChevronRight, Search, Filter, 
  ArrowUpRight, ArrowDownLeft, Trash2, Map, ShieldAlert, Award, FileText, 
  MessageSquare, ThumbsUp, X, Upload, Check, AlertCircle, Sparkles, ArrowLeft,
  Settings, HelpCircle, Star, Copy, Shield, ChevronDown, Download, Share2, Globe, Send, RefreshCw
} from 'lucide-react';
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
import { AreaChart, Area } from 'recharts';

interface CustomerModuleProps {
  onLogout: () => void;
}

export default function CustomerModule({ onLogout }: CustomerModuleProps) {
  // Active Sidebar Tab
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  // Local Shared States (acting as a temporary in-memory DB)
  const [customer, setCustomer] = useState<CustomerItem>(INITIAL_CUSTOMERS[0]);
  const [pickups, setPickups] = useState<PickupRequest[]>(INITIAL_PICKUP_REQUESTS);
  const [diyProjects, setDiyProjects] = useState<DIYProject[]>(INITIAL_DIY_PROJECTS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [rewardStore, setRewardStore] = useState<RewardProduct[]>(INITIAL_REWARD_PRODUCTS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    INITIAL_NOTIFICATIONS.filter(n => n.role === 'customer' || n.role === 'all')
  );

  // New Startup-grade States
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>(INITIAL_SAVED_ADDRESSES);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(INITIAL_SUPPORT_TICKETS);
  const [feedbacks, setFeedbacks] = useState<PickupFeedback[]>(INITIAL_FEEDBACKS);
  
  const [globalSearch, setGlobalSearch] = useState('');
  const [language, setLanguage] = useState<'en' | 'hi' | 'mr'>('en');
  const [activeSettingsSubTab, setActiveSettingsSubTab] = useState<'account' | 'security' | 'notifications' | 'privacy' | 'addresses' | 'referrals'>('account');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [pickupSort, setPickupSort] = useState<'date-desc' | 'date-asc' | 'weight-desc' | 'weight-asc'>('date-desc');

  // Support Form State
  const [supportCategory, setSupportCategory] = useState<'Payment Issue' | 'Missed Pickup' | 'Damaged Items' | 'App Bug' | 'Other'>('Payment Issue');
  const [supportSubject, setSupportSubject] = useState('');
  const [supportDescription, setSupportDescription] = useState('');
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);
  const [ticketReplyText, setTicketReplyText] = useState('');
  const [supportSuccess, setSupportSuccess] = useState(false);
  const [faqSearch, setFaqSearch] = useState('');
  const [supportFaqExpanded, setSupportFaqExpanded] = useState<number | null>(null);

  // Feedback/Ratings Form State
  const [activeRatingPickupId, setActiveRatingPickupId] = useState<string | null>(null);
  const [ratingValue, setRatingValue] = useState<number>(5);
  const [commentValue, setCommentValue] = useState<string>('');
  const [ratingSuccess, setRatingSuccess] = useState<boolean>(false);

  // Saved Address Form State
  const [newAddressLabel, setNewAddressLabel] = useState<string>('Home');
  const [newAddressText, setNewAddressText] = useState<string>('');
  const [newAddressCity, setNewAddressCity] = useState<string>('');
  const [newAddressState, setNewAddressState] = useState<string>('');
  const [newAddressPincode, setNewAddressPincode] = useState<string>('');

  // Change Password State
  const [pwdState, setPwdState] = useState({ old: '', newPwd: '', confirm: '' });
  const [pwdSuccess, setPwdSuccess] = useState(false);

  // Search & Filter state for Pickups
  const [pickupSearch, setPickupSearch] = useState('');
  const [pickupFilter, setPickupFilter] = useState<string>('All'); // Represents Status
  const [pickupCategoryFilter, setPickupCategoryFilter] = useState<string>('All'); // Represents Material Category
  const [pickupSortOrder, setPickupSortOrder] = useState<'newest' | 'oldest'>('newest'); // Represents order
  const [selectedPickup, setSelectedPickup] = useState<PickupRequest | null>(null);

  // Create Pickup Request Form State
  const [newPickup, setNewPickup] = useState({
    category: 'Paper' as WasteCategory,
    subcategory: '',
    condition: 'Good' as 'Excellent' | 'Good' | 'Fair' | 'Poor',
    estimatedWeight: 10,
    quantity: 1,
    address: customer.address,
    landmark: '',
    preferredDate: '2026-07-16',
    preferredTime: '10:00 AM - 12:00 PM',
    notes: '',
    specialInstructions: '',
    imageFile: null as File | null,
    imagePreview: ''
  });
  const [createPickupSuccess, setCreatePickupSuccess] = useState(false);

  // DIY Submission State
  const [newDIY, setNewDIY] = useState({
    name: '',
    description: '',
    materials: '',
    estimatedCost: 5,
    benefits: '',
    beforeImage: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=200',
    afterImage: 'https://images.unsplash.com/photo-1545249390-6bdfa286032f?auto=format&fit=crop&q=80&w=200'
  });
  const [diySuccess, setDiySuccess] = useState(false);

  // Wallet Actions State
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawalSuccess, setWithdrawalSuccess] = useState(false);
  const [bankDetails, setBankDetails] = useState({
    accountName: customer.name,
    accountNumber: '982103492102',
    bankName: 'Chase Savings Hub',
    routingNumber: '021000021',
    upiId: 'alex.rivera@upi'
  });

  // Notification Pane
  const [notifPaneOpen, setNotifPaneOpen] = useState(false);

  // New Comment State for DIY Community Explorer
  const [newComment, setNewComment] = useState<Record<string, string>>({});

  // Helper calculation for new pickup estimations
  const currentPriceRate = INITIAL_PRICING_RATES.find(p => p.category === newPickup.category)?.pricePerKg || 0.10;
  const estimatedPayout = (newPickup.estimatedWeight * currentPriceRate).toFixed(2);

  // Form Handlers
  const handleCreatePickupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const reqId = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
    const freshPickup: PickupRequest = {
      id: reqId,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      category: newPickup.category,
      subcategory: newPickup.subcategory || (WASTE_SUBCATEGORIES[newPickup.category]?.[0] || 'Unsorted Goods'),
      condition: newPickup.condition,
      estimatedWeight: newPickup.estimatedWeight,
      quantity: newPickup.quantity,
      pickupAddress: newPickup.address,
      landmark: newPickup.landmark,
      preferredDate: newPickup.preferredDate,
      preferredTime: newPickup.preferredTime,
      images: [newPickup.imagePreview || 'https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&q=80&w=300'],
      notes: newPickup.notes,
      specialInstructions: newPickup.specialInstructions,
      status: 'Pending',
      estimatedAmount: parseFloat(estimatedPayout),
      paymentStatus: 'Unpaid',
      createdAt: new Date().toISOString()
    };

    setPickups([freshPickup, ...pickups]);
    setCreatePickupSuccess(true);
    
    // Add Notification
    const newNotif: NotificationItem = {
      id: `NTF-${Math.random()}`,
      userId: customer.id,
      role: 'customer',
      title: 'Pickup Requested',
      message: `Your request ${reqId} for ${newPickup.category} has been submitted successfully.`,
      type: 'info',
      read: false,
      createdAt: new Date().toISOString()
    };
    setNotifications([newNotif, ...notifications]);

    // Reset Form
    setTimeout(() => {
      setCreatePickupSuccess(false);
      setActiveTab('pickups');
    }, 2000);
  };

  const handleCancelPickup = (id: string) => {
    if (confirm("Are you sure you want to cancel this pickup request?")) {
      setPickups(pickups.map(p => p.id === id ? { ...p, status: 'Cancelled' as PickupStatus } : p));
      
      // Update stats
      const canceledPickup = pickups.find(p => p.id === id);
      if (canceledPickup) {
        const cancelNotif: NotificationItem = {
          id: `NTF-${Math.random()}`,
          userId: customer.id,
          role: 'customer',
          title: 'Pickup Cancelled',
          message: `Request ${id} was successfully cancelled.`,
          type: 'warning',
          read: false,
          createdAt: new Date().toISOString()
        };
        setNotifications([cancelNotif, ...notifications]);
      }
    }
  };

  const handleWithdrawalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0 || amountNum > customer.walletBalance) {
      alert("Invalid withdrawal amount or insufficient balance.");
      return;
    }

    // Process Mock transaction
    const newTx: Transaction = {
      id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: customer.id,
      type: 'Withdrawal',
      amount: amountNum,
      description: `Transfer to ${bankDetails.bankName} Account`,
      status: 'Completed',
      date: new Date().toISOString()
    };

    setTransactions([newTx, ...transactions]);
    setCustomer({
      ...customer,
      walletBalance: customer.walletBalance - amountNum
    });
    setWithdrawalSuccess(true);
    setTimeout(() => {
      setWithdrawalSuccess(false);
      setWithdrawModalOpen(false);
      setWithdrawAmount('');
    }, 2000);
  };

  const handleRedeemReward = (reward: RewardProduct) => {
    if (customer.rewardPoints < reward.costPoints) {
      alert(`Insufficient Eco Points! You need ${reward.costPoints - customer.rewardPoints} more points to redeem this.`);
      return;
    }

    if (confirm(`Redeem "${reward.name}" for ${reward.costPoints} Eco Points?`)) {
      setCustomer({
        ...customer,
        rewardPoints: customer.rewardPoints - reward.costPoints
      });

      const newTx: Transaction = {
        id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
        userId: customer.id,
        type: 'Reward',
        amount: 0,
        points: reward.costPoints,
        description: `Redeemed ${reward.name}`,
        status: 'Completed',
        date: new Date().toISOString()
      };

      setTransactions([newTx, ...transactions]);

      alert(`Success! Check your registered email for your digital voucher or redemption details.`);
    }
  };

  const handleDIYSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const diyId = `DIY-${Math.floor(100 + Math.random() * 900)}`;
    const newCraft: DIYProject = {
      id: diyId,
      customerId: customer.id,
      customerName: customer.name,
      projectName: newDIY.name,
      projectDescription: newDIY.description,
      materialsUsed: newDIY.materials.split(',').map(m => m.trim()),
      estimatedCost: newDIY.estimatedCost,
      benefits: newDIY.benefits,
      beforeImage: newDIY.beforeImage,
      afterImage: newDIY.afterImage,
      status: 'Pending',
      rewardEarned: 0,
      createdAt: new Date().toISOString(),
      likes: 0,
      comments: []
    };

    setDiyProjects([newCraft, ...diyProjects]);
    setDiySuccess(true);
    setTimeout(() => {
      setDiySuccess(false);
      setNewDIY({
        name: '', description: '', materials: '', estimatedCost: 5, benefits: '',
        beforeImage: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=200',
        afterImage: 'https://images.unsplash.com/photo-1545249390-6bdfa286032f?auto=format&fit=crop&q=80&w=200'
      });
      setActiveTab('diy-projects');
    }, 2000);
  };

  const handleLikeDIY = (diyId: string) => {
    setDiyProjects(diyProjects.map(proj => 
      proj.id === diyId ? { ...proj, likes: proj.likes + 1 } : proj
    ));
  };

  const handleAddComment = (diyId: string) => {
    const text = newComment[diyId];
    if (!text || !text.trim()) return;

    setDiyProjects(diyProjects.map(proj => {
      if (proj.id === diyId) {
        return {
          ...proj,
          comments: [
            ...proj.comments,
            {
              id: `com-${Math.random()}`,
              userName: customer.name,
              text: text,
              createdAt: new Date().toISOString()
            }
          ]
        };
      }
      return proj;
    }));

    setNewComment({ ...newComment, [diyId]: '' });
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPickup({
          ...newPickup,
          imageFile: file,
          imagePreview: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Startup-grade handlers
  const handleDownloadPersonalData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ 
      customer, 
      pickups: pickups.filter(p => p.customerId === customer.id), 
      transactions: transactions.filter(t => t.userId === customer.id), 
      savedAddresses, 
      supportTickets: supportTickets.filter(t => t.userId === customer.id) 
    }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `EcoLoop_Data_${customer.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportPickupsCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Pickup ID,Category,Subcategory,Weight (Kg),Date,Status,Payout Amount (INR)\n";
    pickups.filter(p => p.customerId === customer.id).forEach(p => {
      csvContent += `${p.id},${p.category},${p.subcategory},${p.actualWeight || p.estimatedWeight},${p.preferredDate},${p.status},${(p.finalAmount || p.estimatedAmount).toFixed(2)}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `EcoLoop_Pickups_${customer.id}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleSubmitSupportTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportSubject.trim() || !supportDescription.trim()) return;
    const newTicket: SupportTicket = {
      id: `TCK-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: customer.id,
      userName: customer.name,
      role: 'customer',
      subject: supportSubject,
      category: supportCategory,
      description: supportDescription,
      status: 'Open',
      createdAt: new Date().toISOString(),
      responses: []
    };
    setSupportTickets([newTicket, ...supportTickets]);
    setSupportSubject('');
    setSupportDescription('');
    setSupportSuccess(true);
    setTimeout(() => setSupportSuccess(false), 3000);
  };

  const handleSubmitTicketReply = (ticketId: string) => {
    if (!ticketReplyText.trim()) return;
    setSupportTickets(supportTickets.map(t => {
      if (t.id === ticketId) {
        return {
          ...t,
          responses: [...t.responses, { sender: 'You', text: ticketReplyText, date: new Date().toISOString() }]
        };
      }
      return t;
    }));
    setTicketReplyText('');
  };

  const handleSubmitPickupReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRatingPickupId) return;
    const newFeedback: PickupFeedback = {
      pickupId: activeRatingPickupId,
      customerRating: ratingValue,
      customerComment: commentValue
    };
    setFeedbacks([newFeedback, ...feedbacks.filter(f => f.pickupId !== activeRatingPickupId)]);
    setRatingSuccess(true);
    
    // Add Notification
    const feedbackNotif: NotificationItem = {
      id: `NTF-${Math.random()}`,
      userId: customer.id,
      role: 'customer',
      title: 'Feedback Submitted',
      message: `Thank you for rating your pickup! Your feedback has been registered.`,
      type: 'success',
      read: false,
      createdAt: new Date().toISOString()
    };
    setNotifications([feedbackNotif, ...notifications]);

    setTimeout(() => {
      setRatingSuccess(false);
      setActiveRatingPickupId(null);
      setRatingValue(5);
      setCommentValue('');
    }, 2000);
  };

  const handleAddSavedAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddressText.trim() || !newAddressCity.trim() || !newAddressState.trim() || !newAddressPincode.trim()) {
      alert("Please complete all address fields.");
      return;
    }
    const newAddress: SavedAddress = {
      id: `ADR-${Math.floor(100 + Math.random() * 900)}`,
      label: newAddressLabel,
      address: newAddressText,
      city: newAddressCity,
      state: newAddressState,
      pincode: newAddressPincode,
      isDefault: savedAddresses.length === 0
    };
    setSavedAddresses([...savedAddresses, newAddress]);
    setNewAddressText('');
    setNewAddressCity('');
    setNewAddressState('');
    setNewAddressPincode('');
  };

  const handleSetDefaultAddress = (addressId: string) => {
    setSavedAddresses(savedAddresses.map(adr => ({
      ...adr,
      isDefault: adr.id === addressId
    })));
  };

  const handleDeleteAddress = (addressId: string) => {
    setSavedAddresses(savedAddresses.filter(adr => adr.id !== addressId));
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdState.old || !pwdState.newPwd || !pwdState.confirm) {
      alert("Please fill all password fields.");
      return;
    }
    if (pwdState.newPwd !== pwdState.confirm) {
      alert("New password and confirm password do not match.");
      return;
    }
    setPwdSuccess(true);
    setPwdState({ old: '', newPwd: '', confirm: '' });
    setTimeout(() => setPwdSuccess(false), 3000);
  };


  const unreadNotifCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      
      {/* MOBILE HEADER */}
      <header className="md:hidden bg-brand-900 text-brand-50 border-b border-brand-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white"><Sparkles className="w-4 h-4" /></div>
          <span className="font-display font-bold text-base text-white">EcoLoop Customer</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setNotifPaneOpen(!notifPaneOpen)} className="p-2 bg-brand-850 rounded-lg text-brand-200 hover:text-white relative">
            <Bell className="w-4 h-4" />
            {unreadNotifCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
          </button>
          <button onClick={onLogout} className="text-xs bg-brand-950 border border-brand-800 text-brand-100 font-bold px-3 py-2 rounded-lg hover:bg-brand-800">Logout</button>
        </div>
      </header>

      {/* SIDEBAR NAVIGATION (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-brand-900 text-brand-50 border-r border-brand-800 p-5 shrink-0">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center text-white shadow-lg"><Sparkles className="w-4 h-4" /></div>
          <div>
            <h2 className="font-display font-extrabold text-sm leading-tight text-white">EcoLoop Hub</h2>
            <p className="text-[10px] font-mono text-brand-300 font-bold uppercase tracking-widest">Customer Suite</p>
          </div>
        </div>

        {/* User Card */}
        <div className="bg-brand-950 p-3 rounded-xl border border-brand-800 flex items-center gap-3 mb-6">
          <img className="w-10 h-10 rounded-full object-cover border border-brand-700" src={customer.profilePic} alt="profile" />
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-white truncate">{customer.name}</h4>
            <span className="inline-flex items-center gap-1 text-[9px] text-brand-300 font-bold font-mono">
              <Award className="w-3 h-3" /> Gold Tier
            </span>
          </div>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 flex flex-col gap-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
            { id: 'create-pickup', label: 'Create Pickup', icon: <PlusCircle className="w-4 h-4 text-brand-300" /> },
            { id: 'pickups', label: 'My Pickup Requests', icon: <History className="w-4 h-4" /> },
            { id: 'wallet', label: 'My Wallet & Bank', icon: <Wallet className="w-4 h-4" /> },
            { id: 'rewards', label: 'Rewards Store', icon: <Gift className="w-4 h-4" /> },
            { id: 'diy-projects', label: 'DIY Crafts & submissions', icon: <Sparkles className="w-4 h-4" /> },
            { id: 'community', label: 'Community Explorer', icon: <Heart className="w-4 h-4" /> },
            { id: 'settings', label: 'Settings & Addresses', icon: <Settings className="w-4 h-4" /> },
            { id: 'support', label: 'Support & Helpdesk', icon: <HelpCircle className="w-4 h-4" /> },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setSelectedPickup(null); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition ${
                activeTab === item.id 
                  ? 'bg-brand-800 text-white shadow-lg font-bold' 
                  : 'text-brand-200 hover:text-white hover:bg-brand-800/60'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Notif / Logout Area */}
        <div className="border-t border-brand-800 pt-4 flex flex-col gap-2">
          <button onClick={() => setNotifPaneOpen(true)} className="flex items-center justify-between px-3 py-2 text-xs text-brand-300 hover:text-white transition">
            <span className="flex items-center gap-2"><Bell className="w-4 h-4" /> Notifications</span>
            {unreadNotifCount > 0 && <span className="bg-rose-500 text-white font-mono font-bold text-[9px] px-1.5 py-0.5 rounded-full">{unreadNotifCount}</span>}
          </button>
          <button onClick={onLogout} className="text-xs bg-brand-950 hover:bg-brand-800 border border-brand-800 font-bold py-2 rounded-xl text-brand-200 hover:text-white transition mt-2">
            Logout Session
          </button>
        </div>
      </aside>

      {/* MOBILE NAV FOOTER BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 py-2.5 px-4 flex justify-around items-center z-40 shadow-xl">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'dashboard' ? 'text-brand-600 font-bold' : 'text-slate-400'}`}>
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-[9px]">Dash</span>
        </button>
        <button onClick={() => setActiveTab('create-pickup')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'create-pickup' ? 'text-brand-600 font-bold' : 'text-slate-400'}`}>
          <PlusCircle className="w-4 h-4" />
          <span className="text-[9px]">+ Pickup</span>
        </button>
        <button onClick={() => setActiveTab('pickups')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'pickups' ? 'text-brand-600 font-bold' : 'text-slate-400'}`}>
          <History className="w-4 h-4" />
          <span className="text-[9px]">Pickups</span>
        </button>
        <button onClick={() => setActiveTab('wallet')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'wallet' ? 'text-brand-600 font-bold' : 'text-slate-400'}`}>
          <Wallet className="w-4 h-4" />
          <span className="text-[9px]">Wallet</span>
        </button>
        <button onClick={() => setActiveTab('rewards')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'rewards' ? 'text-brand-600 font-bold' : 'text-slate-400'}`}>
          <Gift className="w-4 h-4" />
          <span className="text-[9px]">Store</span>
        </button>
      </nav>

      {/* MAIN CONTENT WORKSPACE */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-h-screen overflow-y-auto pb-24 md:pb-8">
        
        {/* GLOBAL PREMIUM HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 mb-6 gap-4">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-400 font-medium">
            <span className="hover:text-brand-600 transition cursor-pointer" onClick={() => setActiveTab('dashboard')}>EcoLoop Central</span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            <span className="text-slate-800 font-semibold uppercase tracking-wider font-mono bg-slate-100 px-2 py-0.5 rounded-md">
              {activeTab === 'dashboard' && 'Dashboard'}
              {activeTab === 'create-pickup' && 'Schedule Doorstep'}
              {activeTab === 'pickups' && 'Pickup Log'}
              {activeTab === 'wallet' && 'Eco Ledger'}
              {activeTab === 'rewards' && 'XP Voucher Store'}
              {activeTab === 'diy-projects' && 'DIY Eco Crafts'}
              {activeTab === 'community' && 'Showcase Lobby'}
              {activeTab === 'settings' && 'System Settings'}
              {activeTab === 'support' && 'Support Helpdesk'}
            </span>
          </div>

          {/* Quick Controls Section */}
          <div className="flex items-center gap-2 sm:gap-3 justify-end">
            {/* Search */}
            <div className="relative w-32 sm:w-48">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter pages..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-1 pl-8 pr-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 shadow-2xs"
              />
            </div>

            {/* Language Selector */}
            <div className="relative group">
              <button className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 transition">
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span className="uppercase">{language}</span>
              </button>
              <div className="hidden group-hover:block absolute right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-lg z-50 p-1 text-xs min-w-[100px]">
                <button onClick={() => setLanguage('en')} className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded-lg text-[10px] font-semibold text-slate-700">English (EN)</button>
                <button onClick={() => setLanguage('hi')} className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded-lg text-[10px] font-semibold text-slate-700">Hindi (HI)</button>
                <button onClick={() => setLanguage('mr')} className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded-lg text-[10px] font-semibold text-slate-700">Marathi (MR)</button>
              </div>
            </div>

            {/* Notification Center */}
            <div className="relative">
              <button 
                onClick={() => setNotifPaneOpen(true)}
                className="p-1.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 transition relative shadow-2xs"
              >
                <Bell className="w-3.5 h-3.5" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-bold font-mono px-1 py-0.25 rounded-full">{unreadNotifCount}</span>
                )}
              </button>
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 hover:bg-slate-50 transition shadow-2xs"
              >
                <img className="w-6 h-6 rounded-full object-cover" src={customer.profilePic} alt="pic" />
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showProfileDropdown && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowProfileDropdown(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl p-2 z-40">
                    <div className="p-2.5 border-b border-slate-50">
                      <p className="text-xs font-bold text-slate-800 leading-none">{customer.name}</p>
                      <p className="text-[10px] text-slate-400 mt-1 truncate">{customer.email}</p>
                    </div>
                    <button 
                      onClick={() => { setActiveTab('settings'); setShowProfileDropdown(false); }}
                      className="w-full text-left text-xs font-medium text-slate-600 hover:text-brand-600 hover:bg-brand-50/50 p-2 rounded-xl transition mt-1 flex items-center gap-2"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-400" /> Settings & Profile
                    </button>
                    <button 
                      onClick={() => { setActiveTab('support'); setShowProfileDropdown(false); }}
                      className="w-full text-left text-xs font-medium text-slate-600 hover:text-brand-600 hover:bg-brand-50/50 p-2 rounded-xl transition flex items-center gap-2"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" /> Support Center
                    </button>
                    <button 
                      onClick={onLogout}
                      className="w-full text-left text-xs font-bold text-rose-600 hover:bg-rose-50/50 p-2 rounded-xl transition mt-1 border-t border-slate-50 pt-2 flex items-center gap-2"
                    >
                      <X className="w-3.5 h-3.5" /> Logout Session
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* DASHBOARD VIEW */}
        {activeTab === 'dashboard' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-display font-extrabold text-slate-900">Sustainability Workspace</h1>
                <p className="text-xs text-slate-500 mt-1">Hello, {customer.name}! Track your recycling metrics, logs, and eco dividends.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setActiveTab('create-pickup')} className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition shadow-md shadow-brand-100">
                  <PlusCircle className="w-4 h-4" /> Request Doorstep Pickup
                </button>
              </div>
            </div>

            {/* BENTO STATS GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between h-28">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Wallet Balance</span>
                <div className="mt-2">
                  <p className="text-xl sm:text-2xl font-bold font-mono text-slate-900">₹{customer.walletBalance.toFixed(2)}</p>
                  <button onClick={() => setActiveTab('wallet')} className="text-[10px] text-brand-600 font-bold hover:underline flex items-center gap-1 mt-1">Manage Payouts <ChevronRight className="w-3 h-3" /></button>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between h-28">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Carbon Points</span>
                <div className="mt-2">
                  <p className="text-xl sm:text-2xl font-bold font-mono text-brand-600">{customer.rewardPoints} XP</p>
                  <button onClick={() => setActiveTab('rewards')} className="text-[10px] text-slate-500 font-bold hover:underline flex items-center gap-1 mt-1">Browse Reward Store <ChevronRight className="w-3 h-3" /></button>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between h-28">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Carbon Savings Saved</span>
                <div className="mt-2">
                  <p className="text-xl sm:text-2xl font-bold font-mono text-slate-900">128.5 Kg</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Equiv. 4 trees planted</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between h-28">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Pending Pickups</span>
                <div className="mt-2">
                  <p className="text-xl sm:text-2xl font-bold font-mono text-slate-900">{pickups.filter(p => p.status !== 'Completed' && p.status !== 'Cancelled').length}</p>
                  <button onClick={() => setActiveTab('pickups')} className="text-[10px] text-slate-500 font-bold hover:underline flex items-center gap-1 mt-1">Track Requests <ChevronRight className="w-3 h-3" /></button>
                </div>
              </div>
            </div>

            {/* ACTIVE PICKUPS MAP / TRACKING BANNER */}
            {pickups.some(p => p.status === 'Assigned' || p.status === 'In-Transit' || p.status === 'Arrived') && (
              (() => {
                const activeP = pickups.find(p => p.status === 'Assigned' || p.status === 'In-Transit' || p.status === 'Arrived')!;
                return (
                  <div className="bg-indigo-900 text-white p-5 rounded-2xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 shadow-xl">
                    <div className="flex items-start gap-3.5">
                      <div className="p-3 rounded-xl bg-indigo-800 text-white animate-pulse"><Truck className="w-5 h-5" /></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-indigo-800 text-indigo-200 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase">Live Tracking Active</span>
                          <span className="text-[10px] text-indigo-300 font-mono font-bold">REQ: {activeP.id}</span>
                        </div>
                        <h3 className="text-sm font-bold mt-1">Driver Daniel Cruz is on the way!</h3>
                        <p className="text-xs text-indigo-200 mt-0.5">Estimated arrival: <strong className="text-white">10 - 15 minutes</strong></p>
                      </div>
                    </div>
                    <button onClick={() => { setSelectedPickup(activeP); setActiveTab('pickups'); }} className="bg-white text-indigo-900 hover:bg-slate-100 text-xs font-bold px-4 py-2 rounded-xl self-start lg:self-center transition shadow-sm shrink-0">
                      View Arrival Map
                    </button>
                  </div>
                );
              })()
            )}

            {/* SUSTAINABILITY METRICS & ENVIRONMENTAL IMPACT */}
            <div className="bg-emerald-950 text-white rounded-2xl p-5 border border-emerald-800 shadow-xl relative overflow-hidden">
              <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-8 translate-y-8">
                <Sparkles className="w-64 h-64 text-white" />
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-emerald-800">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest font-mono text-emerald-300">Sustainability & Footprint Impact</h3>
                  <p className="text-[10px] text-emerald-200 mt-0.5">Real-time calculations of your localized circular economy contributions.</p>
                </div>
                <span className="bg-emerald-800/80 text-emerald-200 text-[9px] font-mono font-bold px-2.5 py-1 rounded-md">Validated Carbon Offsets</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-4">
                <div className="bg-emerald-900/50 p-3 rounded-xl border border-emerald-800/40 text-center">
                  <p className="text-[10px] text-emerald-300 uppercase font-mono font-bold">CO₂ Reduced</p>
                  <p className="text-lg font-bold font-mono mt-1 text-white">45.2 Kg</p>
                </div>
                <div className="bg-emerald-900/50 p-3 rounded-xl border border-emerald-800/40 text-center">
                  <p className="text-[10px] text-emerald-300 uppercase font-mono font-bold">Plastic Diverted</p>
                  <p className="text-lg font-bold font-mono mt-1 text-white">18.6 Kg</p>
                </div>
                <div className="bg-emerald-900/50 p-3 rounded-xl border border-emerald-800/40 text-center">
                  <p className="text-[10px] text-emerald-300 uppercase font-mono font-bold">Water Saved</p>
                  <p className="text-lg font-bold font-mono mt-1 text-white">12,400 L</p>
                </div>
                <div className="bg-emerald-900/50 p-3 rounded-xl border border-emerald-800/40 text-center">
                  <p className="text-[10px] text-emerald-300 uppercase font-mono font-bold">Trees Equiv.</p>
                  <p className="text-lg font-bold font-mono mt-1 text-white">4.2 Trees</p>
                </div>
                <div className="bg-emerald-900/50 p-3 rounded-xl border border-emerald-800/40 text-center col-span-2 sm:col-span-1">
                  <p className="text-[10px] text-emerald-300 uppercase font-mono font-bold">Energy Conserved</p>
                  <p className="text-lg font-bold font-mono mt-1 text-white">325 kWh</p>
                </div>
              </div>
            </div>

            {/* DASHBOARD CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-recharts-panel">
              {/* Chart 1: Monthly Earnings (Recharts BarChart) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-4" id="chart-monthly-earnings">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Monthly Earnings Trend</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Calculated payout credits in INR over the last 5 months.</p>
                </div>
                <div className="h-40 w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { month: 'Mar', val: 240 },
                        { month: 'Apr', val: 380 },
                        { month: 'May', val: 190 },
                        { month: 'Jun', val: 510 },
                        { month: 'Jul', val: 420 },
                      ]}
                      margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                        labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                        formatter={(value) => [`₹${value}`, 'Earnings']}
                      />
                      <Bar dataKey="val" fill="#10b981" radius={[4, 4, 0, 0]} barSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Waste Category Distribution (Recharts PieChart) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-4" id="chart-waste-distribution">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Waste Distribution</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Breakdown of submitted recycling items by weight (Kg).</p>
                </div>
                <div className="h-40 flex items-center justify-around gap-2 text-xs">
                  <div className="w-1/2 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Paper', value: 45, color: '#059669' },
                            { name: 'Plastic', value: 30, color: '#3b82f6' },
                            { name: 'E-Waste', value: 15, color: '#f59e0b' },
                            { name: 'Others', value: 10, color: '#94a3b8' },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={25}
                          outerRadius={40}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {[
                            { name: 'Paper', value: 45, color: '#059669' },
                            { name: 'Plastic', value: 30, color: '#3b82f6' },
                            { name: 'E-Waste', value: 15, color: '#f59e0b' },
                            { name: 'Others', value: 10, color: '#94a3b8' },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px' }}
                          formatter={(value) => [`${value}%`, 'Ratio']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-1.5 justify-center w-1/2">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block shrink-0" />
                      <span>Paper (45%)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shrink-0" />
                      <span>Plastic (30%)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shrink-0" />
                      <span>E-Waste (15%)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block shrink-0" />
                      <span>Others (10%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart 3: Carbon Points accumulation (Recharts AreaChart) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-4" id="chart-points-accumulation">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Carbon Points Accumulation (XP)</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">XP tokens unlocked via active circular recycling logs.</p>
                </div>
                <div className="h-40 w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={[
                        { week: 'Week 1', points: 150 },
                        { week: 'Week 2', points: 320 },
                        { week: 'Week 3', points: 480 },
                        { week: 'Week 4', points: 720 },
                      ]}
                      margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                        formatter={(value) => [`${value} XP`, 'XP Accumulated']}
                      />
                      <Area type="monotone" dataKey="points" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorPoints)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* RECENT LISTS SKELETON */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* PICKUP LOGS */}
              <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800">Recent Pickup History</h3>
                  <button onClick={() => setActiveTab('pickups')} className="text-[10px] font-bold text-brand-600 hover:underline">View All</button>
                </div>
                <div className="flex flex-col gap-2">
                  {pickups.slice(0, 3).map((p) => (
                    <div key={p.id} className="p-3 border border-slate-100 rounded-xl hover:border-slate-200 flex items-center justify-between gap-3 bg-slate-50/50 transition">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">♻️</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800">{p.category}</span>
                            <span className="text-[9px] font-mono text-slate-400">({p.id})</span>
                          </div>
                          <p className="text-[10px] text-slate-500">{p.preferredDate} · {p.estimatedWeight} Kg</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="block font-mono text-xs font-bold text-slate-800">₹{(p.finalAmount || p.estimatedAmount).toFixed(2)}</span>
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                          p.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                          p.status === 'Cancelled' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                        }`}>{p.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* NOTIFICATION LOGS & TRANSACTIONS */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                
                {/* WALLET MINI LOG */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-800">Latest Ledger</h3>
                    <button onClick={() => setActiveTab('wallet')} className="text-[10px] font-bold text-brand-600 hover:underline">View Ledger</button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {transactions.slice(0, 3).map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                        <div className="flex items-center gap-2">
                          {tx.type === 'Credit' ? <ArrowUpRight className="w-4 h-4 text-emerald-500" /> : <ArrowDownLeft className="w-4 h-4 text-slate-500" />}
                          <div>
                            <p className="font-semibold text-slate-800 truncate max-w-[140px]">{tx.description}</p>
                            <p className="text-[9px] text-slate-400 font-mono">{tx.date.slice(0, 10)}</p>
                          </div>
                        </div>
                        <span className={`font-mono font-bold ${tx.type === 'Credit' ? 'text-emerald-600' : 'text-slate-600'}`}>
                          {tx.type === 'Credit' ? '+' : '-'}{tx.amount > 0 ? '₹' + tx.amount.toFixed(2) : tx.points + ' Pts'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* CREATE PICKUP VIEW */}
        {activeTab === 'create-pickup' && (
          <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl border border-slate-100 shadow-xl flex flex-col gap-6 animate-fade-in">
            <div>
              <h1 className="text-lg sm:text-xl font-display font-extrabold text-slate-900">Schedule Doorstep Recycling Collection</h1>
              <p className="text-xs text-slate-500">Provide approximate waste category details and select your preferred pickup time slot.</p>
            </div>

            {createPickupSuccess ? (
              <div className="py-12 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-1"><Check className="w-6 h-6" /></div>
                <h3 className="text-sm font-bold text-slate-800">Pickup Request Registered!</h3>
                <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                  We have assigned your collection task to our digital dispatch pool. A local eco-partner will review and accept your route schedule.
                </p>
              </div>
            ) : (
              <form onSubmit={handleCreatePickupSubmit} className="flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* Category */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Waste Category</label>
                    <select 
                      value={newPickup.category}
                      onChange={(e) => setNewPickup({ ...newPickup, category: e.target.value as WasteCategory, subcategory: '' })}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      {Object.keys(WASTE_SUBCATEGORIES).map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sub-Category */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Sub-Category</label>
                    <select 
                      value={newPickup.subcategory}
                      onChange={(e) => setNewPickup({ ...newPickup, subcategory: e.target.value })}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      {(WASTE_SUBCATEGORIES[newPickup.category] || []).map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>

                </div>

                <div className="grid grid-cols-3 gap-3">
                  {/* Estimated Weight */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Est. Weight (Kg)</label>
                    <input 
                      type="number" 
                      min={1} 
                      max={500} 
                      required
                      value={newPickup.estimatedWeight}
                      onChange={(e) => setNewPickup({ ...newPickup, estimatedWeight: parseInt(e.target.value) || 1 })}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" 
                    />
                  </div>

                  {/* Quantity */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Bags/Containers Count</label>
                    <input 
                      type="number" 
                      min={1} 
                      max={100}
                      required
                      value={newPickup.quantity}
                      onChange={(e) => setNewPickup({ ...newPickup, quantity: parseInt(e.target.value) || 1 })}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" 
                    />
                  </div>

                  {/* Waste Condition */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Materials Condition</label>
                    <select 
                      value={newPickup.condition}
                      onChange={(e) => setNewPickup({ ...newPickup, condition: e.target.value as any })}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option>Excellent</option>
                      <option>Good</option>
                      <option>Fair</option>
                      <option>Poor</option>
                    </select>
                  </div>
                </div>

                {/* Upload Waste Photo */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Upload Waste Materials Photo (Optional)</label>
                  <div className="border-2 border-dashed border-slate-200 hover:border-brand-500 rounded-xl p-4 text-center cursor-pointer flex flex-col items-center gap-1.5 bg-slate-50/50">
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-700">Click to upload photo for driver pre-audit</span>
                    <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" id="pickup-img-file" />
                    <label htmlFor="pickup-img-file" className="text-[9px] text-slate-400 cursor-pointer">Support JPG, PNG up to 4MB</label>
                    {newPickup.imagePreview && (
                      <div className="mt-2 relative">
                        <img className="w-24 h-16 object-cover rounded-lg border border-slate-200 shadow-xs" src={newPickup.imagePreview} alt="upload preview" />
                        <button type="button" onClick={() => setNewPickup({ ...newPickup, imagePreview: '' })} className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-0.5"><X className="w-3 h-3" /></button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Address Details */}
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Collection Address</label>
                    <input 
                      type="text" 
                      required
                      value={newPickup.address}
                      onChange={(e) => setNewPickup({ ...newPickup, address: e.target.value })}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" 
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Landmark (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Next to Green Pharmacy" 
                      value={newPickup.landmark}
                      onChange={(e) => setNewPickup({ ...newPickup, landmark: e.target.value })}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Date */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Preferred Date</label>
                    <input 
                      type="date" 
                      required
                      value={newPickup.preferredDate}
                      onChange={(e) => setNewPickup({ ...newPickup, preferredDate: e.target.value })}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" 
                    />
                  </div>

                  {/* Time slot */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Preferred Time Slot</label>
                    <select 
                      value={newPickup.preferredTime}
                      onChange={(e) => setNewPickup({ ...newPickup, preferredTime: e.target.value })}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option>08:00 AM - 10:00 AM</option>
                      <option>10:00 AM - 12:00 PM</option>
                      <option>12:00 PM - 02:00 PM</option>
                      <option>02:00 PM - 04:00 PM</option>
                      <option>04:00 PM - 06:00 PM</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Notes & Special Instructions</label>
                  <textarea 
                    rows={2}
                    placeholder="e.g. Please bring a container bucket..."
                    value={newPickup.notes}
                    onChange={(e) => setNewPickup({ ...newPickup, notes: e.target.value })}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                  ></textarea>
                </div>

                {/* Estimate summary panel */}
                <div className="p-4 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-brand-700 font-bold uppercase tracking-wider">Estimated Eco Yield</p>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-xl font-bold font-mono text-brand-900">₹{estimatedPayout}</span>
                      <span className="text-[10px] text-brand-600">at ₹{currentPriceRate.toFixed(2)}/Kg</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-[9px] text-slate-400 font-bold uppercase">Pickup charges</span>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-md">FREE PICKUP</span>
                  </div>
                </div>

                <button type="submit" className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold py-3 rounded-xl transition shadow-lg shadow-brand-100 text-center">
                  Confirm and Book Pickup Request
                </button>
              </form>
            )}
          </div>
        )}

        {/* PICKUP LISTS & DETAILED TRACKER */}
        {activeTab === 'pickups' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            {selectedPickup ? (
              // DETAILS VIEW / TRACKING CARD
              <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col gap-6 max-w-3xl mx-auto shadow-xl">
                
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <button onClick={() => setSelectedPickup(null)} className="text-xs font-bold text-slate-400 hover:text-slate-900 flex items-center gap-1">
                    <ArrowLeft className="w-4 h-4" /> Back to List
                  </button>
                  <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">REQUEST ID: {selectedPickup.id}</span>
                </div>

                {/* Map Simulation for active partners */}
                {(selectedPickup.status === 'Assigned' || selectedPickup.status === 'In-Transit' || selectedPickup.status === 'Arrived') && (
                  <div className="bg-slate-900 rounded-xl overflow-hidden h-64 relative flex items-center justify-center border border-slate-800 shadow-inner">
                    <div className="absolute inset-0 bg-slate-950 opacity-90 p-4 font-mono text-[9px] text-emerald-400 overflow-hidden flex flex-col gap-1 select-none">
                      <p className="text-brand-400 font-bold uppercase">Map Simulation Engine active...</p>
                      <p>ROUTE: {selectedPickup.pickupAddress} --{">"} Industrial Hub</p>
                      <p>PARTNER: {selectedPickup.partnerName} · vehicle: {selectedPickup.partnerPhone}</p>
                      <p>COORDINATES: lat: 37.7749, lng: -122.4194</p>
                      <p>GPS RE-CALCULATING... DRIVER ETA: 12 MINUTES</p>
                    </div>

                    {/* Vector / Styled Overlay map container */}
                    <div className="relative z-10 text-center flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-brand-500 flex items-center justify-center text-white border-4 border-slate-800 shadow-xl animate-bounce">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Live Route Tracking</h4>
                        <p className="text-[10px] text-slate-400 mt-1">Driver {selectedPickup.partnerName || 'Eco Rider'} is currently near Central Green Corridor</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold font-mono px-3 py-1 rounded-full uppercase animate-pulse">In-Route</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Main details grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left block Info */}
                  <div className="flex flex-col gap-4">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono border-b pb-1">Recyclables Detail</h3>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-2.5 text-xs">
                      <div className="flex justify-between border-b border-slate-100/60 pb-1.5">
                        <span className="text-slate-400">Category</span>
                        <span className="font-bold text-slate-800">{selectedPickup.category}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100/60 pb-1.5">
                        <span className="text-slate-400">Sub-Category</span>
                        <span className="font-bold text-slate-800 truncate max-w-[160px]">{selectedPickup.subcategory}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100/60 pb-1.5">
                        <span className="text-slate-400">Estimated weight</span>
                        <span className="font-bold text-slate-800 font-mono">{selectedPickup.estimatedWeight} Kg</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100/60 pb-1.5">
                        <span className="text-slate-400">Materials Condition</span>
                        <span className="font-bold text-slate-800">{selectedPickup.condition}</span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="text-slate-400 font-medium">Estimated Eco Yield</span>
                        <span className="font-extrabold text-brand-600 font-mono text-sm">₹{selectedPickup.estimatedAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right block Driver info */}
                  <div className="flex flex-col gap-4">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono border-b pb-1">Assigned Partner Details</h3>
                    {selectedPickup.partnerName ? (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-4">
                        <img className="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-xs" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150" alt="driver" />
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">{selectedPickup.partnerName}</h4>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedPickup.partnerPhone}</p>
                          <span className="bg-brand-50 text-brand-700 text-[9px] font-bold px-2 py-0.5 rounded-md mt-1 inline-block">★ 4.9 SuperDriver</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 text-center py-6 flex flex-col items-center justify-center">
                        <span className="inline-block bg-slate-200/50 text-slate-500 rounded-full p-2 animate-bounce"><Truck className="w-4 h-4 text-slate-400" /></span>
                        <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-wider font-mono">Awaiting Driver Allocation</p>
                        <p className="text-[9px] text-slate-400 mt-1 max-w-[180px]">Eco riders are reviewing your request on the driver network.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline Progress */}
                <div className="flex flex-col gap-3 mt-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono border-b pb-1">Detailed Activity Feed</h3>
                  
                  {/* High Density Timeline with actual timestamps */}
                  <div className="flex flex-col gap-3 pl-3">
                    <div className="flex gap-3 text-xs">
                      <div className="flex flex-col items-center">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-mono font-bold text-[9px] flex items-center justify-center">✓</span>
                        <span className="w-0.5 h-6 bg-slate-200"></span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">Recycling request generated</p>
                        <p className="text-[9px] text-slate-400">Scheduled for {selectedPickup.preferredDate} · Slot: {selectedPickup.preferredTime}</p>
                      </div>
                    </div>

                    <div className="flex gap-3 text-xs">
                      <div className="flex flex-col items-center">
                        <span className={`w-5 h-5 rounded-full font-mono font-bold text-[9px] flex items-center justify-center ${selectedPickup.partnerName ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                          {selectedPickup.partnerName ? '✓' : '2'}
                        </span>
                        <span className="w-0.5 h-6 bg-slate-200"></span>
                      </div>
                      <div>
                        <p className={`font-bold ${selectedPickup.partnerName ? 'text-slate-800' : 'text-slate-400'}`}>Rider allocation</p>
                        <p className="text-[9px] text-slate-400">
                          {selectedPickup.partnerName ? `Assigned to ${selectedPickup.partnerName}` : 'Driver assignment in progress'}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 text-xs">
                      <div className="flex flex-col items-center">
                        <span className={`w-5 h-5 rounded-full font-mono font-bold text-[9px] flex items-center justify-center ${['Collected', 'Completed'].includes(selectedPickup.status) ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                          {['Collected', 'Completed'].includes(selectedPickup.status) ? '✓' : '3'}
                        </span>
                        <span className="w-0.5 h-6 bg-slate-200"></span>
                      </div>
                      <div>
                        <p className={`font-bold ${['Collected', 'Completed'].includes(selectedPickup.status) ? 'text-slate-800' : 'text-slate-400'}`}>Physical weighing audit</p>
                        <p className="text-[9px] text-slate-400">
                          {['Collected', 'Completed'].includes(selectedPickup.status) ? `Verified total weight: ${selectedPickup.estimatedWeight} Kg` : 'Awaiting physical counter verification'}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 text-xs">
                      <div className="flex flex-col items-center">
                        <span className={`w-5 h-5 rounded-full font-mono font-bold text-[9px] flex items-center justify-center ${selectedPickup.status === 'Completed' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                          {selectedPickup.status === 'Completed' ? '✓' : '4'}
                        </span>
                      </div>
                      <div>
                        <p className={`font-bold ${selectedPickup.status === 'Completed' ? 'text-slate-800' : 'text-slate-400'}`}>Financial clearance & Dividend transfer</p>
                        <p className="text-[9px] text-slate-400">
                          {selectedPickup.status === 'Completed' ? `Cleared directly to INR Ledger. Invoice ID: ${selectedPickup.id}` : 'Awaiting collection settlement'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* INVOICE VIEW PREVIEW (ITEM 11) */}
                {selectedPickup.status === 'Completed' && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 font-sans mt-2">
                    <div className="flex justify-between items-start border-b border-slate-200 pb-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">EcoLoop India Private Limited</h4>
                        <p className="text-[9px] text-slate-400">PAN: AAACE4390B · GSTIN: 27AAACE4390B1Z2</p>
                        <p className="text-[9px] text-slate-400">Mumbai Circular Hub, IN</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md uppercase font-mono">Tax Invoice</span>
                        <p className="text-[9px] font-mono text-slate-500 mt-1">INV-{selectedPickup.id}</p>
                        <p className="text-[9px] text-slate-400 font-mono">Date: {selectedPickup.preferredDate}</p>
                      </div>
                    </div>

                    <div className="text-[10px]">
                      <p className="font-bold text-slate-700">Billing Information:</p>
                      <p className="text-slate-600">{customer.name}</p>
                      <p className="text-slate-500 text-[9px]">{selectedPickup.pickupAddress}</p>
                    </div>

                    <table className="w-full text-left text-[10px] border-collapse mt-1">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-semibold font-mono uppercase tracking-wider">
                          <th className="py-1">Material Item</th>
                          <th className="py-1 text-center">Unit Weight</th>
                          <th className="py-1 text-right">Rate/Kg</th>
                          <th className="py-1 text-right">Net yield</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-100">
                          <td className="py-1.5 font-bold text-slate-700">{selectedPickup.category} ({selectedPickup.subcategory})</td>
                          <td className="py-1.5 text-center font-mono">{selectedPickup.estimatedWeight} Kg</td>
                          <td className="py-1.5 text-right font-mono">₹12.00</td>
                          <td className="py-1.5 text-right font-bold text-slate-800 font-mono">₹{selectedPickup.estimatedAmount.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td colSpan={3} className="py-1 text-right text-slate-400 text-[9px]">SGST (0%)</td>
                          <td className="py-1 text-right text-slate-400 font-mono text-[9px]">₹0.00</td>
                        </tr>
                        <tr>
                          <td colSpan={3} className="py-1 text-right text-slate-400 text-[9px]">CGST (0%)</td>
                          <td className="py-1 text-right text-slate-400 font-mono text-[9px]">₹0.00</td>
                        </tr>
                        <tr className="border-t border-slate-200 font-bold text-slate-800">
                          <td colSpan={3} className="py-2 text-right">Total Payout Settled</td>
                          <td className="py-2 text-right text-brand-600 font-mono">₹{selectedPickup.estimatedAmount.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-100 text-center text-[9px] text-slate-500">
                      We certify that the materials listed have been safely logged into EcoLoop green circular facilities. Thank you for recycling!
                    </div>
                  </div>
                )}

                {/* RATE & REVIEW SYSTEM (ITEM 5) */}
                {selectedPickup.status === 'Completed' && (
                  <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Partner Rating & Feedback</h3>
                    
                    {feedbacks.some(f => f.pickupId === selectedPickup.id) ? (
                      (() => {
                        const fb = feedbacks.find(f => f.pickupId === selectedPickup.id)!;
                        return (
                          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex gap-3 items-start">
                            <span className="text-xl">🌟</span>
                            <div>
                              <p className="text-xs font-bold text-slate-800">My Registered Feedback</p>
                              <div className="flex gap-1.5 my-1">
                                {Array.from({ length: 5 }).map((_, idx) => (
                                  <span key={idx} className={idx < fb.customerRating ? "text-amber-400 text-xs" : "text-slate-200 text-xs"}>★</span>
                                ))}
                              </div>
                              <p className="text-[10px] text-slate-500 italic">"{fb.customerComment}"</p>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <form onSubmit={(e) => { setActiveRatingPickupId(selectedPickup.id); handleSubmitPickupReview(e); }} className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Select Rating:</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button 
                                key={star}
                                type="button" 
                                onClick={() => setRatingValue(star)}
                                className={`text-lg transition ${star <= ratingValue ? 'text-amber-400 hover:scale-110' : 'text-slate-200'}`}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <textarea 
                            rows={2}
                            placeholder="Add a comment about the driver's service, punctuality, or weighing audit..."
                            value={commentValue}
                            onChange={(e) => setCommentValue(e.target.value)}
                            required
                            className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-brand-500 focus:outline-none"
                          />
                        </div>
                        {ratingSuccess && (
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 p-2 rounded-lg text-center">Feedback recorded! Updating logs...</span>
                        )}
                        <button type="submit" className="bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-bold py-2 rounded-xl transition self-start px-4">
                          Submit Review
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {/* Cancel / Action items */}
                <div className="border-t border-slate-100 pt-4 flex gap-2 justify-end">
                  {['Pending', 'Assigned'].includes(selectedPickup.status) && (
                    <button 
                      onClick={() => { handleCancelPickup(selectedPickup.id); setSelectedPickup(null); }}
                      className="bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-700 text-xs font-bold px-4 py-2 rounded-xl transition"
                    >
                      Cancel Pickup Request
                    </button>
                  )}
                  <button 
                    onClick={() => setSelectedPickup(null)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition"
                  >
                    Close Details
                  </button>
                </div>

              </div>
            ) : (
              // MAIN LIST
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-display font-extrabold text-slate-900">Your Recycling Requests</h1>
                    <p className="text-xs text-slate-500">View real-time collections status, driver details, and receipts.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* DOWNLOAD EXPORT REPORT TRIGGER */}
                    <button 
                      onClick={handleExportPickupsCSV}
                      className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-400" /> Export Log (CSV)
                    </button>

                    <button 
                      onClick={() => setActiveTab('create-pickup')}
                      className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition shadow-md shadow-brand-100"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Request Pickup
                    </button>
                  </div>
                </div>

                {/* ADVANCED MULTI-FIELD FILTER GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
                  {/* Text Search ID */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Search keyword</label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="ID, Category, Landmark..."
                        value={pickupSearch}
                        onChange={(e) => setPickupSearch(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-8 pr-3 text-xs w-full focus:outline-none focus:ring-1 focus:ring-brand-500" 
                      />
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Collection status</label>
                    <select 
                      value={pickupFilter}
                      onChange={(e) => setPickupFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2.5 text-xs focus:outline-none text-slate-700 font-medium"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Pending">Pending Assignment</option>
                      <option value="Assigned">Assigned Rider</option>
                      <option value="In-Transit">Rider In-Transit</option>
                      <option value="Arrived">Rider Arrived</option>
                      <option value="Collected">Weight Audited</option>
                      <option value="Completed">Settle & Completed</option>
                      <option value="Cancelled">Cancelled Requests</option>
                    </select>
                  </div>

                  {/* Material Category Filter */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Waste material</label>
                    <select 
                      value={pickupCategoryFilter}
                      onChange={(e) => setPickupCategoryFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2.5 text-xs focus:outline-none text-slate-700 font-medium"
                    >
                      <option value="All">All Materials</option>
                      <option value="Paper">Paper</option>
                      <option value="Plastic">Plastic</option>
                      <option value="Metal">Metal</option>
                      <option value="E-Waste">E-Waste</option>
                      <option value="Glass">Glass</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>

                  {/* Sort Order */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Sort by date</label>
                    <select 
                      value={pickupSortOrder}
                      onChange={(e) => setPickupSortOrder(e.target.value as any)}
                      className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2.5 text-xs focus:outline-none text-slate-700 font-medium"
                    >
                      <option value="newest">Newest to Oldest</option>
                      <option value="oldest">Oldest to Newest</option>
                    </select>
                  </div>
                </div>

                {/* ITERATING LIST */}
                {(() => {
                  const filtered = pickups
                    .filter(p => {
                      if (!pickupSearch) return true;
                      const s = pickupSearch.toLowerCase();
                      return p.id.toLowerCase().includes(s) || 
                             p.category.toLowerCase().includes(s) || 
                             p.subcategory.toLowerCase().includes(s) || 
                             p.pickupAddress.toLowerCase().includes(s) ||
                             (p.landmark && p.landmark.toLowerCase().includes(s));
                    })
                    .filter(p => pickupFilter === 'All' ? true : p.status === pickupFilter)
                    .filter(p => pickupCategoryFilter === 'All' ? true : p.category === pickupCategoryFilter)
                    .sort((a, b) => {
                      const dA = new Date(a.preferredDate).getTime();
                      const dB = new Date(b.preferredDate).getTime();
                      return pickupSortOrder === 'newest' ? dB - dA : dA - dB;
                    });

                  if (filtered.length === 0) {
                    return (
                      <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center flex flex-col items-center justify-center gap-4 shadow-xs">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <Trash2 className="w-6 h-6 text-slate-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-800">No Pickup Requests Match</h3>
                          <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
                            Try broadening your keyword, selection status, or filter category. Alternatively, book a doorstep pickup for your dry waste today!
                          </p>
                        </div>
                        <button 
                          onClick={() => setActiveTab('create-pickup')}
                          className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
                        >
                          Book Doorstep Collection
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filtered.map((p) => (
                        <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs hover:border-slate-200 transition flex flex-col justify-between gap-3">
                          <div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-800 font-mono">REQ ID: {p.id}</span>
                                <span className={`inline-block text-[8px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                  p.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                                  p.status === 'Cancelled' ? 'bg-rose-50 text-rose-700' :
                                  p.status === 'Pending' ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'
                                }`}>{p.status}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono font-bold bg-slate-50 px-2 py-0.5 rounded-md">{p.preferredDate}</span>
                            </div>

                            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100/50 mt-3">
                              <div>
                                <p className="text-xs font-bold text-slate-800">{p.category}</p>
                                <p className="text-[10px] text-slate-500 truncate max-w-[180px]">{p.subcategory}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-bold text-slate-800 font-mono">{p.estimatedWeight} Kg</p>
                                <p className="text-[10px] text-brand-600 font-bold font-mono">₹{(p.finalAmount || p.estimatedAmount).toFixed(2)}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 justify-end mt-1">
                            {p.status === 'Completed' && (
                              <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50/50 px-2 py-1 rounded-md self-center mr-auto">✓ Paid out</span>
                            )}
                            <button 
                              onClick={() => setSelectedPickup(p)}
                              className="bg-slate-900 text-white text-[10px] font-bold px-3.5 py-1.5 rounded-lg hover:bg-slate-800 transition"
                            >
                              Manage & Track
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* WALLET VIEW */}
        {activeTab === 'wallet' && (
          <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-fade-in">
            <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-100 text-brand-700 rounded-2xl flex items-center justify-center text-xl font-bold"><Wallet className="w-6 h-6" /></div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Eco Dividend Ledger</span>
                  <h1 className="text-xl font-display font-extrabold text-slate-900 mt-0.5">My Wallet & Bank payouts</h1>
                </div>
              </div>

              <div className="text-left md:text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Withdrawable Earnings</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-3xl font-extrabold font-mono text-slate-900">₹{customer.walletBalance.toFixed(2)}</span>
                </div>
                {customer.walletBalance > 0 ? (
                  <button onClick={() => setWithdrawModalOpen(true)} className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-5 py-2 rounded-xl mt-3 transition shadow-md shadow-brand-100">
                    Withdraw to Bank account
                  </button>
                ) : (
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg inline-block mt-3">Balance Withdrawn</span>
                )}
              </div>
            </div>

            {/* BANK DETAILS EDITOR */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Linked Bank Account</h3>
                <form onSubmit={(e) => { e.preventDefault(); alert("Bank details updated successfully!"); }} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Bank Name</label>
                    <input type="text" value={bankDetails.bankName} onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Account Holder Name</label>
                    <input type="text" value={bankDetails.accountName} onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Account Number</label>
                      <input type="text" value={bankDetails.accountNumber} onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Routing Code</label>
                      <input type="text" value={bankDetails.routingNumber} onChange={(e) => setBankDetails({ ...bankDetails, routingNumber: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
                    </div>
                  </div>
                  <button type="submit" className="text-[10px] font-bold bg-slate-900 text-white py-2 rounded-lg mt-1">
                    Update Account Details
                  </button>
                </form>
              </div>

              {/* TRANSACTIONS LEDGER LIST */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Payout Logs Ledger</h3>
                <div className="flex flex-col gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="p-2.5 border border-slate-50 hover:border-slate-100 rounded-xl bg-slate-50/50 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        {tx.type === 'Credit' ? <ArrowUpRight className="w-4 h-4 text-emerald-500" /> : <ArrowDownLeft className="w-4 h-4 text-slate-400" />}
                        <div>
                          <p className="font-bold text-slate-800">{tx.description}</p>
                          <p className="text-[9px] text-slate-400 font-mono">{tx.date.slice(0, 16).replace('T', ' ')} · {tx.id}</p>
                        </div>
                      </div>
                      <span className={`font-mono font-extrabold ${tx.type === 'Credit' ? 'text-emerald-600' : 'text-slate-600'}`}>
                        {tx.type === 'Credit' ? '+' : '-'}{tx.amount > 0 ? '₹' + tx.amount.toFixed(2) : tx.points + ' Pts'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Withdraw Modal */}
            {withdrawModalOpen && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-sm w-full p-6 flex flex-col gap-4 animate-scale-up relative">
                  <button onClick={() => setWithdrawModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
                  <h3 className="font-display text-sm font-bold text-slate-900">Withdraw Eco Earnings</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">Your funds will be routed to your linked bank account <strong>({bankDetails.bankName})</strong> immediately.</p>

                  {withdrawalSuccess ? (
                    <div className="py-6 text-center flex flex-col items-center gap-2">
                      <Check className="w-8 h-8 text-emerald-600 bg-emerald-100 rounded-full p-1 mb-1" />
                      <h4 className="text-xs font-bold text-slate-800">Transfer Completed Successfully!</h4>
                    </div>
                  ) : (
                    <form onSubmit={handleWithdrawalSubmit} className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">Amount to Transfer</label>
                        <input 
                          type="number" 
                          required
                          max={customer.walletBalance}
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder={`Max ₹${customer.walletBalance.toFixed(2)}`}
                          className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-mono focus:outline-none" 
                        />
                      </div>
                      <button type="submit" className="w-full bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-md">
                        Initiate Instant Transfer
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* REWARDS STORE VIEW */}
        {activeTab === 'rewards' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="bg-gradient-to-r from-emerald-800 to-brand-900 text-white p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-xl">
              <div>
                <span className="text-[9px] font-mono tracking-widest text-brand-300 font-bold uppercase">Gamified Sustainability</span>
                <h1 className="text-xl sm:text-2xl font-display font-extrabold mt-1">The Eco Reward Store</h1>
                <p className="text-xs text-brand-100 mt-1">Collect points from DIY crafts and recycling, redeem them for sustainable commodities.</p>
              </div>

              <div className="bg-brand-800/80 p-3.5 rounded-xl border border-brand-700 text-center shadow-md">
                <span className="text-[9px] text-brand-200 font-bold uppercase tracking-wider font-mono">My Active Balance</span>
                <p className="text-xl sm:text-2xl font-mono font-black text-brand-300">{customer.rewardPoints} XP</p>
              </div>
            </div>

            {/* Dynamic Store List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {rewardStore.map((reward) => (
                <div key={reward.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs hover:border-slate-300 flex flex-col">
                  <img className="h-40 w-full object-cover" src={reward.image} alt={reward.name} />
                  <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                    <div>
                      <span className="text-[9px] font-bold text-brand-600 uppercase font-mono">{reward.category}</span>
                      <h4 className="text-xs font-bold text-slate-800 mt-1 leading-tight">{reward.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">{reward.description}</p>
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
                      <span className="font-mono text-xs font-bold text-slate-800">{reward.costPoints} XP</span>
                      <button 
                        onClick={() => handleRedeemReward(reward)}
                        className="bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition"
                      >
                        Redeem Item
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DIY PROJECTS VIEW */}
        {activeTab === 'diy-projects' && (
          <div className="max-w-3xl mx-auto flex flex-col gap-6 animate-fade-in">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
              <h1 className="text-lg font-display font-extrabold text-slate-900">Submit DIY Eco Craft</h1>
              <p className="text-xs text-slate-500 mt-0.5">Submit designs where you repurposed household waste into items. Earn up to 200 XP points upon administrative review.</p>

              {diySuccess ? (
                <div className="py-12 text-center flex flex-col items-center gap-3">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-800 font-display">DIY Craft Submitted!</h3>
                  <p className="text-xs text-slate-400">Our content auditors will review your craft before adding it to the community lobby.</p>
                </div>
              ) : (
                <form onSubmit={handleDIYSubmit} className="flex flex-col gap-4 mt-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Project Name</label>
                    <input type="text" required placeholder="e.g. Plastic Bottle Hanging Planters" value={newDIY.name} onChange={(e) => setNewDIY({ ...newDIY, name: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Description & Guide</label>
                    <textarea rows={3} placeholder="How did you build it? What waste was repurposed? Describe..." value={newDIY.description} onChange={(e) => setNewDIY({ ...newDIY, description: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"></textarea>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Materials list (comma separated)</label>
                      <input type="text" placeholder="Soda bottle, twine, paint" value={newDIY.materials} onChange={(e) => setNewDIY({ ...newDIY, materials: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Repurposing Benefit</label>
                      <input type="text" placeholder="Diverts plastic, adds greenery" value={newDIY.benefits} onChange={(e) => setNewDIY({ ...newDIY, benefits: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
                    </div>
                  </div>
                  
                  {/* Before / After Images url input mock */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Before Photo (URL)</label>
                      <input type="text" value={newDIY.beforeImage} onChange={(e) => setNewDIY({ ...newDIY, beforeImage: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">After Photo (URL)</label>
                      <input type="text" value={newDIY.afterImage} onChange={(e) => setNewDIY({ ...newDIY, afterImage: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono" />
                    </div>
                  </div>

                  <button type="submit" className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-md">
                    Submit DIY Project
                  </button>
                </form>
              )}
            </div>

            {/* MY PAST SUBMISSIONS */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">My Submitted Craft Challenges</h3>
              <div className="flex flex-col gap-3">
                {diyProjects.filter(p => p.customerId === customer.id).map((p) => (
                  <div key={p.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs gap-3">
                    <div className="flex items-center gap-3">
                      <img className="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-xs" src={p.afterImage} alt="craft" />
                      <div>
                        <h4 className="font-bold text-slate-800">{p.projectName}</h4>
                        <p className="text-[9px] text-slate-400 font-mono">Submitted: {p.createdAt.slice(0, 10)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        p.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>{p.status}</span>
                      {p.status === 'Approved' && <p className="text-[10px] text-brand-600 font-bold mt-1">+{p.rewardEarned} XP Earned</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* COMMUNITY DIY PROJECTS */}
        {activeTab === 'community' && (
          <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-fade-in">
            <div>
              <h1 className="text-xl font-display font-extrabold text-slate-900">Community Eco Showcase</h1>
              <p className="text-xs text-slate-500">Discover and discuss amazing home-recycling crafts designed by eco-heroes globally.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {diyProjects.map((proj) => (
                <div key={proj.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs flex flex-col">
                  {/* Before/After side-by-side splits */}
                  <div className="grid grid-cols-2 gap-0.5 bg-slate-200">
                    <div className="relative">
                      <img className="h-44 w-full object-cover" src={proj.beforeImage} alt="before" />
                      <span className="absolute bottom-2 left-2 bg-slate-900/80 text-white text-[8px] font-bold px-1.5 py-0.5 rounded font-mono uppercase">Before</span>
                    </div>
                    <div className="relative">
                      <img className="h-44 w-full object-cover" src={proj.afterImage} alt="after" />
                      <span className="absolute bottom-2 left-2 bg-brand-600/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded font-mono uppercase">After</span>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col gap-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-400 font-mono">CRAFT ID: {proj.id}</span>
                        <span className="text-[10px] text-slate-400">By <strong>{proj.customerName}</strong></span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800 mt-1 leading-tight">{proj.projectName}</h4>
                      <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">{proj.projectDescription}</p>
                    </div>

                    {/* Chip list of materials */}
                    <div className="flex flex-wrap gap-1">
                      {proj.materialsUsed.map((m, idx) => (
                        <span key={idx} className="bg-slate-100 text-slate-600 text-[8px] font-bold px-2 py-0.5 rounded-md font-mono">{m}</span>
                      ))}
                    </div>

                    {/* Like & comments counter */}
                    <div className="flex items-center gap-4 border-t border-b border-slate-50 py-2 mt-1">
                      <button 
                        onClick={() => handleLikeDIY(proj.id)}
                        className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-brand-600 font-bold transition"
                      >
                        <ThumbsUp className="w-3.5 h-3.5 text-slate-400" /> Like ({proj.likes})
                      </button>
                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        <MessageSquare className="w-3.5 h-3.5" /> Comments ({proj.comments.length})
                      </span>
                    </div>

                    {/* Comments list */}
                    <div className="flex flex-col gap-2 max-h-36 overflow-y-auto pr-1">
                      {proj.comments.map((com) => (
                        <div key={com.id} className="bg-slate-50 p-2 rounded-xl text-[10px] leading-relaxed border border-slate-100/30">
                          <p className="text-slate-800 font-semibold">{com.userName}</p>
                          <p className="text-slate-500 mt-0.5">{com.text}</p>
                        </div>
                      ))}
                    </div>

                    {/* Write comment */}
                    <div className="flex gap-1.5 mt-auto">
                      <input 
                        type="text" 
                        placeholder="Type an eco-friendly comment..."
                        value={newComment[proj.id] || ''}
                        onChange={(e) => setNewComment({ ...newComment, [proj.id]: e.target.value })}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg py-1 px-2.5 text-[10px] focus:outline-none" 
                      />
                      <button 
                        onClick={() => handleAddComment(proj.id)}
                        className="bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-bold px-3 py-1 rounded-lg transition"
                      >
                        Add
                      </button>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROFILE VIEW */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-100 p-6 flex flex-col gap-6 animate-fade-in shadow-xl">
            <div className="flex flex-col sm:flex-row items-center gap-5 border-b border-slate-100 pb-5">
              <img className="w-16 h-16 rounded-full object-cover border-2 border-brand-500 shadow-md" src={customer.profilePic} alt="profile" />
              <div className="text-center sm:text-left">
                <h2 className="text-base font-bold text-slate-800">{customer.name}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{customer.email} · ID: {customer.id}</p>
                <span className="inline-block bg-brand-50 text-brand-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-1.5">★ Gold Level Sustainability Hero</span>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); alert("Profile successfully updated in local state!"); }} className="flex flex-col gap-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Personal Contact Information</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Full Name</label>
                  <input type="text" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Phone Number</label>
                  <input type="text" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Email Address</label>
                <input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Street Address</label>
                <input type="text" value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">City</label>
                  <input type="text" value={customer.city} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">State</label>
                  <input type="text" value={customer.state} onChange={(e) => setCustomer({ ...customer, state: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Pincode</label>
                  <input type="text" value={customer.pincode} onChange={(e) => setCustomer({ ...customer, pincode: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
                </div>
              </div>

              <button type="submit" id="save-profile-btn" className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-sm text-center mt-2">
                Save Profile Changes
              </button>
            </form>
          </div>
        )}

        {/* SETTINGS & SAVED ADDRESSES MODULE */}
        {activeTab === 'settings' && (
          <div className="flex flex-col gap-6 animate-fade-in" id="settings-tab-view">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-display font-extrabold text-slate-900">Control Settings Panel</h1>
              <p className="text-xs text-slate-500">Configure notifications, manage doorstep collection addresses, and verify active logins.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Accounts, Security & Presets */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                
                {/* Personal Profile Info */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col gap-4" id="settings-personal-info">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono border-b pb-1">Personal Account Profile</h3>
                  <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100/60">
                    <img className="w-12 h-12 rounded-full object-cover border-2 border-brand-500 shadow-xs" src={customer.profilePic} alt="preset" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">{customer.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{customer.email}</p>
                      <span className="text-[8px] font-mono bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded font-bold uppercase mt-1 inline-block">ID: {customer.id}</span>
                    </div>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); alert("Profile successfully updated in local state!"); }} className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase font-mono">Full name</label>
                        <input type="text" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase font-mono">Mobile</label>
                        <input type="text" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
                      </div>
                    </div>
                    <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold py-2 rounded-lg transition self-start px-4">
                      Update Account Details
                    </button>
                  </form>
                </div>

                {/* Password Change Form */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col gap-4" id="settings-password-security">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono border-b pb-1">Credential Security</h3>
                  <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase font-mono">Old Password</label>
                        <input type="password" value={pwdState.old} onChange={(e) => setPwdState({ ...pwdState, old: e.target.value })} placeholder="••••••••" className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase font-mono">New Password</label>
                        <input type="password" value={pwdState.newPwd} onChange={(e) => setPwdState({ ...pwdState, newPwd: e.target.value })} placeholder="••••••••" className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase font-mono">Confirm New</label>
                        <input type="password" value={pwdState.confirm} onChange={(e) => setPwdState({ ...pwdState, confirm: e.target.value })} placeholder="••••••••" className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
                      </div>
                    </div>
                    {pwdSuccess && <p className="text-xs text-emerald-600 bg-emerald-50 py-1.5 px-3 rounded-lg font-bold">✓ Password updated successfully.</p>}
                    <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold py-2 rounded-lg transition self-start px-4">
                      Update Password
                    </button>
                  </form>
                </div>

                {/* Active Sessions & Logins */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col gap-4" id="settings-sessions">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono border-b pb-1">Active Device Sessions</h3>
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="text-emerald-500 font-bold font-mono">●</span>
                        <div>
                          <p className="font-bold text-slate-800">Chrome Browser on macOS</p>
                          <p className="text-[9px] text-slate-400 font-mono">IP: 103.88.22.14 · Mumbai, MH · Active Now</p>
                        </div>
                      </div>
                      <span className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 font-bold px-2 py-0.5 rounded-full font-mono">Current Session</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-slate-50/50 rounded-xl border border-slate-100 text-xs text-slate-400">
                      <div className="flex items-center gap-2.5">
                        <span className="text-slate-300 font-bold font-mono">●</span>
                        <div>
                          <p className="font-bold text-slate-500">EcoLoop Android Mobile App</p>
                          <p className="text-[9px] text-slate-400 font-mono">IP: 103.88.23.90 · Pune, MH · 4 hours ago</p>
                        </div>
                      </div>
                      <button onClick={() => alert("Revoking session...")} className="text-[9px] font-bold text-rose-600 hover:underline">Terminate</button>
                    </div>
                  </div>
                </div>

                {/* Saved addresses manager */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col gap-4" id="settings-saved-addresses">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono border-b pb-1">My Doorstep Locations</h3>
                  
                  {/* List of existing saved addresses */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {savedAddresses.map((adr) => (
                      <div key={adr.id} className={`p-3.5 rounded-xl border flex flex-col gap-2 relative ${adr.isDefault ? 'border-brand-300 bg-brand-50/20' : 'border-slate-100 bg-slate-50/50'}`}>
                        {adr.isDefault && (
                          <span className="absolute top-3 right-3 text-[8px] bg-brand-600 text-white font-bold uppercase tracking-wider px-2 py-0.5 rounded-full font-mono">Default</span>
                        )}
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="p-1 bg-slate-200 text-slate-600 rounded text-[9px] uppercase font-mono font-bold leading-none">{adr.label}</span>
                          </h4>
                          <p className="text-[10px] text-slate-500 leading-relaxed mt-1.5">{adr.address}, {adr.city}, {adr.state} - {adr.pincode}</p>
                        </div>

                        <div className="flex gap-2.5 items-center mt-2 pt-2 border-t border-slate-100/60 text-[10px]">
                          {!adr.isDefault && (
                            <button onClick={() => handleSetDefaultAddress(adr.id)} className="text-brand-700 font-bold hover:underline">Set Default</button>
                          )}
                          <button onClick={() => handleDeleteAddress(adr.id)} className="text-rose-600 hover:underline font-bold ml-auto">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add New Address Form */}
                  <form onSubmit={handleAddSavedAddress} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
                    <h4 className="text-xs font-bold text-slate-800 font-mono uppercase tracking-wider">Add Doorstep Collection Location</h4>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-1 flex flex-col gap-1">
                        <label className="text-[9px] font-mono text-slate-400 font-bold uppercase">Tag Label</label>
                        <select value={newAddressLabel} onChange={(e) => setNewAddressLabel(e.target.value)} className="bg-white border border-slate-200 rounded-lg p-2 text-xs">
                          <option value="Home">Home</option>
                          <option value="Office">Office</option>
                          <option value="Factory">Factory</option>
                          <option value="Apartment">Apartment</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="col-span-2 flex flex-col gap-1">
                        <label className="text-[9px] font-mono text-slate-400 font-bold uppercase">Street address & landmark</label>
                        <input type="text" required placeholder="e.g. Flat 302, Green Arcade, Lane 2" value={newAddressText} onChange={(e) => setNewAddressText(e.target.value)} className="bg-white border border-slate-200 rounded-lg p-2 text-xs" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-mono text-slate-400 font-bold uppercase">City</label>
                        <input type="text" required placeholder="Mumbai" value={newAddressCity} onChange={(e) => setNewAddressCity(e.target.value)} className="bg-white border border-slate-200 rounded-lg p-2 text-xs" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-mono text-slate-400 font-bold uppercase">State</label>
                        <input type="text" required placeholder="Maharashtra" value={newAddressState} onChange={(e) => setNewAddressState(e.target.value)} className="bg-white border border-slate-200 rounded-lg p-2 text-xs" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-mono text-slate-400 font-bold uppercase">Pincode</label>
                        <input type="text" required placeholder="400001" value={newAddressPincode} onChange={(e) => setNewAddressPincode(e.target.value)} className="bg-white border border-slate-200 rounded-lg p-2 text-xs" />
                      </div>
                    </div>

                    <button type="submit" className="bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-bold py-2 rounded-lg transition self-end px-4 mt-1">
                      Save Doorstep Address
                    </button>
                  </form>
                </div>

              </div>

              {/* Right Column: Preferences, Exports & Referrals */}
              <div className="flex flex-col gap-6">
                
                {/* Notification Preferences */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col gap-4" id="settings-notifications">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono border-b pb-1">System Notifications</h3>
                  <div className="flex flex-col gap-3 text-xs text-slate-700">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span>SMS & Whatsapp Alerts</span>
                      <input type="checkbox" defaultChecked className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4" />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span>Monthly Carbon Reports</span>
                      <input type="checkbox" defaultChecked className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4" />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span>Promotional Campaigns</span>
                      <input type="checkbox" className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4" />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span>Rider Distance Alerts</span>
                      <input type="checkbox" defaultChecked className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4" />
                    </label>
                  </div>
                </div>

                {/* Privacy & Download Center */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col gap-4" id="settings-privacy">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono border-b pb-1">Privacy & Personal Data</h3>
                  <p className="text-[10px] text-slate-400 leading-relaxed">Pursuant to India's DPDP Act, you can request and download a complete archive of your local recycling history and transactions log instantly.</p>
                  
                  <button 
                    onClick={handleDownloadPersonalData}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" /> Download My Recycled Logs (JSON)
                  </button>
                </div>

                {/* Referral Program */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col gap-4" id="settings-referrals">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono border-b pb-1">Circular Referrals</h3>
                  <div className="bg-gradient-to-br from-brand-50 to-emerald-50 border border-brand-100 rounded-xl p-3 text-center">
                    <span className="text-lg">🎁</span>
                    <h4 className="text-xs font-extrabold text-slate-800 mt-1">Invite friends, earn XP!</h4>
                    <p className="text-[9px] text-slate-500 leading-relaxed mt-0.5">When your invited friends complete their very first doorstep recycling, both of you earn <strong>+100 XP Points</strong>.</p>
                  </div>

                  <div className="flex gap-1.5">
                    <input 
                      type="text" 
                      readOnly 
                      value={`https://ecoloop.in/invite/${customer.id}`} 
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2 text-[9px] font-mono text-slate-500 select-all" 
                    />
                    <button 
                      onClick={() => alert("Copied referral URL to clipboard!")}
                      className="bg-brand-600 hover:bg-brand-700 text-white text-[9px] font-bold px-3 rounded-lg transition"
                    >
                      Copy
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* SUPPORT HELP CENTER / CUSTOMER HELPDESK */}
        {activeTab === 'support' && (
          <div className="flex flex-col gap-6 animate-fade-in" id="support-tab-view">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-display font-extrabold text-slate-900">Assistance Helpdesk</h1>
              <p className="text-xs text-slate-500">Search structural FAQ guides, raise a customer service ticket, or tracking existing responses.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Side: FAQ search & accordions */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                
                {/* Search FAQ */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col gap-4" id="support-faq">
                  <div className="flex items-center justify-between border-b pb-1.5">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Knowledge Base (FAQ)</h3>
                    <div className="relative w-40">
                      <Search className="absolute left-2.5 top-2 w-3 h-3 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search answers..." 
                        value={faqSearch}
                        onChange={(e) => setFaqSearch(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg py-1 pl-7 pr-2 text-[10px] w-full" 
                      />
                    </div>
                  </div>

                  {/* FAQ Accordions */}
                  <div className="flex flex-col gap-2.5">
                    {[
                      { 
                        q: 'How is the final weight of recyclables verified?', 
                        a: 'The Eco Rider carries a digital certified weighing scale. All dry wastes are weighed in your presence, and physical metrics are audited on the spot before dividend settlement.' 
                      },
                      { 
                        q: 'When will my ledger payout show up in my bank/UPI?', 
                        a: 'All completed pickups trigger immediate UPI bank-ledgers clearance. Usually settlements reflect within 15 minutes of collection verification.' 
                      },
                      { 
                        q: 'What types of plastics do you accept?', 
                        a: 'We accept PET water bottles, high-density polyethylene container jugs, polypropylene consumer packaging, and multi-layered flexible plastics.' 
                      },
                      { 
                        q: 'What happens to materials after being collected?', 
                        a: 'Collected materials are dispatched to centralized municipal dry sorting hubs, bundled, and routed to verified circular recycling converters across India.' 
                      }
                    ]
                    .filter(item => faqSearch ? item.q.toLowerCase().includes(faqSearch.toLowerCase()) || item.a.toLowerCase().includes(faqSearch.toLowerCase()) : true)
                    .map((item, idx) => (
                      <div key={idx} className="border border-slate-100 rounded-xl overflow-hidden transition-all bg-slate-50/40">
                        <button 
                          onClick={() => setSupportFaqExpanded(supportFaqExpanded === idx ? null : idx)}
                          className="w-full text-left p-3 flex justify-between items-center text-xs font-bold text-slate-800 hover:bg-slate-50 transition"
                        >
                          <span>{item.q}</span>
                          <span className="text-slate-400 font-mono text-[10px]">{supportFaqExpanded === idx ? '▲' : '▼'}</span>
                        </button>
                        {supportFaqExpanded === idx && (
                          <div className="p-3 bg-white text-[10px] text-slate-500 leading-relaxed border-t border-slate-100/60 animate-fade-in">
                            {item.a}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Support Case Logs */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col gap-4" id="support-tickets">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono border-b pb-1">My Support Tickets</h3>
                  
                  <div className="flex flex-col gap-3">
                    {supportTickets.map((ticket) => (
                      <div key={ticket.id} className="border border-slate-100 rounded-xl bg-slate-50/50 p-3.5 flex flex-col gap-3 hover:border-slate-300 transition">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800 font-mono">{ticket.id}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({ticket.category})</span>
                          </div>
                          <span className={`inline-block text-[8px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            ticket.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>{ticket.status}</span>
                        </div>

                        <div className="text-xs">
                          <p className="font-extrabold text-slate-800">{ticket.subject}</p>
                          <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{ticket.description}</p>
                        </div>

                        {/* Responses list */}
                        {ticket.responses.length > 0 && (
                          <div className="flex flex-col gap-2 bg-white border border-slate-100 rounded-xl p-2.5 max-h-40 overflow-y-auto">
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider font-mono">Message Logs:</p>
                            {ticket.responses.map((res, rIdx) => (
                              <div key={rIdx} className="text-[10px] leading-relaxed">
                                <p className="font-bold text-slate-700">{res.sender} <span className="text-[8px] text-slate-400 font-mono font-normal ml-1">{res.date.slice(0, 16).replace('T', ' ')}</span></p>
                                <p className="text-slate-500 mt-0.5">{res.text}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Post reply box */}
                        {ticket.status !== 'Resolved' && (
                          <div className="flex gap-1.5 mt-1 border-t border-slate-100/60 pt-2.5">
                            <input 
                              type="text" 
                              placeholder="Write a message to support..." 
                              value={openTicketId === ticket.id ? ticketReplyText : ''}
                              onFocus={() => setOpenTicketId(ticket.id)}
                              onChange={(e) => { setOpenTicketId(ticket.id); setTicketReplyText(e.target.value); }}
                              className="flex-1 bg-white border border-slate-200 rounded-lg py-1 px-2.5 text-[10px] focus:outline-none" 
                            />
                            <button 
                              onClick={() => handleSubmitTicketReply(ticket.id)}
                              className="bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-bold px-3 py-1 rounded-lg transition"
                            >
                              Reply
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Right Side: Raise support ticket */}
              <div className="flex flex-col gap-6">
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col gap-4" id="support-submit-ticket">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono border-b pb-1">Submit Helpdesk Ticket</h3>
                  
                  <form onSubmit={handleSubmitSupportTicket} className="flex flex-col gap-3 text-xs">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Support Category</label>
                      <select 
                        value={supportCategory} 
                        onChange={(e: any) => setSupportCategory(e.target.value)} 
                        className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                      >
                        <option value="Payment Issue">Payment Ledger Dispute</option>
                        <option value="Missed Pickup">Missed / Delayed Pickup</option>
                        <option value="Damaged Items">Weighing Discrepancy</option>
                        <option value="App Bug">App Crash / Glitch</option>
                        <option value="Other">General Circular Support</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Subject</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Brief summary of issue" 
                        value={supportSubject} 
                        onChange={(e) => setSupportSubject(e.target.value)} 
                        className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" 
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Details & Explanations</label>
                      <textarea 
                        rows={4} 
                        required 
                        placeholder="Provide tracking requests IDs, weights, and detailed explanations..." 
                        value={supportDescription} 
                        onChange={(e) => setSupportDescription(e.target.value)} 
                        className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" 
                      />
                    </div>

                    {supportSuccess && (
                      <p className="text-xs text-emerald-600 bg-emerald-50 py-1.5 px-3 rounded-lg font-bold text-center">✓ Ticket logged. Ticket ID sent to notifications!</p>
                    )}

                    <button type="submit" className="w-full bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-md">
                      Submit Support Ticket
                    </button>
                  </form>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* NOTIFICATIONS SLIDEOUT PANEL */}
      {notifPaneOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="bg-white max-w-sm w-full h-full p-6 flex flex-col gap-4 animate-slide-left relative shadow-2xl">
            <button onClick={() => setNotifPaneOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mt-2">
              <h3 className="font-display font-bold text-sm text-slate-900 flex items-center gap-1.5"><Bell className="w-4 h-4 text-brand-600" /> Notifications Log</h3>
              <button onClick={() => setNotifications(notifications.map(n => ({ ...n, read: true })))} className="text-[10px] text-brand-600 font-bold hover:underline">Mark all read</button>
            </div>

            <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
              {notifications.map((n) => (
                <div key={n.id} className={`p-3 rounded-xl border flex flex-col gap-1 text-xs relative ${
                  n.read ? 'bg-slate-50/50 border-slate-100 text-slate-500' : 'bg-brand-50/40 border-brand-100 text-slate-800'
                }`}>
                  {!n.read && <span className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-brand-500" />}
                  <h4 className="font-bold leading-tight pr-4">{n.title}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                  <span className="text-[8px] text-slate-400 mt-1 font-mono">{n.createdAt.slice(0, 16).replace('T', ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
