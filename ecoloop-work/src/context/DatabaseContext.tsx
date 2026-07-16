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

  // Active session wrappers (conveniences for frontend modules)
  const customer = customers[0] || INITIAL_CUSTOMERS[0];
  const partner = partners[0] || INITIAL_PARTNERS[0];
  const industry = industries[0] || INITIAL_INDUSTRIES[0];

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
    try {
      const cached = localStorage.getItem('ecoloop_db_state');
      if (cached) {
        const d = JSON.parse(cached);
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
    } catch (err) {
      console.error('Failed to load database from localStorage:', err);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save/Synchronize state with localStorage whenever any database table is modified
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

    try {
      localStorage.setItem('ecoloop_db_state', JSON.stringify(dbState));
      console.log('[EcoLoop Sync] Real DB persisted to localStorage.');
    } catch (err) {
      console.error('[EcoLoop Sync] Error saving database to localStorage:', err);
    }
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
