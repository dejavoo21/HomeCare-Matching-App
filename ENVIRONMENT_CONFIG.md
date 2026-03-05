# Environment Configuration Guide

## Phase 4 Security Setup

### Required Environment Variables

#### Backend (.env file)

```dotenv
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Server
NODE_ENV=production
PORT=6005

# JWT Security (Phase 4)
JWT_SECRET=<32-byte-base64-random-string>
JWT_ACCESS_SECRET=<32-byte-base64-random-string>
JWT_REFRESH_SECRET=<32-byte-base64-random-string>
ACCESS_TOKEN_TTL_MIN=15
REFRESH_TOKEN_TTL_DAYS=30

# Email (optional)
SMTP_HOST=mail.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=user@example.com
SMTP_PASS=password
EMAIL_FROM=noreply@example.com
```

#### Frontend (.env file)

```dotenv
VITE_API_URL=http://localhost:6005
OPENAI_API_KEY=sk-...
```

### Generating Secure Secrets

Generate random 32-byte secrets for JWT:

**Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**PowerShell:**
```powershell
$secret = [Convert]::ToBase64String((Get-Random -InputObject (0..255) -Count 32 -SetSeed (Get-Random)))
Write-Host $secret
```

### Railway Deployment

Set these environment variables in Railway dashboard:

1. **DATABASE_URL** - PostgreSQL connection string from Railway PostgreSQL plugin
2. **JWT_ACCESS_SECRET** - Generated secret (same as local)
3. **JWT_REFRESH_SECRET** - Generated secret (same as local)
4. **NODE_ENV** - `production`
5. **PORT** - `8000` (Railway default) or `6005` (custom)

### Current Secrets

**Generated on 2026-03-05:**

```
JWT_ACCESS_SECRET=4TEl2yNfARLAVnTrGa6NBZ89XnxHvTgejw9SKcqe3jI=
JWT_REFRESH_SECRET=HA67cvAv0VvsXsLx+aePxs0jbiASv4Z7JJP1rMgWWqU=
```

### Security Notes

- ✅ Secrets are 32 bytes (256-bit) of randomness
- ✅ Base64 encoded for compatibility
- ✅ HttpOnly cookies prevent XSS access to tokens
- ✅ SameSite=Strict prevents CSRF attacks
- ✅ Refresh tokens are hashed in database (never stored raw)
- ✅ Token rotation on refresh revokes old tokens

### First Time Setup

1. **Local Development:**
   ```bash
   # Copy .env files
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   
   # Edit backend/.env with your secrets
   # Edit frontend/.env with API URL
   ```

2. **Railway Deployment:**
   - Create Railway project
   - Link PostgreSQL database
   - Set environment variables in Railways dashboard
   - Deploy with: `railway up`

### Verifying Setup

```bash
# Check backend can read secrets
node -e "require('dotenv').config(); console.log('ACCESS_SECRET:', process.env.JWT_ACCESS_SECRET.substring(0,10) + '...')"

# Check database connection
psql $DATABASE_URL -c "SELECT version();"

# Test Phase 4 login endpoint
curl -X POST http://localhost:6005/auth/phase4/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```
