// ============================================================================
// API SERVICE - Frontend HTTP client
// ============================================================================
// Phase 4: HttpOnly cookies + refresh flow + Railway-safe

const BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:6005';

interface ApiOptions {
  headers?: Record<string, string>;
  retry?: boolean;
}

class ApiClient {
  private refreshPromise: Promise<boolean> | null = null;

  // Session marker only (NOT the real token)
  markSessionActive(): void {
    localStorage.setItem('user-session-active', 'true');
  }

  clearSessionMarker(): void {
    localStorage.removeItem('user-session-active');
  }

  hasSessionMarker(): boolean {
    return localStorage.getItem('user-session-active') === 'true';
  }

  // Backward compatibility for existing code
  setToken(_: string): void {
    this.markSessionActive();
  }

  getToken(): string | null {
    // HttpOnly cookies are not readable by JS
    return null;
  }

  clearTokens(): void {
    this.clearSessionMarker();
  }

  private getHeaders(options?: ApiOptions): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    };
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${BASE_URL}/auth/phase4/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (!response.ok) {
          this.clearSessionMarker();
          return false;
        }

        const json = await response.json().catch(() => ({}));
        if (!json?.success) {
          this.clearSessionMarker();
          return false;
        }

        this.markSessionActive();
        return true;
      } catch (err) {
        console.error('Token refresh failed:', err);
        this.clearSessionMarker();
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async request<T>(
    method: string,
    path: string,
    body?: any,
    options?: ApiOptions
  ): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const shouldRetry = options?.retry !== false;

    const doFetch = () =>
      fetch(url, {
        method,
        headers: this.getHeaders(options),
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
      });

    let response = await doFetch();

    // Try refresh once on 401
    if (response.status === 401 && shouldRetry) {
      const refreshed = await this.refreshAccessToken();

      if (refreshed) {
        response = await doFetch();
      } else {
        throw new Error('Session expired. Please log in again.');
      }
    }

    if (!response.ok) {
      let errorMessage = `API request failed: ${response.status}`;
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || errorMessage;
      } catch {}
      throw new Error(errorMessage);
    }

    // Handle empty 204 responses safely
    if (response.status === 204) {
      return {} as T;
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

  // =========================================================================
  // ACCESS REQUEST ENDPOINTS
  // =========================================================================

  async getAccessRequests() {
    return this.request('GET', '/access/admin/requests');
  }

  async decideAccessRequest(id: string, decision: 'approved' | 'rejected', notes?: string) {
    return this.request('POST', `/access/admin/${id}/decide`, { decision, notes });
  }

  async getAuditEvents(params?: {
    q?: string;
    action?: string;
    severity?: string;
    limit?: number;
  }) {
    const qs = new URLSearchParams();
    if (params?.q) qs.set('q', params.q);
    if (params?.action) qs.set('action', params.action);
    if (params?.severity) qs.set('severity', params.severity);
    if (params?.limit) qs.set('limit', String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return this.request('GET', `/audit/admin${suffix}`);
  }

  async getAuditSummary() {
    return this.request('GET', '/audit/admin/summary');
  }

  // =========================================================================
  // MFA / TOTP ENDPOINTS
  // =========================================================================

  async getTotpStatus() {
    return this.request('GET', '/mfa/totp/status');
  }

  async setupTotp() {
    return this.request('POST', '/mfa/totp/setup', {});
  }

  async verifyEnableTotp(code: string) {
    return this.request('POST', '/mfa/totp/verify-enable', { code });
  }

  async disableTotp(code: string) {
    return this.request('POST', '/mfa/totp/disable', { code });
  }

  async verifyTotpLogin(userId: string, code: string) {
    return this.request('POST', '/auth/phase4/verify-totp-login', { userId, code });
  }

  // =========================================================================
  // ANALYTICS ENDPOINTS
  // =========================================================================

  async getAnalyticsSummary() {
    return this.request('GET', '/analytics/admin/summary');
  }

  async getAnalyticsTimeseries(days = 7) {
    return this.request('GET', `/analytics/admin/timeseries?days=${days}`);
  }

  // =========================================================================
  // FHIR ENDPOINTS
  // =========================================================================

  async getFhirMetadata() {
    return this.request('GET', '/fhir/metadata');
  }

  async searchFhirPatients(email?: string) {
    const qs = email ? `?email=${encodeURIComponent(email)}` : '';
    return this.request('GET', `/fhir/Patient${qs}`);
  }

  async getFhirPatient(id: string) {
    return this.request('GET', `/fhir/Patient/${id}`);
  }

  async searchFhirPractitioners(role?: string) {
    const qs = role ? `?role=${encodeURIComponent(role)}` : '';
    return this.request('GET', `/fhir/Practitioner${qs}`);
  }

  async getFhirPractitioner(id: string) {
    return this.request('GET', `/fhir/Practitioner/${id}`);
  }

  async searchFhirServiceRequests(status?: string) {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request('GET', `/fhir/ServiceRequest${qs}`);
  }

  async getFhirServiceRequest(id: string) {
    return this.request('GET', `/fhir/ServiceRequest/${id}`);
  }

  async searchFhirTasks() {
    return this.request('GET', '/fhir/Task');
  }

  async getFhirTask(id: string) {
    return this.request('GET', `/fhir/Task/${id}`);
  }

  // =========================================================================
  // WEBHOOK INTEGRATION ENDPOINTS
  // =========================================================================

  async getWebhookSubscriptions() {
    return this.request('GET', '/webhooks/admin/subscriptions');
  }

  async createWebhookSubscription(payload: {
    name: string;
    targetUrl: string;
    secret?: string;
    isActive?: boolean;
    eventTypes?: string[];
  }) {
    return this.request('POST', '/webhooks/admin/subscriptions', payload);
  }

  async updateWebhookSubscription(
    id: string,
    payload: {
      name?: string;
      targetUrl?: string;
      secret?: string;
      isActive?: boolean;
      eventTypes?: string[];
    }
  ) {
    return this.request('PUT', `/webhooks/admin/subscriptions/${id}`, payload);
  }

  async getWebhookDeliveries(limit = 100) {
    return this.request('GET', `/webhooks/admin/deliveries?limit=${limit}`);
  }

  async getWebhookDeadLetters(limit = 100) {
    return this.request('GET', `/webhooks/admin/dead-letters?limit=${limit}`);
  }

  async replayWebhookDelivery(id: string) {
    return this.request('POST', `/webhooks/admin/deliveries/${id}/replay`, {});
  }

  // Missing method stubs for backward compatibility
  setRefreshToken(_: string): void {
    // HttpOnly cookies handle refresh token automatically
    this.markSessionActive();
  }

  async getAllProfessionals() {
    // Alias for getProfessionals
    return this.getProfessionals();
  }

  async assistantQuery(query: string) {
    // Assistant widget query method
    return this.request('POST', '/assistant/query', { query });
  }
}

export const api = new ApiClient();
