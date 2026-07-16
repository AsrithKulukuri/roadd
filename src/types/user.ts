export type UserRole =
  | "guest"
  | "buyer"
  | "tenant"
  | "owner"
  | "agent"
  | "developer"
  | "builder"
  | "broker"
  | "moderator"
  | "support"
  | "admin"
  | "super-admin";

export interface UserProfile {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatar?: string;
  role: UserRole;
  isVerified: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isIdVerified: boolean;
  profileCompletionPercent: number;
  bio?: string;
  company?: string;
  companyLogo?: string;
  reraLicense?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  totalListings?: number;
  totalSoldRented?: number;
  rating?: number;
  reviewCount?: number;
  joinedAt: string;
  lastActiveAt: string;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  type: "identity" | "phone" | "email" | "ownership" | "rera" | "company";
  status: "pending" | "in-review" | "approved" | "rejected";
  documents: VerificationDocument[];
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export interface VerificationDocument {
  id: string;
  name: string;
  type: "government-id" | "property-deed" | "rera-certificate" | "gst-certificate" | "pan-card" | "aadhaar" | "other";
  url: string;
  uploadedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: "listing" | "message" | "lead" | "verification" | "appointment" | "system" | "price-drop" | "new-match";
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: "text" | "image" | "document" | "property-share";
  isRead: boolean;
  sentAt: string;
}

export interface Chat {
  id: string;
  participants: ChatParticipant[];
  lastMessage?: Message;
  propertyId?: string;
  propertyTitle?: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatParticipant {
  userId: string;
  name: string;
  avatar?: string;
  role: UserRole;
  isOnline: boolean;
}

export interface Appointment {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyImage: string;
  buyerId: string;
  buyerName: string;
  ownerId: string;
  ownerName: string;
  date: string;
  time: string;
  type: "in-person" | "video" | "phone";
  status: "pending" | "confirmed" | "cancelled" | "completed";
  notes?: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyImage: string;
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  message: string;
  status: "new" | "contacted" | "interested" | "negotiating" | "closed" | "lost";
  source: "contact-form" | "whatsapp" | "phone" | "chat" | "schedule-visit";
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  propertyId?: string;
  agentId?: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar?: string;
  rating: number;
  title: string;
  content: string;
  isVerified: boolean;
  createdAt: string;
}
