// ============================================================================
// PROMETHEUS METRICS & MONITORING
// ============================================================================

import client from 'prom-client';

// Create a new registry (or use default)
export const register = new client.Registry();

// Collect default metrics (CPU, memory, Node.js internals)
client.collectDefaultMetrics({ register });

// ============================================================================
// CUSTOM METRICS
// ============================================================================

/**
 * HTTP Requests Counter
 * Tracks total requests by method, route, and status code
 */
export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

/**
 * HTTP Request Duration Histogram
 * Tracks request latency in milliseconds
 */
export const httpRequestDurationMs = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request latency in milliseconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000],
  registers: [register],
});

/**
 * Authentication Events Counter
 * Tracks login, logout, MFA, token refresh
 */
export const authEventsTotal = new client.Counter({
  name: 'auth_events_total',
  help: 'Total authentication events',
  labelNames: ['event_type', 'status'],
  registers: [register],
});

/**
 * FHIR Events Counter
 * Tracks FHIR resource creation/validation
 */
export const fhirEventsTotal = new client.Counter({
  name: 'fhir_events_total',
  help: 'Total FHIR resource operations',
  labelNames: ['resource_type', 'operation', 'status'],
  registers: [register],
});

/**
 * FHIR Validation Errors Counter
 * Tracks FHIR validation failures
 */
export const fhirValidationErrors = new client.Counter({
  name: 'fhir_validation_errors_total',
  help: 'Total FHIR validation errors',
  labelNames: ['resource_type'],
  registers: [register],
});

/**
 * Webhook Deliveries Counter
 * Tracks webhook processing attempts
 */
export const webhookDeliveriesTotal = new client.Counter({
  name: 'webhook_deliveries_total',
  help: 'Total webhook delivery attempts',
  labelNames: ['status', 'attempt'],
  registers: [register],
});

/**
 * Webhook Delivery Duration Histogram
 * Tracks how long webhook deliveries take
 */
export const webhookDeliveryDurationMs = new client.Histogram({
  name: 'webhook_delivery_duration_ms',
  help: 'Webhook delivery duration in milliseconds',
  labelNames: ['status'],
  buckets: [50, 100, 250, 500, 1000, 2500, 5000, 10000],
  registers: [register],
});

/**
 * Outbox Events Counter
 * Tracks outbox pattern event processing
 */
export const outboxEventsTotal = new client.Counter({
  name: 'outbox_events_total',
  help: 'Total outbox events processed',
  labelNames: ['event_type', 'status'],
  registers: [register],
});

/**
 * Database Query Duration Histogram
 * Tracks query latency
 */
export const dbQueryDurationMs = new client.Histogram({
  name: 'db_query_duration_ms',
  help: 'Database query duration in milliseconds',
  labelNames: ['query_type'],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
  registers: [register],
});

/**
 * Cache Hit Ratio
 * Tracks cache effectiveness
 */
export const cacheHitsTotal = new client.Counter({
  name: 'cache_hits_total',
  help: 'Total cache hits',
  labelNames: ['cache_name'],
  registers: [register],
});

export const cacheMissesTotal = new client.Counter({
  name: 'cache_misses_total',
  help: 'Total cache misses',
  labelNames: ['cache_name'],
  registers: [register],
});

/**
 * Active Database Connections Gauge
 * Tracks current pool size
 */
export const activeDbConnections = new client.Gauge({
  name: 'active_db_connections',
  help: 'Currently active database connections',
  registers: [register],
});

/**
 * Realtime SSE Clients Gauge
 * Tracks connected realtime clients
 */
export const realtimeClientsConnected = new client.Gauge({
  name: 'realtime_clients_connected',
  help: 'Number of connected realtime SSE clients',
  registers: [register],
});

/**
 * Business Logic Counters
 */

export const careRequestsCreated = new client.Counter({
  name: 'care_requests_created_total',
  help: 'Total care requests created',
  labelNames: ['role'],
  registers: [register],
});

export const offersCreated = new client.Counter({
  name: 'offers_created_total',
  help: 'Total offers created',
  registers: [register],
});

export const offersAccepted = new client.Counter({
  name: 'offers_accepted_total',
  help: 'Total offers accepted',
  registers: [register],
});

export const requestsCompleted = new client.Counter({
  name: 'requests_completed_total',
  help: 'Total requests completed',
  registers: [register],
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all metrics as Prometheus text format
 * Call this in the /metrics endpoint
 */
export async function getMetrics(): Promise<string> {
  return await register.metrics();
}

/**
 * Get metrics content type for HTTP responses
 */
export function getMetricsContentType(): string {
  return register.contentType;
}

/**
 * Reset all metrics (useful for testing)
 */
export function resetMetrics(): void {
  register.resetMetrics();
}
