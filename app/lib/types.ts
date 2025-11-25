/**
 * KY Wash Type Definitions
 * Complete type definitions for backend models and API responses
 */

/**
 * Authentication Types
 */
export interface User {
  id: number;
  student_id: string;
  phone_number: string;
  created_at: string;
  updated_at?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}

/**
 * Machine Types
 */
export type MachineType = 'washer' | 'dryer';
export type MachineStatus = 'available' | 'in_use' | 'completed' | 'disabled';
export type CycleCategory = 'normal' | 'extra_5' | 'extra_10' | 'extra_15';

export interface Machine {
  id: number;
  machine_id: number; // 1-6
  machine_type: MachineType;
  status: MachineStatus;
  current_category: CycleCategory | null;
  time_left_seconds: number;
  current_user_id: number | null;
  enabled: boolean;
  total_cycles: number;
  last_maintenance: string | null;
  created_at: string;
  updated_at: string;
}

export interface MachineList {
  washers: Machine[];
  dryers: Machine[];
}

/**
 * Cycle time mapping (in seconds)
 */
export const CYCLE_TIMES: Record<CycleCategory, number> = {
  normal: 30 * 60,     // 30 minutes
  extra_5: 35 * 60,    // 35 minutes
  extra_10: 40 * 60,   // 40 minutes
  extra_15: 45 * 60,   // 45 minutes
};

/**
 * Waitlist Types
 */
export interface WaitlistItem {
  id: number;
  user_id: number;
  student_id: string;
  machine_type: MachineType;
  position: number;
  joined_at: string;
}

export interface Waitlist {
  machine_type: MachineType;
  items: WaitlistItem[];
  count: number;
}

/**
 * Fault Report Types
 */
export interface FaultReport {
  id: number;
  machine_id: number;
  user_id: number;
  description: string;
  photo_data: string | null; // Base64 encoded
  created_at: string;
}

export interface MachineReportCount {
  machine_id: number;
  machine_type: MachineType;
  report_count: number;
  is_disabled: boolean;
}

/**
 * Activity Types
 */
export type ActivityType =
  | 'machine_started'
  | 'machine_cancelled'
  | 'machine_completed'
  | 'joined_waitlist'
  | 'left_waitlist'
  | 'fault_reported'
  | 'machine_disabled'
  | 'profile_updated'
  | 'user_registered';

export interface Activity {
  id: number;
  user_id: number;
  activity_type: ActivityType;
  machine_type: MachineType | null;
  machine_id: number | null;
  details: string | null;
  created_at: string;
}

export interface ActivityFeed {
  activities: Activity[];
  total: number;
}

/**
 * Notification Types
 */
export type NotificationType =
  | 'cycle_complete'
  | 'joined_waitlist'
  | 'removed_from_waitlist'
  | 'machine_available'
  | 'fault_reported'
  | 'system_alert';

export interface Notification {
  id: number;
  user_id: number;
  notification_type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  machine_type: MachineType | null;
  machine_id: number | null;
  created_at: string;
}

export interface NotificationsData {
  notifications: Notification[];
  unread_count: number;
}

/**
 * WebSocket Event Types
 */
export type WebSocketEventType =
  | 'machine_update'
  | 'waitlist_update'
  | 'activity_logged'
  | 'notification_received'
  | 'fault_reported'
  | 'connected'
  | 'disconnected'
  | 'error';

export interface WebSocketEvent {
  event: WebSocketEventType;
  data: any;
  timestamp: string;
}

/**
 * Machine Update Event
 */
export interface MachineUpdateEvent extends WebSocketEvent {
  event: 'machine_update';
  data: {
    machine_id: number;
    machine_type: MachineType;
    status: MachineStatus;
    time_left_seconds: number;
    current_user_id: number | null;
  };
}

/**
 * Waitlist Update Event
 */
export interface WaitlistUpdateEvent extends WebSocketEvent {
  event: 'waitlist_update';
  data: {
    machine_type: MachineType;
    data: Array<{
      position?: number;
      student_id?: string;
      removed_user_id?: number;
    }>;
  };
}

/**
 * Activity Log Event
 */
export interface ActivityLogEvent extends WebSocketEvent {
  event: 'activity_logged';
  data: {
    id: number;
    user_id: number;
    activity_type: ActivityType;
    machine_type: MachineType | null;
    machine_id: number | null;
    details: string | null;
    created_at: string;
  };
}

/**
 * Notification Event
 */
export interface NotificationEvent extends WebSocketEvent {
  event: 'notification_received';
  data: Notification;
}

/**
 * Fault Report Event
 */
export interface FaultReportEvent extends WebSocketEvent {
  event: 'fault_reported';
  data: {
    machine_id: number;
    machine_type: MachineType;
    report_count: number;
    is_disabled: boolean;
    description: string;
  };
}

/**
 * App State Types
 */
export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Machine state
  machines: {
    washers: Machine[];
    dryers: Machine[];
  };
  selectedMachine: Machine | null;

  // Waitlist state
  washerWaitlist: WaitlistItem[];
  dryerWaitlist: WaitlistItem[];

  // Fault state
  faultReports: FaultReport[];
  machineReportCounts: Record<string, MachineReportCount>;

  // Activity state
  activities: Activity[];
  activityTotal: number;

  // Notification state
  notifications: Notification[];
  unreadNotificationCount: number;

  // UI state
  isWebSocketConnected: boolean;
  isWebSocketReconnecting: boolean;
}

/**
 * Request/Response Types for complex operations
 */
export interface StartMachineRequest {
  machine_id: number;
  machine_type: MachineType;
  category: CycleCategory;
}

export interface ReportFaultRequest {
  machine_id: number;
  machine_type: MachineType;
  description: string;
  photo_data?: string; // Base64 encoded
}

export interface UpdateProfileRequest {
  phone_number: string;
}

/**
 * Error Types
 */
export class BackendError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public data?: any
  ) {
    super(message);
    this.name = 'BackendError';
  }
}

export class AuthenticationError extends BackendError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends BackendError {
  constructor(message: string = 'Authorization failed') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

export class ValidationError extends BackendError {
  constructor(message: string = 'Validation failed', data?: any) {
    super(message, 400, data);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends BackendError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Utility functions
 */

/**
 * Get human-readable machine status
 */
export function getMachineStatusLabel(status: MachineStatus): string {
  const labels: Record<MachineStatus, string> = {
    available: 'Available',
    in_use: 'In Use',
    completed: 'Completed',
    disabled: 'Disabled',
  };
  return labels[status] || status;
}

/**
 * Get human-readable cycle category
 */
export function getCycleCategoryLabel(category: CycleCategory): string {
  const labels: Record<CycleCategory, string> = {
    normal: 'Normal (30 min)',
    extra_5: 'Extra 5 min',
    extra_10: 'Extra 10 min',
    extra_15: 'Extra 15 min',
  };
  return labels[category] || category;
}

/**
 * Get cycle time in minutes
 */
export function getCycleTimeMinutes(category: CycleCategory): number {
  return Math.ceil(CYCLE_TIMES[category] / 60);
}

/**
 * Format machine type label
 */
export function getMachineTypeLabel(type: MachineType): string {
  return type === 'washer' ? 'Washer' : 'Dryer';
}

/**
 * Format activity type label
 */
export function getActivityTypeLabel(type: ActivityType): string {
  const labels: Record<ActivityType, string> = {
    machine_started: 'Started Machine',
    machine_cancelled: 'Cancelled Machine',
    machine_completed: 'Machine Completed',
    joined_waitlist: 'Joined Waitlist',
    left_waitlist: 'Left Waitlist',
    fault_reported: 'Reported Fault',
    machine_disabled: 'Machine Disabled',
    profile_updated: 'Updated Profile',
    user_registered: 'Registered',
  };
  return labels[type] || type;
}

/**
 * Format time remaining
 */
export function formatTimeRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

/**
 * Check if student ID is valid (6 digits)
 */
export function isValidStudentId(id: string): boolean {
  return /^\d{6}$/.test(id);
}

/**
 * Check if PIN is valid (4 digits)
 */
export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/**
 * Check if phone number is valid (10-11 digits)
 */
export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 11;
}
