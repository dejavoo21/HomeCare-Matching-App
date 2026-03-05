// ============================================================================
// API SERVICE - Frontend HTTP client
// ============================================================================

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:6005';

interface ApiOptions {
  headers?: Record<string, string>;
  retry?: boolean;
}

class ApiClient {
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor() {
    // Token is now read directly from localStorage on each request
  }

  setToken(token: string): void {
    localStorage.setItem('accessToken', token);
  }

  getToken(): string | null {
    // Always read from localStorage to get the latest token
    return localStorage.getItem('accessToken');
  }

  setRefreshToken(token: string): void {
    localStorage.setItem('refreshToken', token);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  private getHeaders(options?: ApiOptions): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    };

    // Always read fresh token from localStorage
    const currentToken = localStorage.getItem('accessToken');
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }

    return headers;
  }

  private onRefreshed(token: string): void {
    this.refreshSubscribers.forEach(cb => cb(token));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(callback: (token: string) => void): void {
    this.refreshSubscribers.push(callback);
  }

  private async refreshAccessToken(): Promise<string | null> {
    try {
      // Try Phase 4 endpoint first (HttpOnly cookies, no body needed)
      const response = await fetch(`${BASE_URL}/auth/phase4/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies
      });

      if (response.ok) {
        // Phase 4 succeeded - no need to set tokens manually (they're in HttpOnly cookies)
        this.onRefreshed('refreshed');
        return 'refreshed';
      }

      // Fallback: try legacy refresh with stored token
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        this.clearTokens();
        return null;
      }

      const legacyResponse = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!legacyResponse.ok) {
        this.clearTokens();
        return null;
      }

      const data = await legacyResponse.json();
      const newAccessToken = data.data?.accessToken;

      if (newAccessToken) {
        this.setToken(newAccessToken);
        this.onRefreshed(newAccessToken);
        return newAccessToken;
      }

      this.clearTokens();
      return null;
    } catch (err) {
      console.error('Token refresh failed:', err);
      this.clearTokens();
      return null;
    }
  }

  async request<T>(
    method: string,
    path: string,
    body?: any,
    options?: ApiOptions
  ): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const shouldRetry = options?.retry !== false; // Default to true

    const response = await fetch(url, {
      method,
      headers: this.getHeaders(options),
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include', // Include cookies for HttpOnly token support
    });

    // Handle 401 Unauthorized - try to refresh token
    if (response.status === 401 && shouldRetry) {
      // If already refreshing, queue this request
      if (this.isRefreshing) {
        return new Promise((resolve, reject) => {
          this.addRefreshSubscriber((token: string) => {
            fetch(url, {
              method,
              headers: {
                ...this.getHeaders(options),
                'Authorization': `Bearer ${token}`,
              },
              body: body ? JSON.stringify(body) : undefined,
            })
              .then(res => {
                if (!res.ok) throw new Error('Retry failed');
                return res.json();
              })
              .then(resolve)
              .catch(reject);
          });
        });
      }

      this.isRefreshing = true;
      const newToken = await this.refreshAccessToken();
      this.isRefreshing = false;

      if (newToken) {
        // Retry original request with new token
        return this.request(method, path, body, { ...options, retry: false });
      }

      // Refresh failed - clear auth and throw error
      throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }

    return response.json();
  }

  // =========================================================================
  // AUTH ENDPOINTS
  // =========================================================================

  async register(
    name: string,
    email: string,
    password: string,
    role: string,
    location: string
  ) {
    return this.request('POST', '/auth/register', {
      name,
      email,
      password,
      role,
      location,
    });
  }

  async login(email: string, password: string) {
    try {
      // Try Phase 4 login (secure, HttpOnly cookies)
      const response = await fetch(`${BASE_URL}/auth/phase4/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include', // Include cookies
      });

      if (response.ok) {
        const data = await response.json();
        // Tokens are now in HttpOnly cookies, no need to set them manually
        return data;
      }
    } catch (err) {
      console.error('Phase 4 login failed:', err);
    }

    // Fallback: demo-login for development
    return this.request('POST', '/auth/demo-login', { email, password });
  }

  async logout() {
    try {
      // Try Phase 4 logout (clears HttpOnly cookies)
      await fetch(`${BASE_URL}/auth/phase4/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
    // Also clear localStorage for backward compatibility
    this.clearTokens();
  }

  async requestAccess(name: string, email: string, requestedRole: string, reason?: string) {
    return this.request('POST', '/access/request', {
      name,
      email,
      requestedRole,
      reason,
    });
  }

  async verifyOtp(userId: string, challengeId: string, code: string) {
    return this.request('POST', '/auth/verify-otp', { userId, challengeId, code });
  }

  async requestOtp(email: string) {
    return this.request('POST', '/auth/request-otp', { email });
  }

  async getUserRoles() {
    return this.request('GET', '/auth/me/roles');
  }

  async assignUserRole(userId: string, roleCode: string) {
    return this.request('POST', `/auth/users/${userId}/roles`, { roleCode });
  }

  async getMe() {
    return this.request('GET', '/auth/me');
  }

  // =========================================================================
  // USER ENDPOINTS
  // =========================================================================

  async getAllUsers() {
    return this.request('GET', '/users');
  }

  async getUserById(id: string) {
    return this.request('GET', `/users/${id}`);
  }

  async getUsersByRole(role: string) {
    return this.request('GET', `/users/role/${role}`);
  }

  async updateUser(id: string, updates: any) {
    return this.request('PUT', `/users/${id}`, updates);
  }

  // =========================================================================
  // REQUEST ENDPOINTS
  // =========================================================================

  async createRequest(
    serviceType: string,
    description: string,
    address: string,
    scheduledDateTime: string,
    urgency: string,
    medication?: string
  ) {
    return this.request('POST', '/requests/create', {
      serviceType,
      description,
      address,
      scheduledDateTime,
      urgency,
      medication,
    });
  }

  async getClientRequests() {
    return this.request('GET', '/requests/client/list');
  }

  async getAllRequests() {
    return this.request('GET', '/requests/all');
  }

  async getRequestById(id: string) {
    return this.request('GET', `/requests/${id}`);
  }

  async findMatches(requestId: string) {
    return this.request('POST', `/requests/${requestId}/match`, {});
  }

  async assignProfessional(requestId: string, professionalId: string) {
    return this.request('POST', `/requests/${requestId}/assign`, {
      professionalId,
    });
  }

  async updateRequestStatus(requestId: string, status: string) {
    return this.request('PUT', `/requests/${requestId}/status`, { status });
  }

  // =========================================================================
  // VISIT ENDPOINTS
  // =========================================================================

  async getProfessionalVisits() {
    return this.request('GET', '/visits/professional');
  }

  async getClientVisits() {
    return this.request('GET', '/visits/client');
  }

  async getVisitById(id: string) {
    return this.request('GET', `/visits/${id}`);
  }

  async acceptVisit(visitId: string) {
    return this.request('POST', `/visits/${visitId}/accept`, {});
  }

  async declineVisit(visitId: string) {
    return this.request('POST', `/visits/${visitId}/decline`, {});
  }

  async markEnRoute(visitId: string) {
    return this.request('POST', `/visits/${visitId}/en-route`, {});
  }

  async completeVisit(visitId: string, notes?: string) {
    return this.request('POST', `/visits/${visitId}/complete`, { notes });
  }

  // =========================================================================
  // ADMIN ENDPOINTS
  // =========================================================================

  async getAdminDashboard() {
    return this.request('GET', '/admin/dashboard');
  }

  async getProfessionals() {
    return this.request('GET', '/admin/professionals');
  }

  async getClients() {
    return this.request('GET', '/admin/clients');
  }

  async deactivateUser(userId: string) {
    return this.request('PUT', `/admin/users/${userId}/deactivate`, {});
  }

  async reactivateUser(userId: string) {
    return this.request('PUT', `/admin/users/${userId}/reactivate`, {});
  }

  // Phase 3: Premium Admin Features

  async offerToProfessional(requestId: string, professionalId: string) {
    return this.request('POST', `/admin/requests/${requestId}/offer`, { professionalId });
  }

  async requeueRequest(requestId: string) {
    return this.request('POST', `/admin/requests/${requestId}/requeue`, {});
  }

  async cancelRequest(requestId: string) {
    return this.request('POST', `/admin/requests/${requestId}/cancel`, {});
  }

  async setUrgency(requestId: string, urgency: string) {
    return this.request('POST', `/admin/requests/${requestId}/urgency`, { urgency });
  }

  async searchGlobal(query: string, limit = 10) {
    const q = encodeURIComponent(query);
    return this.request('GET', `/admin/search?q=${q}&limit=${limit}`);
  }

  async getActivityFeed() {
    return this.request('GET', '/admin/activity');
  }

  async getAuditEvents(params?: { q?: string; severity?: string; entityType?: string; limit?: number }) {
    const qs = new URLSearchParams();
    if (params?.q) qs.set('q', params.q);
    if (params?.severity) qs.set('severity', params.severity);
    if (params?.entityType) qs.set('entityType', params.entityType);
    if (params?.limit) qs.set('limit', String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return this.request('GET', `/admin/audit${suffix}`);
  }

  async getAllProfessionals() {
    return this.request('GET', '/users?role=nurse,doctor');
  }

  // =========================================================================
  // ASSISTANT ENDPOINTS
  // =========================================================================

  async assistantQuery(message: string) {
    return this.request('POST', '/assistant/query', { message });
  }
}

export const api = new ApiClient();
