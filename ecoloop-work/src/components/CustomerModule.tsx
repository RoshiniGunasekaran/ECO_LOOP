import React, { useState, useEffect } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useCustomerDashboard } from '../hooks/useCustomerDashboard';
import { useCustomerPickups } from '../hooks/useCustomerPickups';
import type { RealPickup } from '../services/pickupService';
import type { RealDIYProject } from '../services/diyService';
import { useCustomerWallet } from '../hooks/useCustomerWallet';
import { useCustomerRewards } from '../hooks/useCustomerRewards';
import { useCustomerDIY } from '../hooks/useCustomerDIY';
import { useCommunity } from '../hooks/useCommunity';
import type { ReportReason } from '../services/communityService';
import { useCustomerProfile } from '../hooks/useCustomerProfile';
import { 
   CustomerItem, PickupRequest, Transaction, 
  NotificationItem, WasteCategory, PickupStatus, SupportTicket, SavedAddress, PickupFeedback
} from '../types';
import { 
  INITIAL_CUSTOMERS, INITIAL_PICKUP_REQUESTS, 
  INITIAL_TRANSACTIONS, INITIAL_REWARD_PRODUCTS, INITIAL_NOTIFICATIONS, 
  WASTE_SUBCATEGORIES, INITIAL_PRICING_RATES, INITIAL_SAVED_ADDRESSES, INITIAL_SUPPORT_TICKETS, INITIAL_FEEDBACKS
} from '../data';
import { 
  LayoutDashboard, PlusCircle, History, Wallet, Gift, Heart, User, Bell,
  Calendar, MapPin, Truck, CheckCircle2, ChevronRight, Search, Filter, 
  ArrowUpRight, ArrowDownLeft, Trash2, Map, ShieldAlert, Award, FileText, 
  MessageSquare, ThumbsUp, X, Upload, Check, AlertCircle, Sparkles, ArrowLeft,
  Settings, HelpCircle, Star, Copy, Shield, ChevronDown, Download, Share2, Globe, Send, RefreshCw, AlertTriangle,
  Trophy, Lock, Pencil, Bookmark, Flag
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
  
  // Active Shared States connected to Database Context
  const {
    customer, setCustomer,
    pickups, setPickups,
    transactions, setTransactions,
    rewardStore, setRewardStore,
    notifications, setNotifications,
    savedAddresses, setSavedAddresses,
    supportTickets, setSupportTickets,
    feedbacks, setFeedbacks
  } = useDatabase();

  // Module 5 (Customer Dashboard) — REAL Supabase-backed data.
  // Prefixed with "dash" so it never collides with the mock
  // `customer` / `pickups` / `transactions` / `notifications`
  // above, which other tabs still use until their own modules
  // (6, 7, 10...) wire them to real data too.
  const {
    loading: dashLoading,
    stats: dashStats,
    recentPickups: dashRecentPickups,
    recentTransactions: dashRecentTransactions,
    notifications: dashNotifications,
    unreadCount: dashUnreadCount,
    monthlyEarnings: dashMonthlyEarnings,
    wasteDistribution: dashWasteDistribution,
      pointsAccumulation: dashPointsAccumulation,
    markAllNotificationsRead: markAllDashNotificationsRead,
    refresh: refreshDashStats,
  } = useCustomerDashboard();

  // Module 6 (Pickup Management) — REAL Supabase-backed data.
  // Prefixed with "pk" so it never collides with the mock
  // `pickups` above. This hook now fully owns the "Create
  // Pickup" and "My Pickup Requests" tabs, plus the dashboard's
  // active-pickup tracking banner.
  const {
    loading: pkLoading,
    pickups: pkPickups,
    pricingRates: pkPricingRates,
    createPickup: pkCreatePickup,
    updatePickup: pkUpdatePickup,
    cancelPickup: pkCancelPickup,
    submitFeedback: pkSubmitFeedback,
  } = useCustomerPickups();

  // Module 7 (Wallet) — REAL Supabase-backed data. Prefixed with
  // "wl" so it never collides with the mock `transactions` above
  // (still used by Rewards/DIY until Module 8+ wire those too).
  const {
    loading: wlLoading,
    transactions: wlTransactions,
    payoutMethod: wlPayoutMethod,
    withdrawalRequests: wlWithdrawalRequests,
    savePayoutMethod: wlSavePayoutMethod,
    submitWithdrawalRequest: wlSubmitWithdrawalRequest,
  } = useCustomerWallet();

  // Module 8 (Rewards) — REAL Supabase-backed data. Prefixed with "rw" so
  // it never collides with the mock `rewardStore` / `transactions` above
  // (the mock `transactions` array is still used by DIY's "Reward" writes
  // until DIY approval gets its own real module).
  const {
    loading: rwLoading,
    rewardStore: rwRewardStore,
    redemptionHistory: rwRedemptionHistory,
    badges: rwBadges,
    leaderboard: rwLeaderboard,
    redeeming: rwRedeeming,
    redeemReward: rwRedeemReward,
  } = useCustomerRewards();

  // Module 9 (DIY Projects) — REAL Supabase-backed data. Prefixed with "dy"
  // so it never collides with the mock `diyProjects` array above, which
  // stays in place because the read-only "Community" showcase tab (browsing
  // OTHER customers' approved crafts, liking, commenting) still runs on it
  // until Module 10 (Community) wires that tab up for real.
  const {
    loading: dyLoading,
    myProjects: dyMyProjects,
    submitting: dySubmitting,
    createProject: dyCreateProject,
    updateProject: dyUpdateProject,
    deleteProject: dyDeleteProject,
  } = useCustomerDIY();

  // Module 10 (Community) — REAL Supabase-backed data. Prefixed with "cm"
  // so it never collides with anything else. This fully replaces the mock
  // `diyProjects` array (and its handleLikeDIY/handleAddComment handlers)
  // that the Community Explorer tab used to run on — the tab now only
  // shows OTHER customers' real Approved DIY projects, with real
  // like/save/comment/report actions.
  const {
    loading: cmLoading,
    feed: cmFeed,
    refresh: cmRefresh,
    toggleLike: cmToggleLike,
    toggleSave: cmToggleSave,
    commentsByProject: cmCommentsByProject,
    commentsLoading: cmCommentsLoading,
    loadComments: cmLoadComments,
    postingComment: cmPostingComment,
    addComment: cmAddComment,
    reporting: cmReporting,
    reportProject: cmReportProject,
  } = useCommunity();

  // Module 11 (Customer Profile) — REAL Supabase-backed data. Prefixed with
  // "pf" so it never collides with the mock `customer` above (still used
  // elsewhere — e.g. Support/DIY/Rewards mock filtering — until those
  // modules get their own real wiring). This fully replaces the mock
  // profile-editing forms and the mock `savedAddresses` array/handlers
  // (add/set-default/delete) that the Profile view and Settings tab used
  // to run on.
  const {
    loading: pfLoading,
    profile: pfProfile,
    addresses: pfAddresses,
    emailVerified: pfEmailVerified,
    saving: pfSaving,
    uploadingPicture: pfUploadingPicture,
    updateProfile: pfUpdateProfile,
    uploadProfilePicture: pfUploadProfilePicture,
    changePassword: pfChangePassword,
    addAddress: pfAddAddress,
    setDefaultAddress: pfSetDefaultAddress,
    deleteAddress: pfDeleteAddress,
  } = useCustomerProfile();

  const CHART_COLORS = ['#059669', '#3b82f6', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6', '#ef4444', '#94a3b8'];
  
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

  // Complaint Form State
  const [complaintModalOpen, setComplaintModalOpen] = useState(false);
  const [complaintPickupId, setComplaintPickupId] = useState('');
  const [complaintCategory, setComplaintCategory] = useState<'Payment Issue' | 'Missed Pickup' | 'Weighing Discrepancy' | 'Driver Behavior' | 'Other'>('Payment Issue');
  const [complaintSubject, setComplaintSubject] = useState('');
  const [complaintDescription, setComplaintDescription] = useState('');
  const [complaintSuccess, setComplaintSuccess] = useState(false);

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
  const [pwdError, setPwdError] = useState<string | null>(null);

  // Module 11 — Customer Profile edit form state (kept in sync with the
  // real `pfProfile` row loaded by useCustomerProfile).
  const [pfForm, setPfForm] = useState({ fullName: '', phone: '', address: '', city: '', state: '', pincode: '' });
  const [pfSuccess, setPfSuccess] = useState(false);
  const [pfError, setPfError] = useState<string | null>(null);
  const [pfPictureError, setPfPictureError] = useState<string | null>(null);

  useEffect(() => {
    if (pfProfile) {
      setPfForm({
        fullName: pfProfile.fullName ?? '',
        phone: pfProfile.phone ?? '',
        address: pfProfile.address ?? '',
        city: pfProfile.city ?? '',
        state: pfProfile.state ?? '',
        pincode: pfProfile.pincode ?? '',
      });
    }
  }, [pfProfile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setPfError(null);
    const result = await pfUpdateProfile(pfForm);
    if (!result.success) {
      setPfError(result.error ?? 'Could not save your changes. Please try again.');
      return;
    }
    setPfSuccess(true);
    setTimeout(() => setPfSuccess(false), 3000);
  };

  const handleProfilePictureSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPfPictureError(null);
    const result = await pfUploadProfilePicture(file);
    if (!result.success) {
      setPfPictureError(result.error ?? 'Upload failed. Please try a different image.');
    }
  };

  // Search & Filter state for Pickups
  const [pickupSearch, setPickupSearch] = useState('');
  const [pickupFilter, setPickupFilter] = useState<string>('All'); // Represents Status
  const [pickupCategoryFilter, setPickupCategoryFilter] = useState<string>('All'); // Represents Material Category
  const [pickupSortOrder, setPickupSortOrder] = useState<'newest' | 'oldest'>('newest'); // Represents order
  const [selectedPickup, setSelectedPickup] = useState<RealPickup | null>(null);

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
    imageFiles: [] as File[],
    imagePreviews: [] as string[]
  });
  const [createPickupSuccess, setCreatePickupSuccess] = useState(false);
  const [createPickupError, setCreatePickupError] = useState('');
  const [createPickupSubmitting, setCreatePickupSubmitting] = useState(false);

  // DIY Submission State — Module 9: real photo files instead of pasted
  // URLs, plus `editingDiyId` so the same form does both create and edit.
  const [newDIY, setNewDIY] = useState({
    name: '',
    description: '',
    materials: '',
    estimatedCost: 5,
    benefits: '',
    beforeImageFile: null as File | null,
    beforeImagePreview: '',
    afterImageFile: null as File | null,
    afterImagePreview: ''
  });
  const [diySuccess, setDiySuccess] = useState(false);
  const [diyError, setDiyError] = useState('');
  const [editingDiyId, setEditingDiyId] = useState<number | null>(null);

  // Wallet Actions State
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawalSuccess, setWithdrawalSuccess] = useState(false);
  const [withdrawalError, setWithdrawalError] = useState('');
  const [withdrawalSubmitting, setWithdrawalSubmitting] = useState(false);
  const [bankDetails, setBankDetails] = useState({
    accountName: '',
    accountNumber: '',
    bankName: '',
    routingNumber: '',
    upiId: ''
  });
  const [payoutSaving, setPayoutSaving] = useState(false);
  const [payoutSaveSuccess, setPayoutSaveSuccess] = useState(false);

  // Module 7 — once the real payout method loads, populate the editable form with it.
  useEffect(() => {
    if (wlPayoutMethod.updatedAt !== null || wlPayoutMethod.bankName || wlPayoutMethod.upiId) {
      setBankDetails({
        accountName: wlPayoutMethod.accountHolderName || customer.name,
        accountNumber: wlPayoutMethod.accountNumber,
        bankName: wlPayoutMethod.bankName,
        routingNumber: wlPayoutMethod.ifscCode,
        upiId: wlPayoutMethod.upiId
      });
    }
  }, [wlPayoutMethod]);

  // Notification Pane
  const [notifPaneOpen, setNotifPaneOpen] = useState(false);

  // Module 10 (Community) UI state — search/filter/sort run client-side
  // over the real `cmFeed` (tasks 10.2/10.3); comment drafting, which
  // project's comment thread is expanded, and the Report modal.
  const [newComment, setNewComment] = useState<Record<number, string>>({});
  const [communitySearch, setCommunitySearch] = useState('');
  const [communityMaterialFilter, setCommunityMaterialFilter] = useState<string>('All');
  const [communitySort, setCommunitySort] = useState<'newest' | 'most-liked' | 'most-discussed'>('newest');
  const [expandedCommentsId, setExpandedCommentsId] = useState<number | null>(null);
  const [copiedShareId, setCopiedShareId] = useState<number | null>(null);
  const [reportModalProjectId, setReportModalProjectId] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState<ReportReason>('Inappropriate Content');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);

  // Helper calculation for new pickup estimations — real rate from Module 6's
  // pricing_rates table, falling back to the mock table only if it hasn't loaded yet.
  const currentPriceRate =
    pkPricingRates[newPickup.category] ??
    INITIAL_PRICING_RATES.find(p => p.category === newPickup.category)?.pricePerKg ??
    0.10;
  const estimatedPayout = (newPickup.estimatedWeight * currentPriceRate).toFixed(2);

  // Form Handlers
  const handleCreatePickupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatePickupError('');
    setCreatePickupSubmitting(true);

    const newId = await pkCreatePickup(
      {
        category: newPickup.category,
        subcategory: newPickup.subcategory || (WASTE_SUBCATEGORIES[newPickup.category]?.[0] || 'Unsorted Goods'),
        condition: newPickup.condition,
        estimatedWeight: newPickup.estimatedWeight,
        quantity: newPickup.quantity,
        pickupAddress: newPickup.address,
        landmark: newPickup.landmark,
        preferredDate: newPickup.preferredDate,
        preferredTime: newPickup.preferredTime,
        notes: newPickup.notes,
        specialInstructions: newPickup.specialInstructions,
        estimatedAmount: parseFloat(estimatedPayout),
      },
      newPickup.imageFiles
    );

    setCreatePickupSubmitting(false);

    if (newId === null) {
      setCreatePickupError('Could not submit your pickup request. Please check your connection and try again.');
      return;
    }

    setCreatePickupSuccess(true);

    // Add Notification
    const newNotif: NotificationItem = {
      id: `NTF-${Math.random()}`,
      userId: customer.id,
      role: 'customer',
      title: 'Pickup Requested',
      message: `Your request REQ-${newId} for ${newPickup.category} has been submitted successfully.`,
      type: 'info',
      read: false,
      createdAt: new Date().toISOString()
    };
    setNotifications([newNotif, ...notifications]);

    // Reset Form
    setTimeout(() => {
      setCreatePickupSuccess(false);
      setNewPickup({ ...newPickup, imageFiles: [], imagePreviews: [], notes: '', specialInstructions: '', landmark: '' });
      setActiveTab('pickups');
    }, 2000);
  };

  const handleCancelPickup = async (id: number) => {
    if (!confirm("Are you sure you want to cancel this pickup request?")) return;

    const ok = await pkCancelPickup(id);
    if (ok) {
      const cancelNotif: NotificationItem = {
        id: `NTF-${Math.random()}`,
        userId: customer.id,
        role: 'customer',
        title: 'Pickup Cancelled',
        message: `Request REQ-${id} was successfully cancelled.`,
        type: 'warning',
        read: false,
        createdAt: new Date().toISOString()
      };
      setNotifications([cancelNotif, ...notifications]);
    } else {
      alert('Could not cancel this pickup. Please try again.');
    }
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawalError('');
    const amountNum = parseFloat(withdrawAmount);
    const realBalance = dashStats?.walletBalance ?? 0;

    if (isNaN(amountNum) || amountNum <= 0 || amountNum > realBalance) {
      setWithdrawalError("Invalid withdrawal amount or insufficient balance.");
      return;
    }
    if (!bankDetails.bankName && !bankDetails.upiId) {
      setWithdrawalError("Please add a bank account or UPI ID before requesting a withdrawal.");
      return;
    }

    setWithdrawalSubmitting(true);
    const result = await wlSubmitWithdrawalRequest(amountNum);
    setWithdrawalSubmitting(false);

    if (!result.success) {
      setWithdrawalError(result.error || "Could not submit your withdrawal request. Please try again.");
      return;
    }

    setWithdrawalSuccess(true);
    setTimeout(() => {
      setWithdrawalSuccess(false);
      setWithdrawModalOpen(false);
      setWithdrawAmount('');
    }, 2000);
  };

  const handleSavePayoutMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutSaving(true);
    const ok = await wlSavePayoutMethod({
      accountHolderName: bankDetails.accountName,
      bankName: bankDetails.bankName,
      accountNumber: bankDetails.accountNumber,
      ifscCode: bankDetails.routingNumber,
      upiId: bankDetails.upiId
    });
    setPayoutSaving(false);

    if (ok) {
      setPayoutSaveSuccess(true);
      setTimeout(() => setPayoutSaveSuccess(false), 2000);
    } else {
      alert("Could not save your payout details. Please try again.");
    }
  };

  const handleRedeemReward = async (reward: { id: number; name: string; costPoints: number }) => {
    const currentPoints = dashStats?.rewardPoints ?? 0;
    if (currentPoints < reward.costPoints) {
      alert(`Insufficient Eco Points! You need ${reward.costPoints - currentPoints} more points to redeem this.`);
      return;
    }

    if (!confirm(`Redeem "${reward.name}" for ${reward.costPoints} Eco Points?`)) return;

    const result = await rwRedeemReward(reward.id);
    if (result.success) {
      await refreshDashStats(); // dashStats.rewardPoints is the source of truth for the balance shown
      alert(`Success! Check your registered email for your digital voucher or redemption details.`);
    } else {
      alert(result.error ?? 'Could not redeem this reward. Please try again.');
    }
  };

  const resetDIYForm = () => {
    setNewDIY({
      name: '', description: '', materials: '', estimatedCost: 5, benefits: '',
      beforeImageFile: null, beforeImagePreview: '',
      afterImageFile: null, afterImagePreview: ''
    });
    setEditingDiyId(null);
  };

  const handleDIYImageChange = (slot: 'before' | 'after', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    if (slot === 'before') {
      setNewDIY({ ...newDIY, beforeImageFile: file, beforeImagePreview: previewUrl });
    } else {
      setNewDIY({ ...newDIY, afterImageFile: file, afterImagePreview: previewUrl });
    }
  };

  // Task 9.5 — Populate the form from an existing submission and switch it into edit mode.
  const handleEditDIYProject = (project: RealDIYProject) => {
    setEditingDiyId(project.id);
    setDiyError('');
    setDiySuccess(false);
    setNewDIY({
      name: project.projectName,
      description: project.projectDescription,
      materials: project.materialsUsed.join(', '),
      estimatedCost: project.estimatedCost,
      benefits: project.benefits ?? '',
      beforeImageFile: null,
      beforeImagePreview: project.beforeImage ?? '',
      afterImageFile: null,
      afterImagePreview: project.afterImage ?? ''
    });
  };

  const handleCancelEditDIY = () => resetDIYForm();

  // Task 9.6 — Delete a still-Pending submission (RLS enforces the Pending-only rule server-side too).
  const handleDeleteDIYProject = async (project: RealDIYProject) => {
    if (project.status !== 'Pending') {
      alert('This project has already been reviewed and can no longer be deleted.');
      return;
    }
    if (!confirm(`Delete "${project.projectName}"? This can't be undone.`)) return;

    const ok = await dyDeleteProject(project.id);
    if (!ok) alert('Could not delete this project. Please try again.');
    if (editingDiyId === project.id) resetDIYForm();
  };

  const handleDIYSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDiyError('');

    const materialsUsed = newDIY.materials.split(',').map(m => m.trim()).filter(Boolean);
    const payload = {
      projectName: newDIY.name,
      projectDescription: newDIY.description,
      materialsUsed,
      estimatedCost: newDIY.estimatedCost,
      benefits: newDIY.benefits,
    };

    let ok: boolean;
    if (editingDiyId !== null) {
      ok = await dyUpdateProject(editingDiyId, payload, newDIY.beforeImageFile, newDIY.afterImageFile);
      if (!ok) setDiyError('Could not save your changes. This project may have already been reviewed.');
    } else {
      const newId = await dyCreateProject(payload, newDIY.beforeImageFile, newDIY.afterImageFile);
      ok = newId !== null;
      if (!ok) setDiyError('Could not submit your DIY project. Please check your connection and try again.');
    }

    if (!ok) return;

    setDiySuccess(true);
    setTimeout(() => {
      setDiySuccess(false);
      resetDIYForm();
      setActiveTab('diy-projects');
    }, 2000);
  };

  // Module 10 (Community) — real handlers wired to useCommunity().
  const handleLikeDIY = (projectId: number) => {
    cmToggleLike(projectId);
  };

  const handleToggleCommentsFor = (projectId: number) => {
    const opening = expandedCommentsId !== projectId;
    setExpandedCommentsId(opening ? projectId : null);
    if (opening && !cmCommentsByProject[projectId]) {
      cmLoadComments(projectId);
    }
  };

  const handleAddComment = async (projectId: number) => {
    const text = newComment[projectId];
    if (!text || !text.trim()) return;
    const ok = await cmAddComment(projectId, text);
    if (ok) setNewComment({ ...newComment, [projectId]: '' });
  };

  const handleToggleSave = (projectId: number) => {
    cmToggleSave(projectId);
  };

  const handleShareProject = async (project: (typeof cmFeed)[number]) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?community_project=${project.id}`;
    const shareData = { title: project.projectName, text: `Check out "${project.projectName}" on EcoLoop's Community Showcase!`, url: shareUrl };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // user cancelled the native share sheet — fall through to clipboard copy
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShareId(project.id);
      setTimeout(() => setCopiedShareId(null), 2000);
    } catch {
      // clipboard blocked (e.g. insecure context) — silently no-op, nothing to recover from here
    }
  };

  const handleOpenReport = (projectId: number) => {
    setReportModalProjectId(projectId);
    setReportReason('Inappropriate Content');
    setReportDetails('');
    setReportSuccess(false);
  };

  const handleSubmitReport = async () => {
    if (reportModalProjectId === null) return;
    const ok = await cmReportProject(reportModalProjectId, reportReason, reportDetails);
    if (ok) {
      setReportSuccess(true);
      setTimeout(() => {
        setReportModalProjectId(null);
        setReportSuccess(false);
      }, 1500);
    }
  };

  // Tasks 10.2 (Search) + 10.3 (Filter) + sort — all run client-side over
  // the real feed already loaded by useCommunity(), same pattern as My
  // Pickup Requests' search/filter/sort in Module 6.
  const communityMaterials = Array.from(new Set(cmFeed.flatMap((p) => p.materialsUsed))).sort();

  const filteredCommunityFeed = cmFeed
    .filter((p) => {
      if (communityMaterialFilter !== 'All' && !p.materialsUsed.includes(communityMaterialFilter)) return false;
      if (!communitySearch.trim()) return true;
      const q = communitySearch.trim().toLowerCase();
      return (
        p.projectName.toLowerCase().includes(q) ||
        p.projectDescription.toLowerCase().includes(q) ||
        p.authorName.toLowerCase().includes(q) ||
        p.materialsUsed.some((m) => m.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (communitySort === 'most-liked') return b.likes - a.likes;
      if (communitySort === 'most-discussed') return b.commentCount - a.commentCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 5 - newPickup.imageFiles.length);
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPickup((prev) => ({
          ...prev,
          imageFiles: [...prev.imageFiles, file],
          imagePreviews: [...prev.imagePreviews, reader.result as string]
        }));
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemovePickupImage = (index: number) => {
    setNewPickup((prev) => ({
      ...prev,
      imageFiles: prev.imageFiles.filter((_, i) => i !== index),
      imagePreviews: prev.imagePreviews.filter((_, i) => i !== index)
    }));
  };

  // Startup-grade handlers
  const handleDownloadPersonalData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ 
      customer, 
      pickups: pickups.filter(p => p.customerId === customer.id), 
      transactions: transactions.filter(t => t.userId === customer.id), 
      savedAddresses: pfAddresses, 
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
    pkPickups.forEach(p => {
      csvContent += `REQ-${p.id},${p.category},${p.subcategory},${p.actualWeight || p.estimatedWeight},${p.preferredDate},${p.status},${(p.finalAmount || p.estimatedAmount).toFixed(2)}\n`;
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

  const handleSubmitComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintSubject.trim() || !complaintDescription.trim()) return;
    const newTicket: SupportTicket = {
      id: `TCK-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: customer.id,
      userName: customer.name,
      role: 'customer',
      subject: complaintSubject + (complaintPickupId ? ` (Pickup: ${complaintPickupId})` : ''),
      category: complaintCategory as any,
      description: complaintDescription,
      status: 'Open',
      createdAt: new Date().toISOString(),
      responses: []
    };
    setSupportTickets([newTicket, ...supportTickets]);
    
    // Add Notification
    const compNotif: NotificationItem = {
      id: `NTF-${Math.random()}`,
      userId: customer.id,
      role: 'customer',
      title: 'Complaint Registered',
      message: `Your complaint regarding "${complaintSubject}" has been registered. Support Ticket ID: ${newTicket.id}. Our supervisor will verify this shortly.`,
      type: 'warning',
      read: false,
      createdAt: new Date().toISOString()
    };
    setNotifications([compNotif, ...notifications]);

    setComplaintSubject('');
    setComplaintDescription('');
    setComplaintPickupId('');
    setComplaintSuccess(true);
    setTimeout(() => {
      setComplaintSuccess(false);
      setComplaintModalOpen(false);
    }, 2000);
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

  const handleSubmitPickupReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRatingPickupId) return;

    const ok = await pkSubmitFeedback(Number(activeRatingPickupId), ratingValue, commentValue);
    if (!ok) {
      alert('Could not submit your feedback. Please try again.');
      return;
    }
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

  const handleAddSavedAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddressText.trim() || !newAddressCity.trim() || !newAddressState.trim() || !newAddressPincode.trim()) {
      alert("Please complete all address fields.");
      return;
    }
    const ok = await pfAddAddress({
      label: newAddressLabel,
      address: newAddressText,
      city: newAddressCity,
      state: newAddressState,
      pincode: newAddressPincode,
    });
    if (!ok) {
      alert("Could not save that address. Please try again.");
      return;
    }
    setNewAddressText('');
    setNewAddressCity('');
    setNewAddressState('');
    setNewAddressPincode('');
  };

  const handleSetDefaultAddress = async (addressId: number) => {
    const ok = await pfSetDefaultAddress(addressId);
    if (!ok) alert("Could not update your default address. Please try again.");
  };

  const handleDeleteAddress = async (addressId: number) => {
    const ok = await pfDeleteAddress(addressId);
    if (!ok) alert("Could not delete that address. Please try again.");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    if (!pwdState.old || !pwdState.newPwd || !pwdState.confirm) {
      setPwdError("Please fill all password fields.");
      return;
    }
    if (pwdState.newPwd !== pwdState.confirm) {
      setPwdError("New password and confirm password do not match.");
      return;
    }
    const result = await pfChangePassword(pwdState.old, pwdState.newPwd);
    if (!result.success) {
      setPwdError(result.error ?? "Could not update your password. Please try again.");
      return;
    }
    setPwdSuccess(true);
    setPwdState({ old: '', newPwd: '', confirm: '' });
    setTimeout(() => setPwdSuccess(false), 3000);
  };


  const unreadNotifCount = dashUnreadCount;

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
          <img className="w-10 h-10 rounded-full object-cover border border-brand-700" src={pfProfile?.profilePicUrl || customer.profilePic} alt="profile" />
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-white truncate">{dashStats?.fullName ?? customer.name}</h4>
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

            {/* Quick Complaint Button */}
            <button
              id="header-complain-btn"
              onClick={() => {
                setComplaintPickupId('');
                setComplaintSubject('');
                setComplaintCategory('Payment Issue');
                setComplaintDescription('');
                setComplaintModalOpen(true);
              }}
              className="flex items-center gap-1 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-2xs shrink-0 animate-pulse"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              <span>Complain</span>
            </button>

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
                <img className="w-6 h-6 rounded-full object-cover" src={pfProfile?.profilePicUrl || customer.profilePic} alt="pic" />
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
                <p className="text-xs text-slate-500 mt-1">Hello, {dashStats?.fullName ?? '...'}! Track your recycling metrics, logs, and eco dividends.</p>
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
                  <p className="text-xl sm:text-2xl font-bold font-mono text-slate-900">₹{(dashStats?.walletBalance ?? 0).toFixed(2)}</p>
                  <button onClick={() => setActiveTab('wallet')} className="text-[10px] text-brand-600 font-bold hover:underline flex items-center gap-1 mt-1">Manage Payouts <ChevronRight className="w-3 h-3" /></button>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between h-28">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Carbon Points</span>
                <div className="mt-2">
                  <p className="text-xl sm:text-2xl font-bold font-mono text-brand-600">{dashStats?.rewardPoints ?? 0} XP</p>
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
                  <p className="text-xl sm:text-2xl font-bold font-mono text-slate-900">{dashStats?.pendingPickupsCount ?? 0}</p>
                  <button onClick={() => setActiveTab('pickups')} className="text-[10px] text-slate-500 font-bold hover:underline flex items-center gap-1 mt-1">Track Requests <ChevronRight className="w-3 h-3" /></button>
                </div>
              </div>
            </div>

            {/* ACTIVE PICKUPS MAP / TRACKING BANNER — Module 6: real data, only appears once a
                pickup has a real partner_id assigned (still done manually until Module 13 exists) */}
            {pkPickups.some(p => p.status === 'Assigned' || p.status === 'In-Transit' || p.status === 'Arrived') && (
              (() => {
                const activeP = pkPickups.find(p => p.status === 'Assigned' || p.status === 'In-Transit' || p.status === 'Arrived')!;
                return (
                  <div className="bg-indigo-900 text-white p-5 rounded-2xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 shadow-xl">
                    <div className="flex items-start gap-3.5">
                      <div className="p-3 rounded-xl bg-indigo-800 text-white animate-pulse"><Truck className="w-5 h-5" /></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-indigo-800 text-indigo-200 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase">Live Tracking Active</span>
                          <span className="text-[10px] text-indigo-300 font-mono font-bold">REQ: {activeP.id}</span>
                        </div>
                        <h3 className="text-sm font-bold mt-1">{activeP.partnerName ? `Driver ${activeP.partnerName} is on the way!` : 'A partner has been assigned to your pickup!'}</h3>
                        <p className="text-xs text-indigo-200 mt-0.5">Status: <strong className="text-white">{activeP.status}</strong></p>
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
                      data={dashMonthlyEarnings.map(d => ({ month: d.month, val: d.amount }))}
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
                  {dashWasteDistribution.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center text-center text-[10px] text-slate-400 px-4">
                      No pickups yet — this chart fills in once your first pickup is recorded.
                    </div>
                  ) : (
                    <>
                      <div className="w-1/2 h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={dashWasteDistribution.map(w => ({ name: w.category, value: w.percent }))}
                              cx="50%"
                              cy="50%"
                              innerRadius={25}
                              outerRadius={40}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {dashWasteDistribution.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
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
                        {dashWasteDistribution.map((w, index) => (
                          <div key={w.category} className="flex items-center gap-1.5 text-[9px] font-bold text-slate-700">
                            <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                            <span>{w.category} ({w.percent}%)</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
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
                      data={dashPointsAccumulation}
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
                  {dashRecentPickups.length === 0 && (
                    <p className="text-[10px] text-slate-400 text-center py-4">No pickups yet — create your first one above.</p>
                  )}
                  {dashRecentPickups.map((p) => (
                    <div key={p.id} className="p-3 border border-slate-100 rounded-xl hover:border-slate-200 flex items-center justify-between gap-3 bg-slate-50/50 transition">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">♻️</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800">{p.category}</span>
                            <span className="text-[9px] font-mono text-slate-400">(#{p.id})</span>
                          </div>
                          <p className="text-[10px] text-slate-500">{p.preferredDate} · {p.estimatedWeight} Kg</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="block font-mono text-xs font-bold text-slate-800">₹{(p.finalAmount ?? p.estimatedAmount).toFixed(2)}</span>
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
                    {dashRecentTransactions.length === 0 && (
                      <p className="text-[10px] text-slate-400 text-center py-4">No wallet activity yet.</p>
                    )}
                    {dashRecentTransactions.map((tx) => (
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

                {/* Upload Waste Photos — real uploads to the pickup-photos storage bucket (Module 6) */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Upload Waste Materials Photos (Optional, up to 5)</label>
                  <div className="border-2 border-dashed border-slate-200 hover:border-brand-500 rounded-xl p-4 text-center cursor-pointer flex flex-col items-center gap-1.5 bg-slate-50/50">
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-700">Click to upload photos for driver pre-audit</span>
                    <input type="file" accept="image/*" multiple onChange={handleImageFileChange} className="hidden" id="pickup-img-file" disabled={newPickup.imageFiles.length >= 5} />
                    <label htmlFor="pickup-img-file" className="text-[9px] text-slate-400 cursor-pointer">Support JPG, PNG up to 4MB each</label>
                    {newPickup.imagePreviews.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2 justify-center">
                        {newPickup.imagePreviews.map((preview, idx) => (
                          <div key={idx} className="relative">
                            <img className="w-24 h-16 object-cover rounded-lg border border-slate-200 shadow-xs" src={preview} alt={`upload preview ${idx + 1}`} />
                            <button type="button" onClick={() => handleRemovePickupImage(idx)} className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-0.5"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
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

                {createPickupError && (
                  <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-2.5 text-center">{createPickupError}</p>
                )}

                <button type="submit" disabled={createPickupSubmitting} className="bg-brand-600 hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold py-3 rounded-xl transition shadow-lg shadow-brand-100 text-center">
                  {createPickupSubmitting ? 'Submitting...' : 'Confirm and Book Pickup Request'}
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
                  <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">REQUEST ID: REQ-{selectedPickup.id}</span>
                </div>

                {/* Map Simulation for active partners */}
                {(selectedPickup.status === 'Assigned' || selectedPickup.status === 'In-Transit' || selectedPickup.status === 'Arrived') && (
                  <div className="bg-slate-900 rounded-xl overflow-hidden h-64 relative flex items-center justify-center border border-slate-800 shadow-inner">
                    <div className="absolute inset-0 bg-slate-950 opacity-90 p-4 font-mono text-[9px] text-emerald-400 overflow-hidden flex flex-col gap-1 select-none">
                      <p className="text-brand-400 font-bold uppercase">Map Simulation Engine active...</p>
                      <p>ROUTE: {selectedPickup.pickupAddress} --{">"} Industrial Hub</p>
                      <p>PARTNER: {selectedPickup.partnerName ?? 'Unassigned'} · contact: {selectedPickup.partnerPhone ?? 'N/A'}</p>
                      <p>
                        COORDINATES: {selectedPickup.partnerLocation
                          ? `lat: ${selectedPickup.partnerLocation.lat}, lng: ${selectedPickup.partnerLocation.lng}`
                          : 'not broadcast yet by the partner app'}
                      </p>
                      <p>Live GPS pushes from the partner app arrive once Module 13 is wired.</p>
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
                    
                    {selectedPickup.feedback ? (
                      (() => {
                        const fb = selectedPickup.feedback!;
                        return (
                          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex gap-3 items-start">
                            <span className="text-xl">🌟</span>
                            <div>
                              <p className="text-xs font-bold text-slate-800">My Registered Feedback</p>
                              <div className="flex gap-1.5 my-1">
                                {Array.from({ length: 5 }).map((_, idx) => (
                                   <span key={idx} className={idx < (fb.customerRating ?? 0) ? "text-amber-400 text-xs" : "text-slate-200 text-xs"}>★</span>                                ))}
                              </div>
                              <p className="text-[10px] text-slate-500 italic">"{fb.customerComment}"</p>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <form onSubmit={(e) => { setActiveRatingPickupId(String(selectedPickup.id)); handleSubmitPickupReview(e); }} className="flex flex-col gap-3">
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
                  const filtered = pkPickups
                    .filter(p => {
                      if (!pickupSearch) return true;
                      const s = pickupSearch.toLowerCase();
                      return String(p.id).includes(s) || 
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
                                <span className="text-xs font-bold text-slate-800 font-mono">REQ ID: REQ-{p.id}</span>
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
                              id={`complain-pickup-${p.id}`}
                              onClick={() => {
                                setComplaintPickupId(String(p.id));
                                setComplaintSubject(`Dispute regarding pickup REQ-${p.id}`);
                                setComplaintCategory('Payment Issue');
                                setComplaintDescription('');
                                setComplaintModalOpen(true);
                              }}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 text-[10px] font-bold px-3 py-1.5 rounded-lg transition"
                            >
                              Complain
                            </button>
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
                  <span className="text-3xl font-extrabold font-mono text-slate-900">₹{(dashStats?.walletBalance ?? 0).toFixed(2)}</span>
                </div>
                {(dashStats?.walletBalance ?? 0) > 0 ? (
                  <button onClick={() => setWithdrawModalOpen(true)} className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-5 py-2 rounded-xl mt-3 transition shadow-md shadow-brand-100">
                    Withdraw to Bank account
                  </button>
                ) : (
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg inline-block mt-3">Nothing to withdraw yet</span>
                )}
              </div>
            </div>

            {/* BANK / UPI DETAILS EDITOR */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Linked Bank Account & UPI</h3>
                <form onSubmit={handleSavePayoutMethod} className="flex flex-col gap-3">
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
                      <label className="text-[9px] font-bold text-slate-500 uppercase">IFSC / Routing Code</label>
                      <input type="text" value={bankDetails.routingNumber} onChange={(e) => setBankDetails({ ...bankDetails, routingNumber: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">UPI ID (Optional)</label>
                    <input type="text" placeholder="yourname@upi" value={bankDetails.upiId} onChange={(e) => setBankDetails({ ...bankDetails, upiId: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
                  </div>
                  <button type="submit" disabled={payoutSaving} className="text-[10px] font-bold bg-slate-900 text-white py-2 rounded-lg mt-1 disabled:opacity-60">
                    {payoutSaving ? 'Saving...' : payoutSaveSuccess ? 'Saved ✓' : 'Update Account Details'}
                  </button>
                </form>
              </div>

              {/* TRANSACTIONS LEDGER LIST */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Payout Logs Ledger</h3>
                <div className="flex flex-col gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {wlTransactions.length === 0 && (
                    <p className="text-[10px] text-slate-400 text-center py-6">No transactions yet — your ledger fills up once pickups are completed and settled.</p>
                  )}
                  {wlTransactions.map((tx) => (
                    <div key={tx.id} className="p-2.5 border border-slate-50 hover:border-slate-100 rounded-xl bg-slate-50/50 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        {tx.type === 'Credit' ? <ArrowUpRight className="w-4 h-4 text-emerald-500" /> : <ArrowDownLeft className="w-4 h-4 text-slate-400" />}
                        <div>
                          <p className="font-bold text-slate-800">{tx.description ?? tx.type}</p>
                          <p className="text-[9px] text-slate-400 font-mono">{tx.date.slice(0, 16).replace('T', ' ')} · TXN-{tx.id}</p>
                        </div>
                      </div>
                      <span className={`font-mono font-extrabold ${tx.type === 'Credit' ? 'text-emerald-600' : 'text-slate-600'}`}>
                        {tx.type === 'Credit' ? '+' : '-'}{tx.amount > 0 ? '₹' + tx.amount.toFixed(2) : (tx.points ?? 0) + ' Pts'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* WITHDRAWAL REQUEST HISTORY */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Withdrawal Request History</h3>
              {wlWithdrawalRequests.length === 0 ? (
                <p className="text-[10px] text-slate-400 text-center py-4">No withdrawal requests yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {wlWithdrawalRequests.map((w) => (
                    <div key={w.id} className="p-2.5 border border-slate-50 rounded-xl bg-slate-50/50 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800 font-mono">₹{w.amount.toFixed(2)}</p>
                        <p className="text-[9px] text-slate-400 font-mono">{w.requestedAt.slice(0, 16).replace('T', ' ')}</p>
                      </div>
                      <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded-full ${
                        w.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                        w.status === 'Rejected' ? 'bg-rose-100 text-rose-700' :
                        w.status === 'Approved' ? 'bg-indigo-100 text-indigo-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>{w.status}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[9px] text-slate-400 leading-relaxed">Withdrawal requests are queued for admin review — this app doesn't move real money yet, so every new request starts as <strong>Pending</strong>.</p>
            </div>

            {/* Withdraw Modal */}
            {withdrawModalOpen && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-sm w-full p-6 flex flex-col gap-4 animate-scale-up relative">
                  <button onClick={() => { setWithdrawModalOpen(false); setWithdrawalError(''); }} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
                  <h3 className="font-display text-sm font-bold text-slate-900">Request a Withdrawal</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">Your request will be routed to <strong>{bankDetails.bankName || bankDetails.upiId || 'your linked payout method'}</strong> for admin review.</p>

                  {withdrawalSuccess ? (
                    <div className="py-6 text-center flex flex-col items-center gap-2">
                      <Check className="w-8 h-8 text-emerald-600 bg-emerald-100 rounded-full p-1 mb-1" />
                      <h4 className="text-xs font-bold text-slate-800">Withdrawal Request Submitted!</h4>
                    </div>
                  ) : (
                    <form onSubmit={handleWithdrawalSubmit} className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">Amount to Withdraw</label>
                        <input 
                          type="number" 
                          required
                          max={dashStats?.walletBalance ?? 0}
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder={`Max ₹${(dashStats?.walletBalance ?? 0).toFixed(2)}`}
                          className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-mono focus:outline-none" 
                        />
                      </div>
                      {withdrawalError && (
                        <p className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-2 text-center">{withdrawalError}</p>
                      )}
                      <button type="submit" disabled={withdrawalSubmitting} className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs font-bold py-2.5 rounded-xl shadow-md">
                        {withdrawalSubmitting ? 'Submitting...' : 'Submit Withdrawal Request'}
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
        <p className="text-xl sm:text-2xl font-mono font-black text-brand-300">{dashStats?.rewardPoints ?? 0} XP</p>
      </div>
    </div>

    {/* Dynamic Store List — real reward_products rows (Task 8.4) */}
    {rwLoading ? (
      <div className="text-center text-xs text-slate-400 py-10">Loading reward store...</div>
    ) : rwRewardStore.length === 0 ? (
      <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-xs text-slate-400">
        No rewards are available in the store right now. Check back soon.
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {rwRewardStore.map((reward) => (
          <div key={reward.id} className={`bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs hover:border-slate-300 flex flex-col ${!reward.available ? 'opacity-50' : ''}`}>
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
                  disabled={!reward.available || rwRedeeming === reward.id}
                  className="bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition"
                >
                  {rwRedeeming === reward.id ? 'Redeeming...' : !reward.available ? 'Unavailable' : 'Redeem Item'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}

    {/* My Badges — Task 8.2, real achievements computed from real stats */}
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
      <h3 className="text-sm font-display font-extrabold text-slate-900 flex items-center gap-2">
        <Award className="w-4 h-4 text-brand-600" /> My Badges
      </h3>
      {rwLoading ? (
        <p className="text-xs text-slate-400 mt-3">Loading badges...</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
          {rwBadges.map((badge) => (
            <div
              key={badge.id}
              className={`rounded-xl border p-3 flex flex-col items-center text-center gap-1.5 ${
                badge.earned ? 'border-brand-200 bg-brand-50' : 'border-slate-100 bg-slate-50 opacity-60'
              }`}
            >
              {badge.earned ? (
                <Award className="w-6 h-6 text-brand-600" />
              ) : (
                <Lock className="w-6 h-6 text-slate-400" />
              )}
              <span className="text-[10px] font-bold text-slate-800 leading-tight">{badge.name}</span>
              <span className="text-[9px] text-slate-400 leading-tight">{badge.description}</span>
              {badge.earned && badge.earnedAt && (
                <span className="text-[8px] font-mono text-brand-500">
                  Earned {new Date(badge.earnedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Leaderboard — Task 8.6, real top-10 by reward_points */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
        <h3 className="text-sm font-display font-extrabold text-slate-900 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" /> Community Leaderboard
        </h3>
        {rwLoading ? (
          <p className="text-xs text-slate-400 mt-3">Loading leaderboard...</p>
        ) : rwLeaderboard.length === 0 ? (
          <p className="text-xs text-slate-400 mt-3">No leaderboard data yet.</p>
        ) : (
          <div className="flex flex-col gap-1.5 mt-4">
            {rwLeaderboard.map((entry) => (
              <div
                key={entry.rank}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${
                  entry.isYou ? 'bg-brand-50 border border-brand-200 font-bold text-brand-700' : 'text-slate-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="font-mono w-5 text-slate-400">#{entry.rank}</span>
                  {entry.displayName} {entry.isYou && '(You)'}
                </span>
                <span className="font-mono font-bold">{entry.rewardPoints} XP</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reward History — Task 8.3, real redemption ledger */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
        <h3 className="text-sm font-display font-extrabold text-slate-900 flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500" /> Reward History
        </h3>
        {rwLoading ? (
          <p className="text-xs text-slate-400 mt-3">Loading history...</p>
        ) : rwRedemptionHistory.length === 0 ? (
          <p className="text-xs text-slate-400 mt-3">You haven't redeemed any rewards yet.</p>
        ) : (
          <div className="flex flex-col gap-2 mt-4 max-h-72 overflow-y-auto">
            {rwRedemptionHistory.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
                <div>
                  <p className="font-bold text-slate-700">{r.rewardName}</p>
                  <p className="text-[10px] text-slate-400">{new Date(r.redeemedAt).toLocaleString()}</p>
                </div>
                <span className="font-mono font-bold text-brand-600">-{r.costPoints} XP</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
)}
        {/* DIY PROJECTS VIEW */}
        {activeTab === 'diy-projects' && (
          <div className="max-w-3xl mx-auto flex flex-col gap-6 animate-fade-in">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-display font-extrabold text-slate-900">
                    {editingDiyId !== null ? 'Edit DIY Eco Craft' : 'Submit DIY Eco Craft'}
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {editingDiyId !== null
                      ? 'You can edit this submission until it has been reviewed.'
                      : 'Submit designs where you repurposed household waste into items. Earn Eco Points upon administrative review.'}
                  </p>
                </div>
                {editingDiyId !== null && (
                  <button onClick={handleCancelEditDIY} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1">
                    <X className="w-3 h-3" /> Cancel edit
                  </button>
                )}
              </div>

              {diySuccess ? (
                <div className="py-12 text-center flex flex-col items-center gap-3">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-800 font-display">
                    {editingDiyId !== null ? 'DIY Craft Updated!' : 'DIY Craft Submitted!'}
                  </h3>
                  <p className="text-xs text-slate-400">Our content auditors will review your craft before adding it to the community lobby.</p>
                </div>
              ) : (
                <form onSubmit={handleDIYSubmit} className="flex flex-col gap-4 mt-4">
                  {diyError && (
                    <div className="bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold rounded-lg p-2.5 flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5" /> {diyError}
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Project Name</label>
                    <input type="text" required placeholder="e.g. Plastic Bottle Hanging Planters" value={newDIY.name} onChange={(e) => setNewDIY({ ...newDIY, name: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Description & Guide</label>
                    <textarea rows={3} required placeholder="How did you build it? What waste was repurposed? Describe..." value={newDIY.description} onChange={(e) => setNewDIY({ ...newDIY, description: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"></textarea>
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

                  {/* Before / After Images — real file uploads (Task 9.2) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Before Photo</label>
                      {newDIY.beforeImagePreview && (
                        <img src={newDIY.beforeImagePreview} alt="before preview" className="h-20 w-full object-cover rounded-lg border border-slate-200 mb-1" />
                      )}
                      <label className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-50 border border-dashed border-slate-300 rounded-lg p-2 cursor-pointer hover:bg-slate-100">
                        <Upload className="w-3.5 h-3.5" /> {newDIY.beforeImageFile ? newDIY.beforeImageFile.name : 'Choose photo'}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleDIYImageChange('before', e)} />
                      </label>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">After Photo</label>
                      {newDIY.afterImagePreview && (
                        <img src={newDIY.afterImagePreview} alt="after preview" className="h-20 w-full object-cover rounded-lg border border-slate-200 mb-1" />
                      )}
                      <label className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-50 border border-dashed border-slate-300 rounded-lg p-2 cursor-pointer hover:bg-slate-100">
                        <Upload className="w-3.5 h-3.5" /> {newDIY.afterImageFile ? newDIY.afterImageFile.name : 'Choose photo'}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleDIYImageChange('after', e)} />
                      </label>
                    </div>
                  </div>

                  <button type="submit" disabled={dySubmitting} className="bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold py-2.5 rounded-xl transition shadow-md">
                    {dySubmitting ? 'Saving...' : editingDiyId !== null ? 'Save Changes' : 'Submit DIY Project'}
                  </button>
                </form>
              )}
            </div>

            {/* MY PAST SUBMISSIONS — Task 9.3 (Project history) + 9.4 (Approval status) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">My Submitted Craft Challenges</h3>

              {dyLoading ? (
                <p className="text-xs text-slate-400">Loading your submissions...</p>
              ) : dyMyProjects.length === 0 ? (
                <p className="text-xs text-slate-400">You haven't submitted any DIY crafts yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {dyMyProjects.map((p) => (
                    <div key={p.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {p.afterImage ? (
                          <img className="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-xs shrink-0" src={p.afterImage} alt="craft" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0">
                            <Sparkles className="w-4 h-4 text-slate-300" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-800 truncate">{p.projectName}</h4>
                          <p className="text-[9px] text-slate-400 font-mono">Submitted: {p.createdAt.slice(0, 10)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            p.status === 'Approved' ? 'bg-emerald-50 text-emerald-700'
                              : p.status === 'Rejected' ? 'bg-red-50 text-red-600'
                              : 'bg-amber-50 text-amber-700'
                          }`}>{p.status}</span>
                          {p.status === 'Approved' && <p className="text-[10px] text-brand-600 font-bold mt-1">+{p.rewardEarned} XP Earned</p>}
                        </div>
                        {p.status === 'Pending' && (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleEditDIYProject(p)} title="Edit" className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteDIYProject(p)} title="Delete" className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

            {/* Search + Filter + Sort (tasks 10.2 / 10.3) */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search crafts, materials, or eco-heroes..."
                  value={communitySearch}
                  onChange={(e) => setCommunitySearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>
              <select
                value={communityMaterialFilter}
                onChange={(e) => setCommunityMaterialFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-600"
              >
                <option value="All">All Materials</option>
                {communityMaterials.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select
                value={communitySort}
                onChange={(e) => setCommunitySort(e.target.value as typeof communitySort)}
                className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-600"
              >
                <option value="newest">Newest First</option>
                <option value="most-liked">Most Liked</option>
                <option value="most-discussed">Most Discussed</option>
              </select>
            </div>

            {cmLoading && (
              <div className="text-center py-16 text-xs text-slate-400 font-semibold">Loading the community showcase...</div>
            )}

            {!cmLoading && cmFeed.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">No approved crafts yet</p>
                <p className="text-[10px] text-slate-400 mt-1">Once an admin approves a DIY submission, it'll appear here for everyone to see.</p>
              </div>
            )}

            {!cmLoading && cmFeed.length > 0 && filteredCommunityFeed.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">No crafts match your search/filter</p>
                <button
                  onClick={() => { setCommunitySearch(''); setCommunityMaterialFilter('All'); }}
                  className="text-[10px] text-brand-600 font-bold mt-2 hover:underline"
                >
                  Clear search & filter
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredCommunityFeed.map((proj) => (
                <div key={proj.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs flex flex-col">
                  {/* Before/After side-by-side splits */}
                  <div className="grid grid-cols-2 gap-0.5 bg-slate-200">
                    <div className="relative">
                      <img className="h-44 w-full object-cover" src={proj.beforeImage ?? undefined} alt="before" />
                      <span className="absolute bottom-2 left-2 bg-slate-900/80 text-white text-[8px] font-bold px-1.5 py-0.5 rounded font-mono uppercase">Before</span>
                    </div>
                    <div className="relative">
                      <img className="h-44 w-full object-cover" src={proj.afterImage ?? undefined} alt="after" />
                      <span className="absolute bottom-2 left-2 bg-brand-600/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded font-mono uppercase">After</span>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col gap-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-400 font-mono">CRAFT ID: {proj.id}</span>
                        <span className="text-[10px] text-slate-400">By <strong>{proj.authorName}</strong></span>
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

                    {/* Like, Save, Share, Comment toggle, Report */}
                    <div className="flex items-center gap-3 border-t border-b border-slate-50 py-2 mt-1 flex-wrap">
                      <button
                        onClick={() => handleLikeDIY(proj.id)}
                        className={`flex items-center gap-1.5 text-[10px] font-bold transition ${proj.isLikedByMe ? 'text-brand-600' : 'text-slate-500 hover:text-brand-600'}`}
                      >
                        <ThumbsUp className={`w-3.5 h-3.5 ${proj.isLikedByMe ? 'text-brand-600 fill-brand-600' : 'text-slate-400'}`} /> Like ({proj.likes})
                      </button>
                      <button
                        onClick={() => handleToggleCommentsFor(proj.id)}
                        className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-brand-600 font-bold transition"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Comments ({proj.commentCount})
                      </button>
                      <button
                        onClick={() => handleToggleSave(proj.id)}
                        className={`flex items-center gap-1 text-[10px] font-bold transition ${proj.isSavedByMe ? 'text-amber-600' : 'text-slate-500 hover:text-amber-600'}`}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${proj.isSavedByMe ? 'text-amber-600 fill-amber-500' : 'text-slate-400'}`} /> {proj.isSavedByMe ? 'Saved' : 'Save'}
                      </button>
                      <button
                        onClick={() => handleShareProject(proj)}
                        className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-brand-600 font-bold transition"
                      >
                        <Share2 className="w-3.5 h-3.5" /> {copiedShareId === proj.id ? 'Link copied!' : 'Share'}
                      </button>
                      <button
                        onClick={() => handleOpenReport(proj.id)}
                        className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-rose-600 font-bold transition ml-auto"
                        title="Report this craft"
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Comments list — lazy-loaded on first expand */}
                    {expandedCommentsId === proj.id && (
                      <>
                        <div className="flex flex-col gap-2 max-h-36 overflow-y-auto pr-1">
                          {cmCommentsLoading[proj.id] && (
                            <p className="text-[10px] text-slate-400 text-center py-2">Loading comments...</p>
                          )}
                          {!cmCommentsLoading[proj.id] && (cmCommentsByProject[proj.id]?.length ?? 0) === 0 && (
                            <p className="text-[10px] text-slate-400 text-center py-2">No comments yet — be the first to say something nice!</p>
                          )}
                          {(cmCommentsByProject[proj.id] ?? []).map((com) => (
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
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(proj.id); }}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg py-1 px-2.5 text-[10px] focus:outline-none"
                          />
                          <button
                            onClick={() => handleAddComment(proj.id)}
                            disabled={cmPostingComment}
                            className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-[10px] font-bold px-3 py-1 rounded-lg transition"
                          >
                            Add
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Report Modal (task 10.8) */}
            {reportModalProjectId !== null && (
              <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4" onClick={() => setReportModalProjectId(null)}>
                <div className="bg-white rounded-2xl p-5 w-full max-w-sm flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5"><Flag className="w-4 h-4 text-rose-500" /> Report this craft</h3>
                    <button onClick={() => setReportModalProjectId(null)}><X className="w-4 h-4 text-slate-400" /></button>
                  </div>

                  {reportSuccess ? (
                    <p className="text-xs text-emerald-600 bg-emerald-50 py-2 px-3 rounded-lg font-bold">✓ Report submitted. Our team will review it shortly.</p>
                  ) : (
                    <>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Reason</label>
                        <select
                          value={reportReason}
                          onChange={(e) => setReportReason(e.target.value as ReportReason)}
                          className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                        >
                          <option>Inappropriate Content</option>
                          <option>Spam</option>
                          <option>Misleading Information</option>
                          <option>Copyright Issue</option>
                          <option>Other</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Additional details (optional)</label>
                        <textarea
                          value={reportDetails}
                          onChange={(e) => setReportDetails(e.target.value)}
                          rows={3}
                          className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs resize-none"
                          placeholder="Tell us more..."
                        />
                      </div>
                      <button
                        onClick={handleSubmitReport}
                        disabled={cmReporting}
                        className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-xl transition"
                      >
                        {cmReporting ? 'Submitting...' : 'Submit Report'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PROFILE VIEW */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-100 p-6 flex flex-col gap-6 animate-fade-in shadow-xl">
            <div className="flex flex-col sm:flex-row items-center gap-5 border-b border-slate-100 pb-5">
              <div className="relative shrink-0">
                <img className="w-16 h-16 rounded-full object-cover border-2 border-brand-500 shadow-md" src={pfProfile?.profilePicUrl || customer.profilePic} alt="profile" />
                <label htmlFor="profile-picture-upload" className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center cursor-pointer border-2 border-white shadow-sm">
                  <Pencil className="w-3 h-3" />
                </label>
                <input id="profile-picture-upload" type="file" accept="image/*" className="hidden" onChange={handleProfilePictureSelected} disabled={pfUploadingPicture} />
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-base font-bold text-slate-800">{pfProfile?.fullName ?? customer.name}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{pfProfile?.email ?? customer.email} · ID: {pfProfile?.displayCode ?? customer.id}</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mt-1.5">
                  <span className="inline-block bg-brand-50 text-brand-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full">★ Gold Level Sustainability Hero</span>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${pfEmailVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {pfEmailVerified ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                    {pfEmailVerified ? 'Email Verified' : 'Email Not Verified'}
                  </span>
                  <span className="inline-block bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full">{pfProfile?.status ?? 'Active'}</span>
                </div>
                {pfUploadingPicture && <p className="text-[10px] text-slate-400 mt-1">Uploading photo…</p>}
                {pfPictureError && <p className="text-[10px] text-rose-600 mt-1">{pfPictureError}</p>}
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Personal Contact Information</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Full Name</label>
                  <input type="text" value={pfForm.fullName} onChange={(e) => setPfForm({ ...pfForm, fullName: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Phone Number</label>
                  <input type="text" value={pfForm.phone} onChange={(e) => setPfForm({ ...pfForm, phone: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Email Address</label>
                <input type="email" value={pfProfile?.email ?? customer.email} readOnly disabled className="bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs text-slate-400 cursor-not-allowed" />
                <span className="text-[9px] text-slate-400">Email address changes aren't supported yet.</span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Street Address</label>
                <input type="text" value={pfForm.address} onChange={(e) => setPfForm({ ...pfForm, address: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">City</label>
                  <input type="text" value={pfForm.city} onChange={(e) => setPfForm({ ...pfForm, city: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">State</label>
                  <input type="text" value={pfForm.state} onChange={(e) => setPfForm({ ...pfForm, state: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Pincode</label>
                  <input type="text" value={pfForm.pincode} onChange={(e) => setPfForm({ ...pfForm, pincode: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
                </div>
              </div>

              {pfError && <p className="text-xs text-rose-600 bg-rose-50 py-1.5 px-3 rounded-lg font-bold">{pfError}</p>}
              {pfSuccess && <p className="text-xs text-emerald-600 bg-emerald-50 py-1.5 px-3 rounded-lg font-bold">✓ Profile updated successfully.</p>}

              <button type="submit" id="save-profile-btn" disabled={pfSaving} className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-sm text-center mt-2">
                {pfSaving ? 'Saving...' : 'Save Profile Changes'}
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
                    <div className="relative shrink-0">
                      <img className="w-12 h-12 rounded-full object-cover border-2 border-brand-500 shadow-xs" src={pfProfile?.profilePicUrl || customer.profilePic} alt="preset" />
                      <label htmlFor="profile-picture-upload-settings" className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center cursor-pointer border-2 border-white shadow-sm">
                        <Pencil className="w-2.5 h-2.5" />
                      </label>
                      <input id="profile-picture-upload-settings" type="file" accept="image/*" className="hidden" onChange={handleProfilePictureSelected} disabled={pfUploadingPicture} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{pfProfile?.fullName ?? customer.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{pfProfile?.email ?? customer.email}</p>
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        <span className="text-[8px] font-mono bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded font-bold uppercase inline-block">ID: {pfProfile?.displayCode ?? customer.id}</span>
                        <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded font-bold uppercase inline-flex items-center gap-0.5 ${pfEmailVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {pfEmailVerified ? <Check className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
                          {pfEmailVerified ? 'Verified' : 'Unverified'}
                        </span>
                      </div>
                      {pfPictureError && <p className="text-[9px] text-rose-600 mt-1">{pfPictureError}</p>}
                    </div>
                  </div>

                  <form onSubmit={handleSaveProfile} className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase font-mono">Full name</label>
                        <input type="text" value={pfForm.fullName} onChange={(e) => setPfForm({ ...pfForm, fullName: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase font-mono">Mobile</label>
                        <input type="text" value={pfForm.phone} onChange={(e) => setPfForm({ ...pfForm, phone: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
                      </div>
                    </div>
                    {pfError && <p className="text-[10px] text-rose-600 bg-rose-50 py-1.5 px-3 rounded-lg font-bold">{pfError}</p>}
                    {pfSuccess && <p className="text-[10px] text-emerald-600 bg-emerald-50 py-1.5 px-3 rounded-lg font-bold">✓ Account details updated.</p>}
                    <button type="submit" disabled={pfSaving} className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-[10px] font-bold py-2 rounded-lg transition self-start px-4">
                      {pfSaving ? 'Saving...' : 'Update Account Details'}
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
                    {pwdError && <p className="text-xs text-rose-600 bg-rose-50 py-1.5 px-3 rounded-lg font-bold">{pwdError}</p>}
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
                    {pfAddresses.map((adr) => (
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
              <button onClick={() => markAllDashNotificationsRead()} className="text-[10px] text-brand-600 font-bold hover:underline">Mark all read</button>
            </div>

            <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
              {dashNotifications.length === 0 && (
                <p className="text-[10px] text-slate-400 text-center py-8">You're all caught up — no notifications yet.</p>
              )}
              {dashNotifications.map((n) => (
                <div key={n.id} className={`p-3 rounded-xl border flex flex-col gap-1 text-xs relative ${
                  n.isRead ? 'bg-slate-50/50 border-slate-100 text-slate-500' : 'bg-brand-50/40 border-brand-100 text-slate-800'
                }`}>
                  {!n.isRead && <span className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-brand-500" />}
                  <h4 className="font-bold leading-tight pr-4">{n.title}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                  <span className="text-[8px] text-slate-400 mt-1 font-mono">{n.createdAt.slice(0, 16).replace('T', ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* COMPLAINT DIALOG MODAL */}
      {complaintModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" id="complaint-modal">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 flex flex-col gap-4 animate-scale-up relative border border-slate-100 shadow-2xl">
            <button onClick={() => setComplaintModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700" id="close-complaint-modal-btn">
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display text-sm font-extrabold text-slate-900">Submit a Dispute / Complaint</h3>
                <p className="text-[10px] text-slate-400">Raise grievance regarding pickups, weights, payments, or rider behavior</p>
              </div>
            </div>

            {complaintSuccess ? (
              <div className="py-8 text-center flex flex-col items-center gap-2">
                <Check className="w-10 h-10 text-emerald-600 bg-emerald-100 rounded-full p-2 mb-1 animate-pulse" />
                <h4 className="text-xs font-bold text-slate-800">Complaint Logged Successfully!</h4>
                <p className="text-[10px] text-slate-500 max-w-xs leading-relaxed">Your support ticket and notifications have been updated. We will audit this dispute immediately.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitComplaint} className="flex flex-col gap-3.5 text-xs">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Category */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Complaint Category</label>
                    <select 
                      value={complaintCategory} 
                      onChange={(e: any) => setComplaintCategory(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="Payment Issue">Payment Ledger Dispute</option>
                      <option value="Missed Pickup">Missed / Delayed Pickup</option>
                      <option value="Weighing Discrepancy">Weighing Scale Discrepancy</option>
                      <option value="Driver Behavior">Rider Behavior / Conduct</option>
                      <option value="Other">Other General Dispute</option>
                    </select>
                  </div>

                  {/* Optional Associated Request ID */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Related Pickup ID</label>
                    <input 
                      type="text" 
                      placeholder="e.g. REQ-3921 (Optional)" 
                      value={complaintPickupId}
                      onChange={(e) => setComplaintPickupId(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono" 
                    />
                  </div>
                </div>

                {/* Subject */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase">Subject</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Brief summary of the issue" 
                    value={complaintSubject}
                    onChange={(e) => setComplaintSubject(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" 
                  />
                </div>

                {/* Details */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase">Detailed Complaint & Evidence</label>
                  <textarea 
                    rows={4} 
                    required 
                    placeholder="Provide specific details about timing, weights, and what occurred so our audit team can trace the dispute..." 
                    value={complaintDescription}
                    onChange={(e) => setComplaintDescription(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" 
                  />
                </div>

                <button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-md shadow-rose-100" id="submit-complaint-btn">
                  File Official Complaint
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
