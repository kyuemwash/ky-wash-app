/**
 * KY Wash API Client
 * Handles all HTTP requests to the backend with JWT authentication
 * 
 * Features:
 * - Auto-attaches JWT tokens to requests
 * - Automatic token refresh
 * - Error handling and retry logic
 * - Type-safe responses
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/api/ws';

/**
 * Token storage and management
 */
const TOKEN_KEY = 'kywash_access_token';
const REFRESH_TOKEN_KEY = 'kywash_refresh_token';
const USER_KEY = 'kywash_user';

export class AuthError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'AuthError';
  }
}

export class APIError extends Error {
  constructor(message: string, public statusCode: number, public data?: any) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Get current access token
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Get refresh token
 */
function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Get stored user data
 */
export function getStoredUser(): any | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(USER_KEY);
  return stored ? JSON.parse(stored) : null;
}

/**
 * Set authentication tokens and user
 */
export function setAuthTokens(accessToken: string, refreshToken: string, user: any) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Clear authentication tokens and user
 */
export function clearAuthTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new AuthError('No refresh token available', 401);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthTokens();
        throw new AuthError('Refresh token expired', 401);
      }
      throw new APIError('Failed to refresh token', response.status);
    }

    const data = await response.json();
    setAuthTokens(data.access_token, data.refresh_token, data.user);
    return data.access_token;
  } catch (error) {
    if (error instanceof AuthError) throw error;
    clearAuthTokens();
    throw new AuthError('Token refresh failed', 401);
  }
}

/**
 * Make API request with automatic JWT attachment and refresh
 */
async function makeRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  let token = getAccessToken();

  // Add authorization header if token exists
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  try {
    let response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // If 401, try to refresh token
    if (response.status === 401 && token) {
      try {
        token = await refreshAccessToken();
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;

        response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers,
        });
      } catch (error) {
        clearAuthTokens();
        throw new AuthError('Session expired. Please login again.', 401);
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        errorData.detail || 'API request failed',
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof AuthError || error instanceof APIError) {
      throw error;
    }
    throw new APIError('Network error', 0);
  }
}

/**
 * ============ AUTHENTICATION ENDPOINTS ============
 */

export interface RegisterRequest {
  student_id: string;
  pin: string;
  phone_number: string;
}

export interface LoginRequest {
  student_id: string;
  pin: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: {
    id: number;
    student_id: string;
    phone_number: string;
    created_at: string;
  };
  expires_in: number;
}

/**
 * Register new user
 */
export async function registerUser(data: RegisterRequest): Promise<AuthResponse> {
  const response = await makeRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  
  // Auto-save tokens and user on successful registration
  if (response.access_token) {
    setAuthTokens(response.access_token, response.refresh_token, response.user);
  }
  
  return response;
}

/**
 * Login user
 */
export async function loginUser(data: LoginRequest): Promise<AuthResponse> {
  const response = await makeRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  // Auto-save tokens and user on successful login
  if (response.access_token) {
    setAuthTokens(response.access_token, response.refresh_token, response.user);
  }

  return response;
}

/**
 * Logout user
 */
export async function logoutUser(): Promise<void> {
  try {
    await makeRequest('/auth/logout', {
      method: 'POST',
    });
  } finally {
    clearAuthTokens();
  }
}

/**
 * ============ MACHINE ENDPOINTS ============
 */

export interface MachineResponse {
  id: number;
  machine_id: number;
  machine_type: 'washer' | 'dryer';
  status: 'available' | 'in_use' | 'completed' | 'disabled';
  current_category: 'normal' | 'extra_5' | 'extra_10' | 'extra_15' | null;
  time_left_seconds: number;
  current_user_id: number | null;
  enabled: boolean;
  total_cycles: number;
  last_maintenance: string | null;
  created_at: string;
  updated_at: string;
}

export interface MachineListResponse {
  washers: MachineResponse[];
  dryers: MachineResponse[];
}

/**
 * Get all machines
 */
export async function getAllMachines(): Promise<MachineListResponse> {
  return makeRequest('/machines/');
}

/**
 * Get specific machine
 */
export async function getMachine(
  machineType: 'washer' | 'dryer',
  machineId: number
): Promise<MachineResponse> {
  return makeRequest(`/machines/${machineType}/${machineId}`);
}

/**
 * Start machine cycle
 */
export async function startMachine(
  machineId: number,
  machineType: 'washer' | 'dryer',
  category: 'normal' | 'extra_5' | 'extra_10' | 'extra_15'
): Promise<any> {
  return makeRequest('/machines/start', {
    method: 'POST',
    body: JSON.stringify({
      machine_id: machineId,
      machine_type: machineType,
      category,
    }),
  });
}

/**
 * Cancel machine cycle
 */
export async function cancelMachine(
  machineId: number,
  machineType: 'washer' | 'dryer'
): Promise<any> {
  return makeRequest('/machines/cancel', {
    method: 'POST',
    body: JSON.stringify({
      machine_id: machineId,
      machine_type: machineType,
    }),
  });
}

/**
 * End machine cycle
 */
export async function endMachine(
  machineId: number,
  machineType: 'washer' | 'dryer'
): Promise<any> {
  return makeRequest('/machines/end', {
    method: 'POST',
    body: JSON.stringify({
      machine_id: machineId,
      machine_type: machineType,
    }),
  });
}

/**
 * ============ WAITLIST ENDPOINTS ============
 */

export interface WaitlistItemResponse {
  id: number;
  user_id: number;
  student_id: string;
  machine_type: 'washer' | 'dryer';
  position: number;
  joined_at: string;
}

export interface WaitlistResponse {
  machine_type: 'washer' | 'dryer';
  items: WaitlistItemResponse[];
  count: number;
}

/**
 * Get waitlist for machine type
 */
export async function getWaitlist(
  machineType: 'washer' | 'dryer'
): Promise<WaitlistResponse> {
  return makeRequest(`/waitlist/${machineType}`);
}

/**
 * Join waitlist
 */
export async function joinWaitlist(
  machineType: 'washer' | 'dryer'
): Promise<any> {
  return makeRequest('/waitlist/join', {
    method: 'POST',
    body: JSON.stringify({
      machine_type: machineType,
    }),
  });
}

/**
 * Leave waitlist
 */
export async function leaveWaitlist(
  machineType: 'washer' | 'dryer'
): Promise<any> {
  return makeRequest('/waitlist/leave', {
    method: 'POST',
    body: JSON.stringify({
      machine_type: machineType,
    }),
  });
}

/**
 * ============ FAULT REPORTING ENDPOINTS ============
 */

export interface FaultReportResponse {
  id: number;
  machine_id: number;
  user_id: number;
  description: string;
  photo_data: string | null;
  created_at: string;
}

export interface MachineReportCountResponse {
  machine_id: number;
  machine_type: 'washer' | 'dryer';
  report_count: number;
  is_disabled: boolean;
}

/**
 * Report fault
 */
export async function reportFault(
  machineId: number,
  machineType: 'washer' | 'dryer',
  description: string,
  photoData?: string
): Promise<FaultReportResponse> {
  return makeRequest('/faults/report', {
    method: 'POST',
    body: JSON.stringify({
      machine_id: machineId,
      machine_type: machineType,
      description,
      photo_data: photoData || null,
    }),
  });
}

/**
 * Get fault report count for machine
 */
export async function getMachineReportCount(
  machineType: 'washer' | 'dryer',
  machineId: number
): Promise<MachineReportCountResponse> {
  return makeRequest(`/faults/${machineType}/${machineId}`);
}

/**
 * Get all fault reports
 */
export async function getAllFaultReports(): Promise<FaultReportResponse[]> {
  return makeRequest('/faults/');
}

/**
 * ============ ACTIVITY ENDPOINTS ============
 */

export interface ActivityResponse {
  id: number;
  user_id: number;
  activity_type: string;
  machine_type: 'washer' | 'dryer' | null;
  machine_id: number | null;
  details: string | null;
  created_at: string;
}

export interface ActivityFeedResponse {
  activities: ActivityResponse[];
  total: number;
}

/**
 * Get activity feed
 */
export async function getActivityFeed(
  limit: number = 50,
  offset: number = 0
): Promise<ActivityFeedResponse> {
  return makeRequest(`/activities/?limit=${limit}&offset=${offset}`);
}

/**
 * Get user activities
 */
export async function getUserActivities(
  userId: number,
  limit: number = 50,
  offset: number = 0
): Promise<ActivityFeedResponse> {
  return makeRequest(`/activities/user/${userId}?limit=${limit}&offset=${offset}`);
}

/**
 * ============ PROFILE ENDPOINTS ============
 */

export interface UserProfileResponse {
  id: number;
  student_id: string;
  phone_number: string;
  created_at: string;
}

/**
 * Get current user profile
 */
export async function getUserProfile(): Promise<UserProfileResponse> {
  return makeRequest('/profile/me');
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  phoneNumber: string
): Promise<any> {
  return makeRequest('/profile/update', {
    method: 'PUT',
    body: JSON.stringify({
      phone_number: phoneNumber,
    }),
  });
}

/**
 * ============ NOTIFICATION ENDPOINTS ============
 */

export interface NotificationResponse {
  id: number;
  user_id: number;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  machine_type: 'washer' | 'dryer' | null;
  machine_id: number | null;
  created_at: string;
}

export interface NotificationsResponse {
  notifications: NotificationResponse[];
  unread_count: number;
}

/**
 * Get user notifications
 */
export async function getNotifications(): Promise<NotificationsResponse> {
  return makeRequest('/notifications/');
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: number): Promise<any> {
  return makeRequest(`/notifications/${notificationId}/read`, {
    method: 'PUT',
  });
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: number): Promise<any> {
  return makeRequest(`/notifications/${notificationId}`, {
    method: 'DELETE',
  });
}

/**
 * Export all API functions for convenience
 */
export const API = {
  // Auth
  register: registerUser,
  login: loginUser,
  logout: logoutUser,
  refreshToken: refreshAccessToken,

  // Machines
  getMachines: getAllMachines,
  getMachine,
  startMachine,
  cancelMachine,
  endMachine,

  // Waitlist
  getWaitlist,
  joinWaitlist,
  leaveWaitlist,

  // Faults
  reportFault,
  getMachineReportCount,
  getAllFaultReports,

  // Activities
  getActivityFeed,
  getUserActivities,

  // Profile
  getUserProfile,
  updateUserProfile,

  // Notifications
  getNotifications,
  markNotificationAsRead,
  deleteNotification,
};
