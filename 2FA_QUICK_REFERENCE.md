# 2FA API Quick Reference

## Environment Setup

```env
# .env file
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SENDER_EMAIL=noreply@yourapp.com
OTP_EXPIRY_MINUTES=10
OTP_ATTEMPTS=3
WEBAUTHN_RP_ID=yourdomain.com
WEBAUTHN_ORIGIN=https://yourdomain.com
```

## API Endpoints

### OTP Flow (Email Verification)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/auth/request-otp` | ❌ | Send 6-digit OTP to email |
| POST | `/auth/verify-otp` | ❌ | Verify OTP and get auth token |

### 2FA Configuration

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/auth/2fa/settings` | ✅ | Get user's 2FA config |
| POST | `/auth/2fa/enable` | ✅ | Enable 2FA requirement |
| POST | `/auth/2fa/disable` | ✅ | Disable 2FA requirement |

### Passphrase (Security Questions)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/auth/2fa/passphrase/setup` | ✅ | Setup security questions |

### WebAuthn (Biometric/Hardware Keys)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/auth/2fa/webauthn/register/challenge` | ✅ | Get registration challenge |
| POST | `/auth/2fa/webauthn/register/complete` | ✅ | Register credential |

### 2FA Verification (Login)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/auth/2fa/verify` | ❌ | Verify any 2FA method |

---

## Request/Response Examples

### Request OTP
```bash
curl -X POST http://localhost:3000/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to your email"
}
```

### Verify OTP
```bash
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","otp":"123456"}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJpZCI6IjEyMyIsImVtYWlsIjoiKiJ9",
    "user": {"id":"123","email":"user@example.com","role":"admin"}
  }
}
```

### Setup Passphrase
```bash
curl -X POST http://localhost:3000/auth/2fa/passphrase/setup \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "questions": [
      {"question":"Pet name?","answer":"Fluffy"},
      {"question":"Birth city?","answer":"NYC"},
      {"question":"Favorite color?","answer":"Blue"}
    ]
  }'
```

### Get 2FA Settings
```bash
curl -X GET http://localhost:3000/auth/2fa/settings \
  -H "Authorization: Bearer <token>"
```

### Enable 2FA
```bash
curl -X POST http://localhost:3000/auth/2fa/enable \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"primaryMethod":"otp"}'
```

### Verify Passphrase (in login)
```bash
curl -X POST http://localhost:3000/auth/2fa/verify \
  -H "Content-Type: application/json" \
  -d '{
    "userId":"user-id-123",
    "passphraseAnswers":{
      "Pet name?":"Fluffy",
      "Birth city?":"NYC",
      "Favorite color?":"Blue"
    }
  }'
```

### Get WebAuthn Challenge
```bash
curl -X POST http://localhost:3000/auth/2fa/webauthn/register/challenge \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

### Register WebAuthn Credential
```bash
curl -X POST http://localhost:3000/auth/2fa/webauthn/register/complete \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "credentialId":"credential-id-base64",
    "publicKey":"public-key-base64",
    "deviceName":"iPhone Face ID"
  }'
```

---

## Frontend Integration Pattern

```typescript
// Step 1: Request OTP
const otpResponse = await fetch('/auth/request-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email })
});

// Step 2: Verify OTP (show input field)
const loginResponse = await fetch('/auth/verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, otp })
});

const { token } = loginResponse.data.data;

// Step 3: Check 2FA settings
const settingsResponse = await fetch('/auth/2fa/settings', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Step 4: If 2FA enabled, show method selection
const { settings } = settingsResponse.data.data;

if (settings.is_2fa_enabled) {
  // Show 2FA verification UI
  // User selects method: OTP, Passphrase, or WebAuthn
  
  const verifyResponse = await fetch('/auth/2fa/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: settings.user_id,
      passphraseAnswers: userAnswers // or otp, or webauthn
    })
  });
}
```

---

## Database Queries

### Check OTP Status
```sql
SELECT * FROM otp_tokens 
WHERE email = 'user@example.com' 
ORDER BY created_at DESC 
LIMIT 1;
```

### Check 2FA Settings
```sql
SELECT * FROM two_fa_settings 
WHERE user_id = 'user-uuid';
```

### Check Security Questions
```sql
SELECT question FROM passphrase_answers 
WHERE user_id = 'user-uuid';
```

### Check Registered Devices
```sql
SELECT device_name, created_at FROM webauthn_credentials 
WHERE user_id = 'user-uuid';
```

### Cleanup Expired OTPs
```sql
DELETE FROM otp_tokens 
WHERE expires_at < NOW();
```

### Disable All 2FA Methods
```sql
UPDATE two_fa_settings 
SET is_2fa_enabled = false 
WHERE user_id = 'user-uuid';
```

---

## Common Error Codes

| Status | Message | Fix |
|--------|---------|-----|
| 400 | Invalid OTP | Verify code matches database, hasn't expired, and has attempts left |
| 400 | At least 3 security questions required | Passphrase setup needs 3+ questions |
| 401 | Not authenticated | Include valid Authorization header |
| 500 | Failed to send OTP | Check SMTP configuration in .env |
| 500 | Failed to verify OTP | Check database connection and otp_tokens table |

---

## Service Methods Reference

### otpService
```typescript
generateCode(): string // 6-digit OTP
sendOtp(userId, email): Promise<void>
verifyOtp(userId, email, code): Promise<boolean>
cleanupExpiredOtps(): Promise<number> // rows deleted
```

### passphraseService
```typescript
getQuestions(userId): Promise<Question[]>
setupPassphrase(userId, questions): Promise<void>
verifyPassphrase(userId, answers): Promise<boolean>
disablePassphrase(userId): Promise<void>
hashAnswer(answer): string // SHA-256
verifyAnswer(answer, hash): boolean
```

### webAuthnService
```typescript
createRegistrationChallenge(userId): Promise<string>
createAuthenticationChallenge(userId): Promise<string>
storeCredential(userId, credentialId, publicKey, deviceName): Promise<void>
getCredentials(userId): Promise<Credential[]>
deleteCredential(userId, credentialId): Promise<void>
verifyChallenge(userId, credentialId, clientData, signature): Promise<boolean>
```

### twoFaService
```typescript
initialize2fa(userId): Promise<void>
enable2fa(userId): Promise<void>
disable2fa(userId): Promise<void>
is2faEnabled(userId): Promise<boolean>
get2faSettings(userId): Promise<Settings>
getNext2faMethod(userId): Promise<string> // otp|passphrase|webauthn
verify2fa(userId, methods): Promise<VerifyResult>
```

---

## Testing with test-2fa.html

1. Open `backend/test-2fa.html` in browser
2. Navigate to http://localhost:3000/test-2fa.html
3. Use interactive form to test all endpoints
4. Responses displayed in real-time
5. Token auto-populated from OTP verification

---

## Debugging Tips

1. **Check database**: `psql -U postgres -d homecare_db`
2. **Check migrations**: `SELECT * FROM migrations;`
3. **Check OTP codes**: `SELECT * FROM otp_tokens LIMIT 5;`
4. **Check server logs**: Look for error messages in terminal
5. **Use browser DevTools**: Check network requests and console logs
6. **Test with cURL**: Isolate API from frontend issues

---

## Production Deployment

```bash
# 1. Apply migrations
cd backend && npx ts-node src/migrations/runner.ts

# 2. Build production bundle
npm run build

# 3. Verify no errors
npm run build 2>&1 | grep -i error

# 4. Test critical endpoints
node test-2fa.js

# 5. Monitor logs
tail -f logs/app.log
```

---

**Last Updated**: Phase 3.16
**Author**: Development Team
**Status**: Production Ready
