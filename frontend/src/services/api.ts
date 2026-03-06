// ============================================================================
// API SERVICE - Frontend HTTP client
// ============================================================================
// Pure Phase 4: HttpOnly cookies + secure refresh flow

const BASE_URL = import.meta.env.VITE_API_URL || 'https://homecare-matching-app-production.up.railway.app';

interface ApiOptions {
  headers?: Record<string, string>;
  retry?: boolean;
}

class ApiClient {
  private isRefreshing = false;
  private refreshSubscribers: Array<() => void> = [];

  constructor() {
    // Tokens now live in HttpOnly cookies, not managed by JS
  }

  /**
   * Tokens are managed by the server in HttpOnly cookies.
   * These methods are kept for backward compatibility with components
   * that check for "active session" but don't read the actual token.
   */
  setToken(token: string): void {
    localStorage.setItem('user-session-active', 'true');
  }

  getToken(): string | null {
    // HttpOnly cookies cannot be read from JS—return null
    // The browser automatically includes them in requests
    return null;
  }

  clearTokens(): void {
    localStorage.removeItem('user-session-active');
  }

  private getHeaders(options?: ApiOptions): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
      // DO NOT add Authorization header for Phase 4
      // HttpOnly cookies are sent automatically by the browser
    };
  }

  private notifyRefreshSubscribers(): void {
    this.refreshSubscribers.forEach(cb => cb());
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(callback: () => void): void {
    this.refreshSubscribers.push(callback);
  }

  private async refreshAccessToken(): Promise<boolean> {
    try {
      const response = await fetch(`${BASE_URL}/auth/phase4/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Browser includes HttpOnly cookies automatically
      });

      if (response.ok) {
        // New access token is now in an HttpOnly cookie, set by the server
        this.notifyRefreshSubscribers();
        return true;
      }

      // Refresh failed—user is logged out
      this.clearTokens();
      return false;
    } catch (err) {
      console.error('Token refresh failed:', err);
      this.clearTokens();
      return false;
    }
  }

  async request<T>(
    method: string,
    path: string,
    body?: any,
    options?: ApiOptions
  ): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const shouldRetry = options?.retry !== false;

    const response = await fetch(url, {
      method,
      headers: this.getHeaders(options),
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include', // Include HttpOnly cookies in every request
    });

    // Handle 401 Unauthorized - try to refresh
    if (response.status === 401 && shouldRetry) {
      // Already refreshing? Queue this request
      if (this.isRefreshing) {
        return new Promise((resolve, reject) => {
          this.addRefreshSubscriber(async () => {
            try {
              // Retry the request with the new token (in the cookie)
              const retryResponse = await fetch(url, {
                method,
                headers: this.getHeaders(options),
                body: body ? JSON.stringify(body) : undefined,
                credentials: 'include',
              });

              if (!retryResponse.ok) {
                throw new Error(`Retry failed: ${retryResponse.status}`);
              }

              const data = await retryResponse.json();
              resolve(data);
            } catch (err) {
              reject(err);
            }
          });
        });
      }

      // Not already refreshing—start refresh
      this.isRefreshing = true;
      const refreshed = await this.refreshAccessToken();
      this.isRefreshing = false;

      if (refreshed) {
        // Retry the original request
        return this.request(method, path, body, { ...options, retry: false });
      }

      // Refresh failed—user must log in again
      throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `API request failed: ${response.status}`);
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
    const response = await this.request<any>('POST', '/auth/phase4/login', {
      email,
      password,
    });

    // Mark session as active
    if (response.success) {
      this.setToken('active');
    }

    return response;
  }

  async logout() {
    try {
      await this.request('POST', '/auth/phase4/logout', {});
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      this.clearTokens();
    }
  }

  async getMe() {
    return this.request('GET', '/auth/me');
  }

  async requestOtp(email: string) {
    return this.request('POST', '/auth/request-otp', { email });
  }

  async verifyOtp(userId: string, challengeId: string, code: string) {
    return this.request('POST', '/auth/verify-otp', {
      userId,
      challengeId,
      code,
    });
  }

  async getUserRoles() {
    return this.request('GET', '/auth/me/roles');
  }

  async assignUserRole(userId: string, roleCode: string) {
    return this.request('POST', `/auth/users/${userId}/roles`, { roleCode });
  }

  async requestAccess(
    name: string,
    email: string,
    requestedRole: string,
    reason?: string
  ) {
    return this.request('POST', '/access/request', {
      name,
      email,
      requestedRole,
      reason,
    });
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

  async offerToProfessional(requestId: string, professionalId: string) {
    return this.request('POST', `/admin/requests/${requestId}/offer`, {
      professionalId,
    });
  }

  async requeueRequest(requestId: string) {
    return this.request('POST', `/admin/requests/${requestId}/requeue`, {});
  }

  async cancelRequest(requestId: string) {
    return this.request('POST', `/admin/requests/${requestId}/cancel`, {});
  }

  async setUrgency(requestId: string, urgency: string) {
    return this.request('POST', `/admin/requests/${requestId}/urgency`, {
      urgency,
    });
  }

  async searchGlobal(query: string, limit = 10) {
    const q = encodeURIComponent(query);
    return this.request('GET', `/admin/search?q=${q}&limit=${limit}`);
  }

  async getActivityFeed() {
    return this.request('GET', '/admin/activity');
  }

  async getAuditEvents(params?: {
    q?: string;
    severity?: string;
    entityType?: string;
    limit?: number;
  }) {
