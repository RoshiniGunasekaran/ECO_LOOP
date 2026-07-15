export type UserRole = 'public' | 'customer' | 'partner' | 'industry' | 'admin';

export type WasteCategory =
  | 'Paper'
  | 'Plastic'
  | 'Glass'
  | 'Metal'
  | 'E-Waste'
  | 'Cardboard'
  | 'Textile'
  | 'Organic'
  | 'Batteries'
  | 'Electronic Devices'
  | 'Others';

export type PickupStatus =
  | 'Pending'
  | 'Assigned'
  | 'In-Transit'
  | 'Arrived'
  | 'Collected'
  | 'Delivered'
  | 'Completed'
  | 'Cancelled';

export interface CustomerItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  profilePic?: string;
  password?: string;
  walletBalance: number;
  rewardPoints: number;
  totalEarnings: number;
  status: 'Active' | 'Suspended';
}

export interface PartnerItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  vehicleType: string;
  vehicleNumber: string;
  drivingLicense: string;
  aadhaarNumber: string;
  profilePic?: string;
  password?: string;
  isOnline: boolean;
  rating: number;
  todayPickups: number;
  completedPickups: number;
  earnings: number;
  distanceTraveled: number; // in km
  status: 'Approved' | 'Pending Approval' | 'Suspended';
}

export interface IndustryItem {
  id: string;
  companyName: string;
  industryType: string;
  gstNumber: string;
  regNumber: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  logo?: string;
  password?: string;
  status: 'Approved' | 'Pending Approval' | 'Suspended';
  wasteReceivedKg: number;
  deliveriesCount: number;
}

export interface PickupRequest {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  category: WasteCategory;
  subcategory: string;
  condition: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  estimatedWeight: number; // in kg
  actualWeight?: number; // verified by partner
  quantity: number;
  pickupAddress: string;
  landmark?: string;
  preferredDate: string;
  preferredTime: string;
  images: string[];
  notes?: string;
  specialInstructions?: string;
  status: PickupStatus;
  partnerId?: string;
  partnerName?: string;
  partnerPhone?: string;
  partnerLocation?: { lat: number; lng: number };
  estimatedAmount: number;
  finalAmount?: number;
  paymentStatus: 'Unpaid' | 'Pending' | 'Paid' | 'Refunded';
  invoiceId?: string;
  createdAt: string;
  assignedIndustryId?: string;
  assignedIndustryName?: string;
}

export interface DIYProject {
  id: string;
  customerId: string;
  customerName: string;
  projectName: string;
  projectDescription: string;
  materialsUsed: string[];
  estimatedCost: number;
  benefits: string;
  beforeImage: string;
  afterImage: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  rewardEarned: number;
  createdAt: string;
  likes: number;
  comments: CommentItem[];
}

export interface CommentItem {
  id: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'Credit' | 'Withdrawal' | 'Refund' | 'Reward';
  amount: number;
  points?: number;
  description: string;
  status: 'Completed' | 'Pending' | 'Failed';
  date: string;
}

export interface RewardProduct {
  id: string;
  name: string;
  description: string;
  costPoints: number;
  image: string;
  category: 'Voucher' | 'Merchandise' | 'Tree Planting' | 'Carbon Offset';
  available: boolean;
}

export interface NotificationItem {
  id: string;
  userId: string; // 'all' for broadcasts or specific role
  role: UserRole | 'all';
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  read: boolean;
  createdAt: string;
}

export interface PricingRate {
  category: WasteCategory;
  pricePerKg: number; // USD or local equivalent
  lastUpdated: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  subject: string;
  category: 'Payment Issue' | 'Missed Pickup' | 'Damaged Items' | 'App Bug' | 'Other';
  description: string;
  status: 'Open' | 'In-Progress' | 'Resolved';
  createdAt: string;
  responses: { sender: string; text: string; date: string }[];
}

export interface SavedAddress {
  id: string;
  label: 'Home' | 'Office' | 'Other' | string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export interface PickupFeedback {
  pickupId: string;
  customerRating?: number;
  customerComment?: string;
  partnerRating?: number;
  partnerComment?: string;
  industryRating?: number;
  industryComment?: string;
}

