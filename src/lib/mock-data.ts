import type {
  Property,
  PropertyImage,
  PropertyAmenity,
} from "@/types/property";
import type {
  UserProfile,
  Notification,
  Message,
  Chat,
  Lead,
  Appointment,
  Review,
} from "@/types/user";

// ============================================================================
// PROPERTIES (EMPTY)
// ============================================================================

export const mockProperties: Property[] = [];

// ============================================================================
// MOCK PROPERTY IMAGES (Unsplash real estate photography)
// ============================================================================

const propertyImages: Record<string, PropertyImage[]> = {
  luxury1: [
    { id: "img-1a", url: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80", alt: "Modern luxury villa exterior with pool", isPrimary: true, order: 0 },
    { id: "img-1b", url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80", alt: "Spacious living room interior", isPrimary: false, order: 1 },
    { id: "img-1c", url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80", alt: "Modern kitchen with island", isPrimary: false, order: 2 },
    { id: "img-1d", url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80", alt: "Master bedroom suite", isPrimary: false, order: 3 },
  ],
  apartment1: [
    { id: "img-2a", url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80", alt: "Modern apartment living area", isPrimary: true, order: 0 },
    { id: "img-2b", url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80", alt: "Apartment interior with city view", isPrimary: false, order: 1 },
    { id: "img-2c", url: "https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800&q=80", alt: "Modern bathroom", isPrimary: false, order: 2 },
  ],
  apartment2: [
    { id: "img-3a", url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80", alt: "Spacious 3BHK living room", isPrimary: true, order: 0 },
    { id: "img-3b", url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80", alt: "Dining area", isPrimary: false, order: 1 },
    { id: "img-3c", url: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80", alt: "Bedroom with balcony view", isPrimary: false, order: 2 },
    { id: "img-3d", url: "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?w=800&q=80", alt: "Kitchen", isPrimary: false, order: 3 },
  ],
  villa1: [
    { id: "img-4a", url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80", alt: "Independent villa front view", isPrimary: true, order: 0 },
    { id: "img-4b", url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80", alt: "Villa garden area", isPrimary: false, order: 1 },
    { id: "img-4c", url: "https://images.unsplash.com/photo-1600566753086-00f18f6b0a56?w=800&q=80", alt: "Villa interior hall", isPrimary: false, order: 2 },
  ],
  plot1: [
    { id: "img-5a", url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80", alt: "Residential plot with greenery", isPrimary: true, order: 0 },
    { id: "img-5b", url: "https://images.unsplash.com/photo-1628624747186-a941c476b7ef?w=800&q=80", alt: "Plot aerial view", isPrimary: false, order: 1 },
    { id: "img-5c", url: "https://images.unsplash.com/photo-1595880500386-4b33823b29cd?w=800&q=80", alt: "Surrounding area", isPrimary: false, order: 2 },
  ],
  commercial1: [
    { id: "img-6a", url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80", alt: "Modern office space", isPrimary: true, order: 0 },
    { id: "img-6b", url: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80", alt: "Open plan office", isPrimary: false, order: 1 },
    { id: "img-6c", url: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&q=80", alt: "Conference room", isPrimary: false, order: 2 },
  ],
  pg1: [
    { id: "img-7a", url: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80", alt: "PG room interior", isPrimary: true, order: 0 },
    { id: "img-7b", url: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80", alt: "Furnished room", isPrimary: false, order: 1 },
    { id: "img-7c", url: "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80", alt: "Common area", isPrimary: false, order: 2 },
  ],
  farmhouse1: [
    { id: "img-8a", url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80", alt: "Luxury farmhouse exterior", isPrimary: true, order: 0 },
    { id: "img-8b", url: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80", alt: "Farmhouse living room", isPrimary: false, order: 1 },
    { id: "img-8c", url: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=80", alt: "Farmhouse grounds", isPrimary: false, order: 2 },
  ],
};

// ============================================================================
// MOCK AMENITIES
// ============================================================================

const standardAmenities: PropertyAmenity[] = [
  { id: "power-backup", name: "Power Backup", icon: "Zap", category: "utility" },
  { id: "lift", name: "Lift", icon: "ArrowUpDown", category: "basic" },
  { id: "gated-security", name: "Gated Security", icon: "Shield", category: "safety" },
  { id: "covered-parking", name: "Covered Parking", icon: "Car", category: "parking" },
  { id: "gym", name: "Gymnasium", icon: "Dumbbell", category: "lifestyle" },
  { id: "swimming-pool", name: "Swimming Pool", icon: "Waves", category: "lifestyle" },
  { id: "park", name: "Park / Garden", icon: "Trees", category: "lifestyle" },
  { id: "cctv", name: "CCTV Surveillance", icon: "Camera", category: "safety" },
  { id: "clubhouse", name: "Clubhouse", icon: "Building2", category: "lifestyle" },
  { id: "water-supply", name: "24x7 Water Supply", icon: "Droplets", category: "utility" },
  { id: "maintenance-staff", name: "Maintenance Staff", icon: "Wrench", category: "society" },
  { id: "vastu-compliant", name: "Vastu Compliant", icon: "Compass", category: "basic" },
];

const luxuryAmenities: PropertyAmenity[] = [
  ...standardAmenities,
  { id: "ev-charging", name: "EV Charging", icon: "PlugZap", category: "parking" },
  { id: "sports-facility", name: "Sports Facility", icon: "Trophy", category: "lifestyle" },
  { id: "jogging-track", name: "Jogging Track", icon: "Footprints", category: "lifestyle" },
  { id: "indoor-games", name: "Indoor Games", icon: "Gamepad2", category: "lifestyle" },
  { id: "solar-panels", name: "Solar Panels", icon: "Sun", category: "utility" },
  { id: "rainwater-harvesting", name: "Rainwater Harvesting", icon: "CloudRain", category: "utility" },
];

// ============================================================================
// MOCK USERS
// ============================================================================

export const mockUsers: UserProfile[] = [
  {
    id: "user-001",
    email: "admin@road.in",
    phone: "9000000001",
    firstName: "Aasrith",
    lastName: "Admin",
    fullName: "Aasrith Admin",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&q=80",
    role: "super-admin",
    isVerified: true,
    isEmailVerified: true,
    isPhoneVerified: true,
    isIdVerified: true,
    profileCompletionPercent: 100,
    bio: "Platform administrator",
    city: "Visakhapatnam",
    state: "Andhra Pradesh",
    joinedAt: "2025-01-01T00:00:00Z",
    lastActiveAt: "2026-07-10T10:00:00Z",
  },
  {
    id: "user-002",
    email: "vikram.reddy@gmail.com",
    phone: "9876543210",
    firstName: "Vikram",
    lastName: "Reddy",
    fullName: "Vikram Reddy",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80",
    role: "owner",
    isVerified: true,
    isEmailVerified: true,
    isPhoneVerified: true,
    isIdVerified: true,
    profileCompletionPercent: 100,
    bio: "Property investor and owner with 15+ years of experience in Vizag and Hyderabad real estate market.",
    company: "Reddy Properties",
    reraLicense: "AP/RERA/AGENT/2023/001234",
    city: "Visakhapatnam",
    state: "Andhra Pradesh",
    totalListings: 8,
    totalSoldRented: 23,
    rating: 4.8,
    reviewCount: 45,
    joinedAt: "2025-03-15T00:00:00Z",
    lastActiveAt: "2026-07-10T09:30:00Z",
  },
  {
    id: "user-003",
    email: "sunita.sharma@realty.com",
    phone: "9988776655",
    firstName: "Sunita",
    lastName: "Sharma",
    fullName: "Sunita Sharma",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80",
    role: "agent",
    isVerified: true,
    isEmailVerified: true,
    isPhoneVerified: true,
    isIdVerified: true,
    profileCompletionPercent: 95,
    bio: "Top-performing real estate agent specializing in luxury properties across South India. Certified by RERA.",
    company: "Sharma Realty",
    companyLogo: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=150&q=80",
    reraLicense: "KA/RERA/AGENT/2024/005678",
    city: "Bengaluru",
    state: "Karnataka",
    totalListings: 15,
    totalSoldRented: 67,
    rating: 4.9,
    reviewCount: 89,
    joinedAt: "2025-06-01T00:00:00Z",
    lastActiveAt: "2026-07-10T08:00:00Z",
  },
  {
    id: "user-004",
    email: "rahul.gupta@gmail.com",
    phone: "9900112233",
    firstName: "Rahul",
    lastName: "Gupta",
    fullName: "Rahul Gupta",
    role: "owner",
    isVerified: false,
    isEmailVerified: true,
    isPhoneVerified: true,
    isIdVerified: false,
    profileCompletionPercent: 60,
    bio: "First-time property lister.",
    city: "Mumbai",
    state: "Maharashtra",
    totalListings: 3,
    totalSoldRented: 0,
    joinedAt: "2026-04-01T00:00:00Z",
    lastActiveAt: "2026-07-09T15:00:00Z",
  },
  {
    id: "user-005",
    email: "info@srinivasdev.com",
    phone: "9112233445",
    firstName: "Srinivas",
    lastName: "Developers",
    fullName: "Srinivas Developers",
    avatar: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=150&q=80",
    role: "developer",
    isVerified: true,
    isEmailVerified: true,
    isPhoneVerified: true,
    isIdVerified: true,
    profileCompletionPercent: 100,
    bio: "Leading real estate developer in South India with 20+ years of experience and 50+ completed projects.",
    company: "Srinivas Developers Pvt. Ltd.",
    companyLogo: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=150&q=80",
    reraLicense: "AP/RERA/DEV/2020/000456",
    city: "Hyderabad",
    state: "Telangana",
    totalListings: 25,
    totalSoldRented: 150,
    rating: 4.7,
    reviewCount: 120,
    joinedAt: "2025-01-15T00:00:00Z",
    lastActiveAt: "2026-07-10T11:00:00Z",
  },
];

// ============================================================================
// MOCK NOTIFICATIONS
// ============================================================================

export const mockNotifications: Notification[] = [
  {
    id: "notif-001",
    userId: "user-002",
    type: "lead",
    title: "New Enquiry Received",
    message: "Priya Mehta is interested in your Rushikonda villa listing. Respond within 24 hours for best results.",
    link: "/dashboard/listings/leads",
    isRead: false,
    createdAt: "2026-07-10T08:30:00Z",
  },
  {
    id: "notif-002",
    userId: "user-002",
    type: "price-drop",
    title: "Price Drop Alert",
    message: "A 3BHK in MVP Colony you saved has dropped by ₹5,00,000. Check it out!",
    link: "/properties/3bhk-apartment-mvp-colony",
    isRead: false,
    createdAt: "2026-07-09T14:00:00Z",
  },
  {
    id: "notif-003",
    userId: "user-002",
    type: "verification",
    title: "Verification Approved",
    message: "Your identity verification has been approved. You now have a verified badge on your profile.",
    link: "/dashboard/settings/profile",
    isRead: true,
    createdAt: "2026-07-08T10:00:00Z",
  },
  {
    id: "notif-004",
    userId: "user-002",
    type: "system",
    title: "Listing Expiring Soon",
    message: "Your listing 'Luxury Sea View Villa, Rushikonda' will expire in 7 days. Renew now to keep it visible.",
    link: "/dashboard/listings",
    isRead: true,
    createdAt: "2026-07-07T09:00:00Z",
  },
  {
    id: "notif-005",
    userId: "user-002",
    type: "new-match",
    title: "New Property Match",
    message: "3 new properties match your saved search 'Villas in Rushikonda under ₹1Cr'.",
    link: "/dashboard/searches",
    isRead: false,
    createdAt: "2026-07-10T06:00:00Z",
  },
];

// ============================================================================
// MOCK MESSAGES & CHATS
// ============================================================================

export const mockChats: Chat[] = [
  {
    id: "chat-001",
    participants: [
      { userId: "user-002", name: "Vikram Reddy", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80", role: "owner", isOnline: true },
      { userId: "user-006", name: "Priya Mehta", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&q=80", role: "buyer", isOnline: false },
    ],
    propertyId: "prop-001",
    propertyTitle: "Luxury 4BHK Sea View Villa in Rushikonda",
    unreadCount: 2,
    createdAt: "2026-07-08T10:00:00Z",
    updatedAt: "2026-07-10T09:15:00Z",
    lastMessage: {
      id: "msg-005",
      chatId: "chat-001",
      senderId: "user-006",
      senderName: "Priya Mehta",
      senderAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&q=80",
      content: "Can we schedule a visit this weekend? Saturday morning works best for me.",
      type: "text",
      isRead: false,
      sentAt: "2026-07-10T09:15:00Z",
    },
  },
  {
    id: "chat-002",
    participants: [
      { userId: "user-002", name: "Vikram Reddy", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80", role: "owner", isOnline: true },
      { userId: "user-007", name: "Amit Kumar", role: "buyer", isOnline: true },
    ],
    propertyId: "prop-003",
    propertyTitle: "2BHK Furnished Flat for Rent, Madhurawada",
    unreadCount: 0,
    createdAt: "2026-07-05T14:00:00Z",
    updatedAt: "2026-07-09T16:30:00Z",
    lastMessage: {
      id: "msg-010",
      chatId: "chat-002",
      senderId: "user-002",
      senderName: "Vikram Reddy",
      senderAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80",
      content: "Sure, the flat is available from August 1st. Security deposit is ₹1,00,000.",
      type: "text",
      isRead: true,
      sentAt: "2026-07-09T16:30:00Z",
    },
  },
];

export const mockMessages: Message[] = [
  {
    id: "msg-001",
    chatId: "chat-001",
    senderId: "user-006",
    senderName: "Priya Mehta",
    senderAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&q=80",
    content: "Hi, I'm interested in the Rushikonda villa. Is it still available?",
    type: "text",
    isRead: true,
    sentAt: "2026-07-08T10:00:00Z",
  },
  {
    id: "msg-002",
    chatId: "chat-001",
    senderId: "user-002",
    senderName: "Vikram Reddy",
    senderAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80",
    content: "Hello Priya! Yes, the villa is available. It's a stunning property with direct sea views.",
    type: "text",
    isRead: true,
    sentAt: "2026-07-08T10:15:00Z",
  },
  {
    id: "msg-003",
    chatId: "chat-001",
    senderId: "user-006",
    senderName: "Priya Mehta",
    senderAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&q=80",
    content: "The price seems a bit high. Is there any room for negotiation?",
    type: "text",
    isRead: true,
    sentAt: "2026-07-09T11:00:00Z",
  },
  {
    id: "msg-004",
    chatId: "chat-001",
    senderId: "user-002",
    senderName: "Vikram Reddy",
    senderAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80",
    content: "I appreciate your interest. We can discuss the price during the site visit. The property speaks for itself!",
    type: "text",
    isRead: true,
    sentAt: "2026-07-09T11:30:00Z",
  },
  {
    id: "msg-005",
    chatId: "chat-001",
    senderId: "user-006",
    senderName: "Priya Mehta",
    senderAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&q=80",
    content: "Can we schedule a visit this weekend? Saturday morning works best for me.",
    type: "text",
    isRead: false,
    sentAt: "2026-07-10T09:15:00Z",
  },
];

// ============================================================================
// MOCK LEADS
// ============================================================================

export const mockLeads: Lead[] = [
  {
    id: "lead-001",
    propertyId: "prop-001",
    propertyTitle: "Luxury 4BHK Sea View Villa in Rushikonda",
    propertyImage: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400&q=80",
    buyerId: "user-006",
    buyerName: "Priya Mehta",
    buyerPhone: "9876500001",
    buyerEmail: "priya.mehta@gmail.com",
    message: "Very interested in the sea view villa. Would like to schedule a visit.",
    status: "interested",
    source: "contact-form",
    createdAt: "2026-07-08T10:00:00Z",
    updatedAt: "2026-07-09T11:00:00Z",
  },
  {
    id: "lead-002",
    propertyId: "prop-003",
    propertyTitle: "2BHK Furnished Flat for Rent, Madhurawada",
    propertyImage: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&q=80",
    buyerId: "user-007",
    buyerName: "Amit Kumar",
    buyerPhone: "9876500002",
    buyerEmail: "amit.kumar@outlook.com",
    message: "Looking for immediate occupancy. Can I visit tomorrow?",
    status: "contacted",
    source: "whatsapp",
    createdAt: "2026-07-05T14:00:00Z",
    updatedAt: "2026-07-09T16:30:00Z",
  },
  {
    id: "lead-003",
    propertyId: "prop-001",
    propertyTitle: "Luxury 4BHK Sea View Villa in Rushikonda",
    propertyImage: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400&q=80",
    buyerId: "user-008",
    buyerName: "Rajesh Nair",
    buyerPhone: "9876500003",
    buyerEmail: "rajesh.nair@company.com",
    message: "NRI buyer. Will be in Vizag next month. Please share more details.",
    status: "new",
    source: "contact-form",
    createdAt: "2026-07-10T06:00:00Z",
    updatedAt: "2026-07-10T06:00:00Z",
  },
];

// ============================================================================
// MOCK APPOINTMENTS
// ============================================================================

export const mockAppointments: Appointment[] = [
  {
    id: "apt-001",
    propertyId: "prop-001",
    propertyTitle: "Luxury 4BHK Sea View Villa in Rushikonda",
    propertyImage: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400&q=80",
    buyerId: "user-006",
    buyerName: "Priya Mehta",
    ownerId: "user-002",
    ownerName: "Vikram Reddy",
    date: "2026-07-13",
    time: "10:00 AM",
    type: "in-person",
    status: "confirmed",
    notes: "Client prefers morning visit. Has pre-approved home loan.",
    createdAt: "2026-07-10T09:30:00Z",
  },
  {
    id: "apt-002",
    propertyId: "prop-005",
    propertyTitle: "Premium 3BHK in Gachibowli Financial District",
    propertyImage: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80",
    buyerId: "user-008",
    buyerName: "Rajesh Nair",
    ownerId: "user-005",
    ownerName: "Srinivas Developers",
    date: "2026-07-15",
    time: "03:00 PM",
    type: "video",
    status: "pending",
    createdAt: "2026-07-09T14:00:00Z",
  },
];

// ============================================================================
// MOCK REVIEWS
// ============================================================================

export const mockReviews: Review[] = [
  {
    id: "review-001",
    agentId: "user-003",
    reviewerId: "user-006",
    reviewerName: "Priya Mehta",
    reviewerAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&q=80",
    rating: 5,
    title: "Exceptional service and knowledge",
    content: "Sunita was incredibly helpful throughout the entire process. Her knowledge of the Bengaluru market is unmatched. She found us our dream home within our budget and timeline.",
    isVerified: true,
    createdAt: "2026-06-15T10:00:00Z",
  },
  {
    id: "review-002",
    propertyId: "prop-001",
    reviewerId: "user-008",
    reviewerName: "Rajesh Nair",
    rating: 5,
    title: "Breathtaking views, worth every rupee",
    content: "Visited this villa during my trip to Vizag. The sea views are absolutely stunning. Well-maintained property with premium finishes. Highly recommend for luxury seekers.",
    isVerified: true,
    createdAt: "2026-05-20T10:00:00Z",
  },
  {
    id: "review-003",
    agentId: "user-003",
    reviewerId: "user-007",
    reviewerName: "Amit Kumar",
    rating: 4,
    title: "Very professional and responsive",
    content: "Sunita helped me find a great rental in Hyderabad. She was always available and responsive. Only minor delay in paperwork, otherwise perfect experience.",
    isVerified: true,
    createdAt: "2026-04-10T10:00:00Z",
  },
];

// ============================================================================
// TESTIMONIALS (for homepage)
// ============================================================================

export const mockTestimonials = [
  {
    id: "test-001",
    name: "Priya Mehta",
    role: "Home Buyer",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&q=80",
    city: "Bengaluru",
    quote: "ROAD FACING made finding our dream home effortless. The verified listings gave us confidence, and the agent matching was spot on. We closed on a beautiful villa in just 3 weeks!",
    rating: 5,
  },
  {
    id: "test-002",
    name: "Rajesh Nair",
    role: "NRI Investor",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80",
    city: "Dubai → Vizag",
    quote: "As an NRI, managing property search remotely was always stressful. ROAD FACING's verified listings and video tours changed everything. Invested in two properties from Dubai seamlessly.",
    rating: 5,
  },
  {
    id: "test-003",
    name: "Sunita Sharma",
    role: "Real Estate Agent",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80",
    city: "Hyderabad",
    quote: "ROAD FACING transformed my business. The lead management system is incredible — I've 3x'd my closings since joining. The platform feels premium, which impresses my clients.",
    rating: 5,
  },
  {
    id: "test-004",
    name: "Vikram Reddy",
    role: "Property Owner",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80",
    city: "Visakhapatnam",
    quote: "Listed my properties on 5 platforms. ROAD FACING consistently delivers the best quality leads. The verification badge builds trust instantly — buyers approach with serious intent.",
    rating: 5,
  },
];

// ============================================================================
// TRENDING LOCATIONS
// ============================================================================

export const mockTrendingLocations = [
  { city: "Vijayawada", locality: "Benz Circle", image: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=600&q=80", trendPercent: 24, avgPrice: 8500, totalListings: 145 },
  { city: "Vijayawada", locality: "Patamata", image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80", trendPercent: 18, avgPrice: 7200, totalListings: 123 },
  { city: "Guntur", locality: "Brodipet", image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80", trendPercent: 15, avgPrice: 5800, totalListings: 112 },
  { city: "Amaravati", locality: "Capital Region", image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80", trendPercent: 32, avgPrice: 4500, totalListings: 338 },
  { city: "Mangalagiri", locality: "Mangalagiri IT Park", image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=600&q=80", trendPercent: 29, avgPrice: 6500, totalListings: 187 },
  { city: "Vijayawada", locality: "Autonagar", image: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=600&q=80", trendPercent: 11, avgPrice: 4700, totalListings: 88 },
];

// ============================================================================
// BLOG POSTS
// ============================================================================

export const mockBlogPosts = [
  {
    id: "blog-001",
    slug: "rera-guide-india-2026",
    title: "Complete RERA Guide for Indian Homebuyers in 2026",
    excerpt: "Everything you need to know about RERA verification, compliance, and how to check if your builder is RERA registered.",
    image: "https://images.unsplash.com/photo-1554469384-e58fac16e23a?w=600&q=80",
    category: "Guides",
    author: "ROAD FACING Editorial",
    readTime: "8 min read",
    publishedAt: "2026-07-05T10:00:00Z",
  },
  {
    id: "blog-002",
    slug: "best-localities-vizag-2026",
    title: "Top 10 Localities to Buy Property in Visakhapatnam",
    excerpt: "From beachside Rushikonda to the IT hub Madhurawada — discover where smart buyers are investing in Vizag.",
    image: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=600&q=80",
    category: "Market Insights",
    author: "ROAD FACING Research",
    readTime: "6 min read",
    publishedAt: "2026-06-28T10:00:00Z",
  },
  {
    id: "blog-003",
    slug: "home-loan-tips-first-buyers",
    title: "Home Loan Tips: A First-Time Buyer's Complete Checklist",
    excerpt: "Interest rates, documentation, EMI planning, and common mistakes to avoid when applying for your first home loan in India.",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80",
    category: "Finance",
    author: "ROAD FACING Finance",
    readTime: "10 min read",
    publishedAt: "2026-06-20T10:00:00Z",
  },
];

// ============================================================================
// SAVED SEARCHES
// ============================================================================

export const mockSavedSearches = [
  {
    id: "ss-001",
    userId: "user-002",
    name: "Villas in Rushikonda under ₹1Cr",
    filters: {
      listingType: "sale" as const,
      propertyTypes: ["villa" as const],
      city: "Visakhapatnam",
      locality: "Rushikonda",
      maxPrice: 10000000,
    },
    alertEnabled: true,
    alertFrequency: "daily" as const,
    createdAt: "2026-06-01T10:00:00Z",
    lastNotifiedAt: "2026-07-10T06:00:00Z",
  },
  {
    id: "ss-002",
    userId: "user-002",
    name: "3BHK Apartments in Gachibowli",
    filters: {
      listingType: "sale" as const,
      propertyTypes: ["apartment" as const],
      city: "Hyderabad",
      locality: "Gachibowli",
      bedrooms: [3],
    },
    alertEnabled: true,
    alertFrequency: "weekly" as const,
    createdAt: "2026-05-15T10:00:00Z",
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getPropertyBySlug(slug: string): Property | undefined {
  return mockProperties.find((p) => p.slug === slug);
}

export function getPropertiesByCity(city: string): Property[] {
  return mockProperties.filter(
    (p) => p.location.city.toLowerCase() === city.toLowerCase()
  );
}

export function getFeaturedProperties(): Property[] {
  return mockProperties.filter((p) => p.isFeatured);
}

export function getLuxuryProperties(): Property[] {
  return mockProperties.filter((p) => p.price >= 50000000 && p.listingType === "sale");
}

export function getRecentProperties(limit: number = 8): Property[] {
  return [...mockProperties]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export function getPropertiesByType(type: string): Property[] {
  return mockProperties.filter((p) => p.listingType === type);
}

export function getRentalProperties(): Property[] {
  return mockProperties.filter((p) => p.listingType === "rent" || p.listingType === "pg");
}

export function getUserById(id: string): UserProfile | undefined {
  return mockUsers.find((u) => u.id === id);
}

export function filterProperties(
  filters: Partial<{
    listingType: string;
    propertyTypes: string[];
    city: string;
    minPrice: number;
    maxPrice: number;
    bedrooms: number[];
    isReraVerified: boolean;
  }>
): Property[] {
  return mockProperties.filter((p) => {
    if (filters.listingType && p.listingType !== filters.listingType) return false;
    if (filters.propertyTypes?.length && !filters.propertyTypes.includes(p.propertyType)) return false;
    if (filters.city && p.location.city.toLowerCase() !== filters.city.toLowerCase()) return false;
    if (filters.minPrice !== undefined && p.price < filters.minPrice) return false;
    if (filters.maxPrice !== undefined && p.price > filters.maxPrice) return false;
    if (filters.bedrooms?.length && !filters.bedrooms.includes(p.bedrooms)) return false;
    if (filters.isReraVerified && !p.reraId) return false;
    return true;
  });
}

