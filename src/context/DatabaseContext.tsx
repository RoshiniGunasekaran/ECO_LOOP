import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  CustomerItem, PartnerItem, IndustryItem, PickupRequest, DIYProject, 
  Transaction, RewardProduct, NotificationItem, SavedAddress, SupportTicket, 
  PickupFeedback, PricingRate, UserRole
} from '../types';
import { 
  INITIAL_CUSTOMERS, INITIAL_PARTNERS, INITIAL_INDUSTRIES, 
  INITIAL_PICKUP_REQUESTS, INITIAL_DIY_PROJECTS, INITIAL_TRANSACTIONS, 
  INITIAL_REWARD_PRODUCTS, INITIAL_NOTIFICATIONS, INITIAL_SAVED_ADDRESSES, 
  INITIAL_SUPPORT_TICKETS, INITIAL_FEEDBACKS, INITIAL_PRICING_RATES 
} from '../data';

interface DatabaseContextProps {
  isLoaded: boolean;
  customers: CustomerItem[];
  setCustomers: React.Dispatch<React.SetStateAction<CustomerItem[]>>;
  partners: PartnerItem[];
  setPartners: React.Dispatch<React.SetStateAction<PartnerItem[]>>;
  industries: IndustryItem[];
  setIndustries: React.Dispatch<React.SetStateAction<IndustryItem[]>>;
  pickups: PickupRequest[];
  setPickups: React.Dispatch<React.SetStateAction<PickupRequest[]>>;
  diyProjects: DIYProject[];
  setDiyProjects: React.Dispatch<React.SetStateAction<DIYProject[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  rewardStore: RewardProduct[];
  setRewardStore: React.Dispatch<React.SetStateAction<RewardProduct[]>>;
  notifications: NotificationItem[];
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  savedAddresses: SavedAddress[];
  setSavedAddresses: React.Dispatch<React.SetStateAction<SavedAddress[]>>;
  supportTickets: SupportTicket[];
  setSupportTickets: React.Dispatch<React.SetStateAction<SupportTicket[]>>;
  feedbacks: PickupFeedback[];
  setFeedbacks: React.Dispatch<React.SetStateAction<PickupFeedback[]>>;
  pricingRates: PricingRate[];
  setPricingRates: React.Dispatch<React.SetStateAction<PricingRate[]>>;
  
  // Active session details
  activeUserId: string | null;
  setActiveUserId: (id: string | null) => void;
  activeUserRole: UserRole;
  setActiveUserRole: (role: UserRole) => void;

  // Computed conveniences for currently selected profiles
  customer: CustomerItem;
  setCustomer: (cust: CustomerItem) => void;
  partner: PartnerItem;
  setPartner: (part: PartnerItem) => void;
  industry: IndustryItem;
  setIndustry: (ind: IndustryItem) => void;
  
  // Explicit trigger to sync database with backend
  triggerSync: () => void;
}

const DatabaseContext = createContext<DatabaseContextProps | undefined>(undefined);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);

  // Core synchronized database tables (initialized to static defaults first, avoiding layout layout flashes)
  const [customers, setCustomers] = useState<CustomerItem[]>(INITIAL_CUSTOMERS);
  const [partners, setPartners] = useState<PartnerItem[]>(INITIAL_PARTNERS);
  const [industries, setIndustries] = useState<IndustryItem[]>(INITIAL_INDUSTRIES);
  const [pickups, setPickups] = useState<PickupRequest[]>(INITIAL_PICKUP_REQUESTS);
  const [diyProjects, setDiyProjects] = useState<DIYProject[]>(INITIAL_DIY_PROJECTS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [rewardStore, setRewardStore] = useState<RewardProduct[]>(INITIAL_REWARD_PRODUCTS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>(INITIAL_SAVED_ADDRESSES);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(INITIAL_SUPPORT_TICKETS);
  const [feedbacks, setFeedbacks] = useState<PickupFeedback[]>(INITIAL_FEEDBACKS);
  const [pricingRates, setPricingRates] = useState<PricingRate[]>(INITIAL_PRICING_RATES);

  // Session state synced with localStorage
  const [activeUserId, setActiveUserIdState] = useState<string | null>(() => localStorage.getItem('ecoloop_userId'));
  const [activeUserRole, setActiveUserRoleState] = useState<UserRole>(() => (localStorage.getItem('ecoloop_userRole') as UserRole) || 'public');

  const setActiveUserId = (id: string | null) => {
    setActiveUserIdState(id);
    if (id) {
      localStorage.setItem('ecoloop_userId', id);
    } else {
      localStorage.removeItem('ecoloop_userId');
    }
  };

  const setActiveUserRole = (role: UserRole) => {
    setActiveUserRoleState(role);
    localStorage.setItem('ecoloop_userRole', role);
  };

  // Active session wrappers (conveniences for frontend modules)
  const customer = customers.find(c => c.id === activeUserId) || customers[0] || INITIAL_CUSTOMERS[0];
  const partner = partners.find(p => p.id === activeUserId) || partners[0] || INITIAL_PARTNERS[0];
  const industry = industries.find(i => i.id === activeUserId) || industries[0] || INITIAL_INDUSTRIES[0];

  const setCustomer = (cust: CustomerItem) => {
    setCustomers(prev => prev.map(c => c.id === cust.id ? cust : c));
  };

  const setPartner = (part: PartnerItem) => {
    setPartners(prev => prev.map(p => p.id === part.id ? part : p));
  };

  const setIndustry = (ind: IndustryItem) => {
    setIndustries(prev => prev.map(i => i.id === ind.id ? ind : i));
  };

  // Fetch initial database state on mount
  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) {
          const d = res.data;
          if (d.customers) setCustomers(d.customers);
          if (d.partners) setPartners(d.partners);
          if (d.industries) setIndustries(d.industries);
          if (d.pickups) setPickups(d.pickups);
          if (d.diyProjects) setDiyProjects(d.diyProjects);
          if (d.transactions) setTransactions(d.transactions);
          if (d.rewardStore) setRewardStore(d.rewardStore);
          if (d.notifications) setNotifications(d.notifications);
          if (d.savedAddresses) setSavedAddresses(d.savedAddresses);
          if (d.supportTickets) setSupportTickets(d.supportTickets);
          if (d.feedbacks) setFeedbacks(d.feedbacks);
          if (d.pricingRates) setPricingRates(d.pricingRates);
        }
        setIsLoaded(true);
      })
      .catch(err => {
        console.error('Failed to load database from Express API:', err);
        setIsLoaded(true); // set loaded to true so that users can still interact using in-memory fallback
      });
  }, []);

  // Save/Synchronize state with server whenever any database table is modified
  const triggerSync = () => {
    if (!isLoaded) return;

    const dbState = {
      customers,
      partners,
      industries,
      pickups,
      diyProjects,
      transactions,
      rewardStore,
      notifications,
      savedAddresses,
      supportTickets,
      feedbacks,
      pricingRates
    };

    fetch('/api/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dbState)
    })
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          console.log('[EcoLoop Sync] Real DB persisted to server-db.json on backend.');
        }
      })
      .catch(err => {
        console.error('[EcoLoop Sync] Error pushing updates to Express backend API:', err);
      });
  };

  // Automatically trigger sync when core states update
  useEffect(() => {
    triggerSync();
  }, [
    customers,
    partners,
    industries,
    pickups,
    diyProjects,
    transactions,
    rewardStore,
    notifications,
    savedAddresses,
    supportTickets,
    feedbacks,
    pricingRates,
    isLoaded
  ]);

  return (
    <DatabaseContext.Provider value={{
      isLoaded,
      customers,
      setCustomers,
      partners,
      setPartners,
      industries,
      setIndustries,
      pickups,
      setPickups,
      diyProjects,
      setDiyProjects,
      transactions,
      setTransactions,
      rewardStore,
      setRewardStore,
      notifications,
      setNotifications,
      savedAddresses,
      setSavedAddresses,
      supportTickets,
      setSupportTickets,
      feedbacks,
      setFeedbacks,
      pricingRates,
      setPricingRates,
      activeUserId,
      setActiveUserId,
      activeUserRole,
      setActiveUserRole,
      customer,
      setCustomer,
      partner,
      setPartner,
      industry,
      setIndustry,
      triggerSync
    }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}
