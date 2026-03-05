# Railway Deployment Guide

## Phase 4 Environment Variables for Railway

Set these variables in `railway.app` dashboard under **Variables**:

### Required Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | PostgreSQL URL | From Railway PostgreSQL plugin |
| `NODE_ENV` | `production` | Required for security |
| `PORT` | `8000` | Railway default (or `6005`) |
| `JWT_ACCESS_SECRET` | `4TEl2yNfARLAVnTrGa6NBZ89XnxHvTgejw9SKcqe3jI=` | Phase 4 access token secret |
| `JWT_REFRESH_SECRET` | `HA67cvAv0VvsXsLx+aePxs0jbiASv4Z7JJP1rMgWWqU=` | Phase 4 refresh token secret |
| `JWT_SECRET` | `4TEl2yNfARLAVnTrGa6NBZ89XnxHvTgejw9SKcqe3jI=` | Fallback secret |
| `ACCESS_TOKEN_TTL_MIN` | `15` | Access token lifetime (minutes) |
| `REFRESH_TOKEN_TTL_DAYS` | `30` | Refresh token lifetime (days) |

### Optional Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `SMTP_HOST` | Your SMTP server | Email notifications |
| `SMTP_PORT` | `465` | SMTP port |
| `SMTP_USER` | Your email | SMTP authentication |
| `SMTP_PASS` | Your password | SMTP authentication |
| `EMAIL_FROM` | noreply@example.com | Sender email |
| `OPENAI_API_KEY` | Your API key | AI features |

## Step-by-Step Railway Deployment

### 1. Create Railway Project (if not exists)

```bash
railway login --browserless
railway init
```

### 2. Add PostgreSQL Service

In Railway dashboard:
- Click "New"
- Select "Database"
- Choose "PostgreSQL"
- Railway will auto-create `DATABASE_URL`

### 3. Set Critical Variables

```bash
# Copy these exact values to Railway dashboard
JWT_ACCESS_SECRET=4TEl2yNfARLAVnTrGa6NBZ89XnxHvTgejw9SKcqe3jI=
JWT_REFRESH_SECRET=HA67cvAv0VvsXsLx+aePxs0jbiASv4Z7JJP1rMgWWqU=
JWT_SECRET=4TEl2yNfARLAVnTrGa6NBZ89XnxHvTgejw9SKcqe3jI=
NODE_ENV=production
```

### 4. Deploy

**Option A: From GitHub (Recommended)**
```bash
# Railway will auto-detect new commits
git push origin master
```

**Option B: Manual CLI Deploy**
```bash
cd homecare-matching-app
railway up
```

### 5. Verify Deployment

```bash
# Check logs
railway logs

# Test health endpoint
curl https://your-railway-domain.railway.app/health

# Test Phase 4 login
curl -X POST https://your-railway-domain.railway.app/auth/phase4/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

## Database Migrations on Railway

### Automatic (Recommended)
Migrations run automatically on server startup via `runMigrations()` in `src/index.ts`

### Manual (if needed)
```bash
railway run npx ts-node src/migrations/runner.ts
```

## Frontend Configuration for Railway

Update frontend `.env`:
```dotenv
VITE_API_URL=https://your-railway-domain.railway.app
```

Or set in Railway dashboard:
- Create separate frontend service
- Set `VITE_API_URL` variable
- Deploy frontend

## Debugging Issues

### Database Connection Failed
```bash
# Check DATABASE_URL in Railway
railway variables

# Verify SSL settings
# PostgreSQL on Railway requires SSL
# This is handled in src/db.ts automatically
```

### JWT Errors
```bash
# Verify secrets are set correctly
railway variables | grep JWT

# Check token format
curl https://your-railway-domain.railway.app/health
```

### CORS Issues
Check `backend/src/index.ts` CORS configuration:
```typescript
app.use(cors());  // Already configured
```

## Security Checklist for Production

- [x] JWT secrets are 32+ bytes of random data
- [x] NODE_ENV=production set
- [x] HttpOnly cookies enabled (automatic)
- [x] SameSite=Strict on cookies (automatic)
- [x] Database SSL enabled (automatic for Railway)
- [ ] Change secrets if ever exposed
- [ ] Rotate secrets periodically
- [ ] Monitor audit logs via `/audit/logs` endpoint
- [ ] Set up email notifications for failed logins

## Monitoring

### View Logs
```bash
railway logs -t application
```

### Monitor Auth Events
```bash
curl https://your-railway-domain.railway.app/audit/logs
```

### Performance
Railway dashboard shows:
- CPU usage
- Memory usage
- Network I/O
- Build/Deploy logs

## Troubleshooting

### How to change secrets after deployment?

1. Generate new secrets (see `crypto.randomBytes(32).toString('base64')`)
2. Update Railway variables
3. Redeploy with `railway up`
4. Old tokens will still work until they expire (15 min for access, 30 days for refresh)

### Backup/Restore Database

Railway has integrated database backups. Contact Railway support or use PostgreSQL tools:

```bash
# Backup
railway run pg_dump $DATABASE_URL > backup.sql

# Restore
railway run psql $DATABASE_URL < backup.sql
```
