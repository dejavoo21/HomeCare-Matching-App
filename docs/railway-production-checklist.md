# Railway Production Stabilization Checklist

## Before deploy
- Environment variables present
- Database reachable
- Required schema columns present
- Migration status verified
- Seed assumptions verified

## After deploy
- `/health` returns `healthy`
- `/ready` returns `ready`
- `/api/admin/schema-health` returns `success: true`
- Admin login succeeds
- Dashboard loads
- Dispatch loads
- Scheduling loads
- Analytics loads

## Watch items
- legacy request status aliases
- missing `professional_id` on active requests
- inconsistent follow-up flags
- degraded integration callbacks
