// ============================================================================
// API SERVICE - Frontend HTTP client
// ============================================================================

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:6005';

interface ApiOptions {
  headers?: Record<string, string>;
}

class ApiClient {
  constructor() {
    // Token is now read directly from localStorage on each request
  }

  setToken(token: string): void {
    localStorage.setItem('token', token);
  }

  getToken(): string | null {
    // Always read from localStorage to get the latest token
    return localStorage.getItem('token');
  }

  clearToken(): void {
    localStorage.removeItem('token');
  }

  private getHeaders(options?: ApiOptions): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    };

    // Always read fresh token from localStorage
    const currentToken = localStorage.getItem('token');
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }

    return headers;
  }

  async request<T>(
    method: string,
    path: string,
    body?: any,
    options?: ApiOptions
  ): Promise<T> {
    const url = `${BASE_URL}${path}`;

    const response = await fetch(url, {
      method,
      headers: this.getHeaders(options),
      body: body ? JSON.stringify(body) : undefined,
    });

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
    return this.request('POST', '/auth/login', { email, password });
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
