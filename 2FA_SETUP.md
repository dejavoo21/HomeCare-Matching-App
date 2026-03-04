# Two-Factor Authentication (2FA) Setup Guide

## Overview

The 2FA system provides multiple authentication methods to enhance security:

1. **Email OTP** (One-Time Password) - 6-digit codes sent via email
2. **Passphrase** (Security Questions) - Answer pre-defined security questions
3. **WebAuthn** (Biometric/Hardware Keys) - Face ID, fingerprint, or hardware security keys

## Architecture

### Database Schema

The 2FA system uses the following tables:

- `otp_tokens` - Stores 6-digit OTP codes with expiry
- `users` - Extended with `email_verified`, `email_verified_at`, `last_otp_sent_at` columns
- `two_fa_settings` - User 2FA preferences and primary method
- `passphrase_answers` - Security question answers (hashed with SHA-256)
- `webauthn_credentials` - Registered biometric/hardware key credentials
- `webauthn_challenges` - Temporary challenges for credential verification

### Services

#### `otp.service.ts`
- `generateCode()` - Create 6-digit OTP
- `sendOtp(userId, email)` - Send OTP via email
- `verifyOtp(userId, email, code)` - Verify OTP code
- `cleanupExpiredOtps()` - Remove expired tokens

#### `passphrase.service.ts`
- `setupPassphrase(userId, questions)` - Save security questions
- `verifyPassphrase(userId, answers)` - Verify answers to questions
- `getQuestions(userId)` - Get user's security questions
- `disablePassphrase(userId)` - Remove security questions

#### `webauthn.service.ts`
- `createRegistrationChallenge(userId)` - Challenge for registering biometric
- `storeCredential(userId, credentialId, publicKey, deviceName)` - Save credential
- `createAuthenticationChallenge(userId)` - Challenge for biometric login
- `verifyChallenge(userId, credentialId, clientData, signature)` - Verify biometric signature
- `getCredentials(userId)` - List registered biometric devices
- `deleteCredential(userId, credentialId)` - Remove a device

#### `2fa.service.ts`
- `initialize2fa(userId)` - Create 2FA settings for new user
- `enable2fa(userId)` - Enable 2FA requirement
- `disable2fa(userId)` - Disable 2FA requirement
- `is2faEnabled(userId)` - Check if 2FA is active
- `get2faSettings(userId)` - Get user's 2FA configuration
- `verify2fa(userId, methods)` - Verify any 2FA method and return auth token

## API Endpoints

### Authentication Endpoints

#### Request OTP
```http
POST /auth/request-otp
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to your email"
}
```

#### Verify OTP
```http
POST /auth/verify-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "base64-encoded-token",
    "user": {
      "id": "uuid",
      "name": "User Name",
      "email": "user@example.com",
      "role": "admin"
    }
  }
}
```

### 2FA Configuration Endpoints

#### Get 2FA Settings (Authenticated)
```http
GET /auth/2fa/settings
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "settings": {
      "userId": "uuid",
      "is2faEnabled": true,
      "primaryMethod": "otp",
      "isPassphraseEnabled": true,
      "isWebauthnEnabled": true
    },
    "passphraseQuestionsCount": 3,
    "webauthnCredentialsCount": 1
  }
}
```

#### Setup Passphrase
```http
POST /auth/2fa/passphrase/setup
Authorization: Bearer <token>
Content-Type: application/json

{
  "questions": [
    {
      "question": "What is your childhood pet's name?",
      "answer": "Fluffy"
    },
    {
      "question": "What city were you born in?",
      "answer": "New York"
    },
    {
      "question": "What is your favorite color?",
      "answer": "Blue"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Passphrase setup successful"
}
```

#### Get WebAuthn Registration Challenge
```http
POST /auth/2fa/webauthn/register/challenge
Authorization: Bearer <token>
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "data": {
    "challenge": "base64-challenge-string",
    "timeout": 60000,
    "attestation": "direct"
  }
}
```

#### Complete WebAuthn Registration
```http
POST /auth/2fa/webauthn/register/complete
Authorization: Bearer <token>
Content-Type: application/json

{
  "credentialId": "base64-credential-id",
  "publicKey": "base64-public-key",
  "deviceName": "iPhone Face ID"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Biometric credential registered successfully"
}
```

#### Enable 2FA
```http
POST /auth/2fa/enable
Authorization: Bearer <token>
Content-Type: application/json

{
  "primaryMethod": "otp"
}
```

**Response:**
```json
{
  "success": true,
  "message": "2FA enabled successfully"
}
```

#### Disable 2FA
```http
POST /auth/2fa/disable
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "2FA disabled successfully"
}
```

### 2FA Verification (During Login)

#### Verify 2FA Method
```http
POST /auth/2fa/verify
Content-Type: application/json

{
  "userId": "uuid",
  "otp": "123456"
}
```

Or with passphrase:
```json
{
  "userId": "uuid",
  "passphraseAnswers": {
    "What is your childhood pet's name?": "Fluffy",
    "What city were you born in?": "New York",
    "What is your favorite color?": "Blue"
  }
}
```

Or with WebAuthn:
```json
{
  "userId": "uuid",
  "webauthn": {
    "credentialId": "credential-id",
    "clientData": "base64-client-data",
    "signature": "base64-signature"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "base64-encoded-token",
    "user": {
      "id": "uuid",
      "name": "User Name",
      "email": "user@example.com",
      "role": "admin"
    }
  },
  "message": "2FA verification successful"
}
```

## Environment Variables

Add to `.env`:

```env
# Email Configuration (required for OTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SENDER_EMAIL=noreply@yourapp.com

# OTP Configuration
OTP_EXPIRY_MINUTES=10
OTP_ATTEMPTS=3

# WebAuthn Configuration
WEBAUTHN_RP_ID=yourdomain.com
WEBAUTHN_ORIGIN=https://yourdomain.com
WEBAUTHN_TIMEOUT=60000
```

## Migration Steps

### 1. Apply Migrations
```bash
cd backend
npx ts-node src/migrations/runner.ts
```

### 2. Verify 2FA Tables
```bash
psql -U postgres -d homecare_db -c "\dt" | grep -E "two_fa|passphrase|webauthn"
```

Expected output:
- `two_fa_settings`
- `passphrase_answers`
- `webauthn_credentials`
- `webauthn_challenges`

### 3. Start Backend Server
```bash
npm run dev
```

### 4. Test 2FA Endpoints
Use the included `test-2fa.js` file or curl commands.

## Testing 2FA

### Test OTP Flow
```bash
# 1. Request OTP
curl -X POST http://localhost:3000/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"onboarding@sochristventures.com"}'

# 2. Check email for OTP code (or check database)
SELECT otp_code FROM otp_tokens 
WHERE email='onboarding@sochristventures.com' 
ORDER BY created_at DESC LIMIT 1;

# 3. Verify OTP
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"onboarding@sochristventures.com","otp":"123456"}'
```

### Test Passphrase Flow
```bash
# 1. Setup passphrase (with auth token)
curl -X POST http://localhost:3000/auth/2fa/passphrase/setup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "questions": [
      {"question":"Pet name?","answer":"Fluffy"},
      {"question":"Birth city?","answer":"NewYork"},
      {"question":"Favorite color?","answer":"Blue"}
    ]
  }'

# 2. Get 2FA settings
curl -X GET http://localhost:3000/auth/2fa/settings \
  -H "Authorization: Bearer <token>"

# 3. Verify passphrase during login
curl -X POST http://localhost:3000/auth/2fa/verify \
  -H "Content-Type: application/json" \
  -d '{
    "userId":"uuid",
    "passphraseAnswers":{
      "Pet name?":"Fluffy",
      "Birth city?":"NewYork",
      "Favorite color?":"Blue"
    }
  }'
```

## Frontend Integration

The frontend needs to:

1. **OTP Page** - Display OTP input field during login
2. **2FA Setup Page** - Allow users to setup passphrase + WebAuthn
3. **2FA Verification** - Show method selection during login for 2FA-enabled users

Example Login Flow with 2FA:
```
1. User enters email + password
2. Check if 2FA is enabled
3. If OTP: Show OTP code input
4. If Passphrase: Show security questions
5. If WebAuthn: Trigger biometric/hardware key prompt
6. On successful verification: Redirect to dashboard
```

## Security Best Practices

1. **OTP Delivery** - Use Gmail App Password (not regular password)
2. **Answer Storage** - Answers are hashed with SHA-256, never stored in plain text
3. **Challenges** - WebAuthn challenges expire after 60 seconds
4. **Rate Limiting** - Implement rate limits on verify endpoints
5. **HTTPS Only** - Always use HTTPS in production for WebAuthn

## Maintenance

### Cleanup Expired OTPs
```bash
# Run periodically (e.g., with cron) to remove expired tokens
npx ts-node src/services/otp.service.ts cleanup
```

### Cleanup Expired WebAuthn Challenges
```bash
# Built into service initialization, but can be called manually
DELETE FROM webauthn_challenges 
WHERE expires_at < NOW();
```

## Debugging

### Check OTP Status
```sql
SELECT user_id, email, otp_code, attempts_left, expires_at 
FROM otp_tokens 
WHERE email = 'user@example.com' 
ORDER BY created_at DESC;
```

### Check 2FA Settings
```sql
SELECT * FROM two_fa_settings WHERE user_id = 'uuid';
```

### Check Registered Biometrics
```sql
SELECT user_id, credential_id, device_name, created_at 
FROM webauthn_credentials 
WHERE user_id = 'uuid';
```

## Troubleshooting

### OTP Not Sending
- Check `.env` has valid SMTP credentials
- Verify Gmail account has App Password generated
- Check backend logs for email service errors
- Ensure `SENDER_EMAIL` is authorized in Gmail

### WebAuthn Not Working
- Verify HTTPS is enabled (WebAuthn requires secure context)
- Check `WEBAUTHN_ORIGIN` matches your domain exactly
- Ensure browser supports WebAuthn (Chrome 67+, Safari 13+, Edge 18+)
- Check console logs for WebAuthn API errors

### Database Migration Failed
- Ensure database exists: `createdb homecare_db`
- Check PostgreSQL version (requires 13+)
- Run migrations individually if needed:
  ```bash
  psql -U postgres -d homecare_db -f src/migrations/003_add_2fa_tables.sql
  ```

## Production Checklist

- [ ] Email SMTP configured with production Gmail account
- [ ] WebAuthn origin matches production domain
- [ ] All migrations applied to production database
- [ ] Rate limiting enabled on auth endpoints
- [ ] HTTPS enabled for all /auth endpoints
- [ ] Backup of production database created
- [ ] 2FA documentation shared with users
- [ ] Test OTP and 2FA flows with production credentials
