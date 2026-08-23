export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'manager' | 'user';
  status: 'active' | 'blocked';
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  _id: string;
  name: string;
  color: string;
  icon: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Subcategory {
  _id: string;
  name: string;
  category: string | Category;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Certificate {
  _id: string;
  name: string;
  category: Category;
  subcategory: Subcategory;
  certificateNo: string;
  issuingAuthority: string;
  issueDate: string;
  expiryDate: string;
  folderPath?: string;
  fileName?: string;
  fileUrl?: string;
  remarks: string;
  status: 'active' | 'expiring_soon' | 'expired';
  isResolved?: boolean;
  resolvedAt?: string | null;
  sentMilestones?: string[];
  createdBy: {
    _id: string;
    name: string;
    email: string;
    role?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Meeting {
  _id: string;
  title: string;
  date: string;
  time: string;
  duration?: string;
  location: string;
  description: string;
  attendees: Array<{
    _id: string;
    name: string;
    email: string;
    role: string;
  }>;
  sendEmail: boolean;
  category: Category;
  subcategory: Subcategory;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  _id: string;
  timestamp: string;
  userId: string | null;
  userName: string;
  action: string;
  module: 'Auth' | 'Certificate' | 'Meeting' | 'User' | 'System';
  details: string;
  ipAddress: string;
}

export interface EmailLog {
  _id: string;
  subject: string;
  recipient: string;
  type: 'certificate_reminder' | 'meeting_reminder' | 'expiry_alert';
  status: 'sent' | 'scheduled' | 'failed';
  sentOn: string;
  errorMessage?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  [key: string]: any; // To allow mapping like response.certificates or response.logs
}

export interface StabilityHistory {
  _id?: string;
  interval: string;
  dueDate: string;
  completedDate: string;
  completedBy: {
    _id?: string;
    name?: string;
    email?: string;
  } | string;
  completedByName?: string;
  remarks: string;
  fileName?: string;
  fileUrl?: string;
  folderPath?: string;
  createdAt: string;
}

export interface StabilityRecord {
  _id: string;
  productName: string;
  batchNumber: string;
  stabilityStartDate: string;
  stabilityEndDate: string;
  description?: string;
  currentIntervalMonths: number;
  currentIntervalLabel: string;
  currentDueDate: string;
  status: 'ongoing' | 'finished' | 'completed';
  sentOneDayBefore: boolean;
  sentOnDueDate: boolean;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  history: StabilityHistory[];
  createdAt: string;
  updatedAt: string;
}
