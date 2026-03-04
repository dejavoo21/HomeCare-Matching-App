# Email OTP Verification Setup Guide

## ✅ What's Been Implemented

### Backend Services
1. **Email Service** (`src/services/email.service.ts`)
   - Nodemailer integration for sending emails
   - HTML email templates for OTP verification
   - Welcome email after successful registration

2. **OTP Service** (`src/services/otp.service.ts`)
   - Generate random 6-digit OTP codes
   - Store OTP tokens in PostgreSQL with expiration
   - Verify OTP with attempt limits (3 attempts max)
   - Automatic cleanup of expired OTPs

3. **Database Migration** (`src/migrations/002_add_otp_table.sql`)
   - `otp_tokens` table for storing OTP data
   - `email_verified` column in users table
   - Indexes for efficient OTP lookups

### Backend Routes
- **POST /auth/request-otp** - Request OTP for email verification
- **POST /auth/verify-otp** - Verify OTP code and log in user

### Frontend
- **LoginPage.tsx** - Two-step authentication flow
  - Step 1: Email & password entry
  - Step 2: 6-digit OTP verification
- **API Integration** - `api.requestOtp()` and `api.verifyOtp()` methods
- **UI Components** - Success/error messages, OTP input field

---

## 🔧 Configuration (Required)

### Step 1: Set up Gmail App Password
1. Go to https://myaccount.google.com/apppasswords
2. Create an app password for "Mail" on "Windows Computer"
3. Copy the 16-character password

### Step 2: Update `.env` file
```env
# Email Configuration (Gmail with App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16char_app_password
SENDER_EMAIL=your_email@gmail.com
SENDER_NAME=Homecare Matching

# OTP Configuration
OTP_EXPIRY_MINUTES=10
OTP_LENGTH=6
```

### Step 3: Run Database Migration
```bash
cd backend
npx ts-node src/migrations/runner.ts
```

### Step 4: Start Services
```bash
# Terminal 1: Backend API
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Worker (optional)
cd backend
npm run worker
```

---

## 📧 Testing the OTP Flow

### Register a New User
1. Go to `http://localhost:7005/register`
2. Fill in all fields
3. Click "Create Account"

### Login with OTP
1. Go to `http://localhost:7005/login`
2. Enter email and password
3. Click "Continue"
4. **Check your email** for the 6-digit OTP code
5. Enter OTP in the verification form
6. Click "Verify & Sign In"

### What Happens Behind the Scenes
1. **Request OTP** → `POST /auth/request-otp`
   - Backend generates random 6-digit code
   - Stores in `otp_tokens` table with 10-minute expiry
   - **Sends email via Gmail SMTP**
   - Returns success response

2. **Verify OTP** → `POST /auth/verify-otp`
   - Checks OTP code (3 attempts allowed)
   - Validates expiration time
   - Marks `users.email_verified = true`
   - Returns JWT token for login
   - Frontend navigates to dashboard

---

## 🚨 Troubleshooting

### "Email not sent" (console shows device warning)
**Cause**: Email service not configured
**Solution**: Set `SMTP_USER` and `SMTP_PASS` in `.env`

### Gmail Login Failed
- [ ] Using plain password? → Use **App Password** instead
- [ ] App password correct? → Copy all 16 characters
- [ ] Account secured? → Enable 2FA first

### "Too many failed attempts"
- User exceeded 3 OTP verification attempts
- Request new OTP to reset counter

### OTP Always Expires Quickly
- Check `OTP_EXPIRY_MINUTES` in `.env` (default: 10 minutes)
- Verify system clock is correct

### Database Error
- Run migration: `npx ts-node src/migrations/runner.ts`
- Check PostgreSQL connection in DATABASE_URL

---

## 📁 Files Added/Modified

### New Files
- `backend/src/services/email.service.ts`
- `backend/src/services/otp.service.ts`
- `backend/src/migrations/002_add_otp_table.sql`

### Modified Files
- `backend/src/routes/auth.ts` - Added OTP endpoints
- `backend/package.json` - Added nodemailer & speakeasy
- `backend/.env.example` - Email config variables
- `frontend/src/pages/LoginPage.tsx` - Two-step auth flow
- `frontend/src/services/api.ts` - OTP API methods
- `frontend/src/index.css` - Login UI styles

---

## 🔐 Security Notes

✅ **OTP Tokens**
- Stored in database, NOT in JWT
- Expires after 10 minutes (configurable)
- Automatically cleaned up by cron job

✅ **Attempt Limits**
- Max 3 verification attempts per OTP
- Prevents brute force attacks

✅ **Email Privacy**
- Email not reveal if account exists (security best practice)
- OTP codes are single-use

---

## 🎯 Next Steps

1. **Try the OTP flow** in browser
2. **Check email** for the verification code
3. **Monitor logs** for email delivery status
4. **Test edge cases**:
   - Enter wrong OTP (should fail after 3 attempts)
   - Wait past OTP expiry (should get "expired" message)
   - Request multiple OTPs (previous one should invalidate)

---

## 💡 Future Enhancements

- [ ] SMS OTP as fallback (Twilio integration)
- [ ] OTP resend limit (prevent spam)
- [ ] Recovery codes for account recovery
- [ ] WebAuthn/FIDO2 support
- [ ] Email change verification flow
