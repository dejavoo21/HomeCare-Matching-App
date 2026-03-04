# 🏥 Homecare Matching App

A modern web platform that connects healthcare professionals (nurses, doctors) with clients who need home-based medical care services. The system intelligently matches available professionals with care requests based on location, availability, specialties, and urgency.

---

## 📋 Table of Contents

- [Features](#features)
- [System Architecture](#system-architecture)
- [Directory Structure](#directory-structure)
- [Quick Start](#quick-start)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)
- [API Endpoints](#api-endpoints)
- [Demo Credentials](#demo-credentials)
- [Technology Stack](#technology-stack)

---

## ✨ Features

### MVP Features

#### 1. **User Management**
- Role-based authentication (Admin, Nurse, Doctor, Client)
- User registration and login
- Role-specific dashboards

#### 2. **Care Requests** (Client Features)
- Create care requests with:
  - Service type (medication, wound care, vitals, general)
  - Location and address
  - Scheduled date/time
  - Urgency level (LOW, MEDIUM, HIGH, CRITICAL)
  - Optional medication details
- Track request status
- View assigned professional details

#### 3. **Professional Features** (Nurse/Doctor)
- Set availability windows
- Accept/decline care requests
- Track assigned visits
- Update visit status:
  - Assigned → Accepted
  - Accepted → En Route
  - En Route → Completed
- Add completion notes

#### 4. **Intelligent Matching Engine**
Matches professionals based on:
- Geographic location proximity
- Availability match
- Role and specialty match
- Request urgency level
- Professional experience/rating (future)

#### 5. **Admin Dashboard**
- System overview and statistics
- User management (activate/deactivate)
- Professional performance monitoring
- Request allocation and manual assignments
- View all requests and visits

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                          │
│                   (React + Vite + TypeScript)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │Client Portal │  │Professional  │  │Admin Panel   │      │
│  │              │  │Dashboard     │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────────────────────────────────────────────┐
                         ↓ REST API
┌────────────────────────────────────────────────────────────────┐
│                    Backend Layer                               │
│              (Node.js + Express + TypeScript)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │Auth Service  │  │Request Svc   │  │Matching Svc  │         │
│  │              │  │              │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│  ┌──────────────────────────────────────────────────┐         │
│  │  Repository Layer (Data Access)                 │         │
│  └──────────────────────────────────────────────────┘         │
└────────────────────────────────────────────────────────────────┐
                         ↓ Data
┌────────────────────────────────────────────────────────────────┐
│              Data Store (In-Memory / Mock DB)                   │
└────────────────────────────────────────────────────────────────┘
```

---

## 📁 Directory Structure

```
homecare-matching-app/
├── backend/
│   ├── src/
│   │   ├── types/
│   │   │   └── index.ts                 # TypeScript interfaces
│   │   ├── store/
│   │   │   └── index.ts                 # In-memory data store
│   │   ├── repositories/
│   │   │   ├── user.repository.ts
│   │   │   ├── care-request.repository.ts
│   │   │   └── care-visit.repository.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── request.service.ts
│   │   │   ├── visit.service.ts
│   │   │   └── matching.service.ts      # Core matching logic
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── users.ts
│   │   │   ├── requests.ts
│   │   │   ├── visits.ts
│   │   │   └── admin.ts
│   │   ├── middleware/
│   │   │   └── auth.ts                  # JWT middleware
│   │   └── index.ts                     # Main server entry
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── types/
│   │   │   └── index.ts                 # TypeScript interfaces
│   │   ├── services/
│   │   │   └── api.ts                   # HTTP client
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx          # Auth state management
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── RequestCard.tsx
│   │   │   ├── VisitCard.tsx
│   │   │   └── StatCard.tsx
│   │   ├── layouts/
│   │   │   └── DashboardLayout.tsx
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── ClientDashboard.tsx
│   │   │   ├── CreateRequestPage.tsx
│   │   │   ├── ProfessionalDashboard.tsx
│   │   │   └── AdminDashboard.tsx
│   │   ├── App.tsx                      # Main app with routing
│   │   ├── main.tsx                     # Entry point
│   │   ├── index.css                    # Global styles
│   │   └── vite-env.d.ts
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── tsconfig.node.json
│
└── README.md                            # This file
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn
- PostgreSQL 12+ (for Phase 2)

### Installation

#### 0. Database Setup (Phase 2)

**Local Development:**
```bash
# Start PostgreSQL if not running
# macOS/Homebrew:
brew services start postgresql

# Or for Linux/WSL:
sudo service postgresql start

# Connect to PostgreSQL and create database:
psql -U postgres
# Then in psql:
CREATE DATABASE homecare_matching OWNER postgres;
\q
```

**Environment File:**
```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials:
# DATABASE_URL=postgresql://postgres:P@ssw0rd@localhost:5432/homecare_matching
# NODE_ENV=development
```

**Run Migrations:**
```bash
npm run migrate
```

#### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Run database migrations (Phase 2)
npm run migrate

# Start development server (runs on port 6005)
npm run dev

# In another terminal, start the dispatch worker:
npm run worker
```

#### 2. Frontend Setup

```bash
cd frontend

# Create .env file
cp .env.example .env
# Edit .env if needed:
# VITE_API_URL=http://localhost:6005

# Install dependencies
npm install

# Start development server (runs on port 7005)
npm run dev
```

#### 3. Access the Application

- Frontend: http://localhost:7005
- Backend API: http://localhost:6005
- Worker console output: Check second terminal

---

## 🔧 Backend Setup

### Environment Variables

Create `.env` file in backend directory (copy from `.env.example`):
```env
DATABASE_URL=postgresql://postgres:P@ssw0rd@localhost:5432/homecare_matching
NODE_ENV=development
PORT=6005
JWT_SECRET=your_jwt_secret_here
WORKER_POLL_INTERVAL=15000
```

### Database Configuration

**Phase 2 - PostgreSQL Persistence**

The application uses PostgreSQL with automatic migrations. Upon first run:
1. Database schema is automatically created via migration runner
2. Tables include:
   - `users` - User accounts with roles
   - `client_profiles`, `professional_profiles` - Role-specific data
   - `professional_skills`, `professional_credentials` - Qualifications
   - `availability_rules`, `availability_exceptions` - Schedules
   - `care_requests`, `visit_assignments`, `visits` - Care workflow
   - `audit_logs` - Compliance and debugging
   - `notification_outbox` - Reliable async notifications

### Running the Application

**Terminal 1: Start API Server**
```bash
npm run dev
```
Listens on `http://localhost:6005`

**Terminal 2: Start Dispatch Worker**
```bash
npm run worker
```
Automatically:
- Polls for queued care requests every 15 seconds
- Runs matching algorithm to find qualified professionals
- Creates visit offers with 3-minute expiry
- Handles timeouts and requeues failed requests

**Terminal 3: Run Migrations (one-time)**
```bash
npm run migrate
```
Applies pending SQL migrations to database.

### Build for Production
```bash
npm run build
npm start
```

---

## 🎨 Frontend Setup

### Environment Variables
Create `.env` file in frontend directory:
```env
VITE_API_URL=http://localhost:3001
```

### Build for Production
```bash
npm run build
```

Output goes to `dist/` directory.

### Preview Production Build
```bash
npm run preview
```

---

## ☁️ Deployment (Railway)

### Prerequisites
- Railway.app account
- GitHub repository with project code
- PostgreSQL plugin available on Railway

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "GitHub Repo" and connect your repository
4. Railway will auto-detect the Node.js project

### Step 2: Add Database

1. In Railway dashboard, click "Add Plugin"
2. Select PostgreSQL
3. Railway creates `DATABASE_URL` environment variable automatically

### Step 3: Configure Backend Service

In Railway environment variables, set:
```env
NODE_ENV=production
PORT=6005
JWT_SECRET=verysecretsuperlong_production_string
WORKER_POLL_INTERVAL=15000
# DATABASE_URL is auto-populated by Railway PostgreSQL plugin
```

### Step 4: Deploy Worker as Separate Service

Create `Procfile` in backend root:
```
web: npm run migrate && npm start
worker: npm run worker
```

Or in Railway, create two services:
- **API Service**: Command = `npm run migrate && npm start`
- **Worker Service**: Command = `npm run worker`

### Step 5: Update Frontend

In frontend `.env` for Railway:
```env
VITE_API_URL=https://your-project-name-api.railway.app
```

### Step 6: Run Migrations on Railway

Option 1: Run manually via Railway CLI:
```bash
railway link <project-id>
railway run npm run migrate
```

Option 2: Auto-run on first deploy (included in Procfile web command above)

### Production Notes
- SSL is automatically enabled (HTTPS)
- Database pool size configured for Cloud (max 25 connections)
- Notification retries use exponential backoff (5 max attempts)
- Dispatch worker continues across restarts (tracks state in DB)

---

## 📡 API Endpoints

### Authentication (MVP)
```
POST   /auth/register          # Create new user
POST   /auth/login             # Login with credentials
GET    /auth/me                # Get current user (requires token)
```

### Users (MVP)
```
GET    /users                  # Get all users (admin only)
GET    /users/:id              # Get user by ID
GET    /users/role/:role       # Get users by role
PUT    /users/:id              # Update user
```

### Care Requests (MVP)
```
POST   /requests/create        # Create new care request
GET    /requests/client/list   # Get client's requests
GET    /requests/all           # Get all requests (admin only)
GET    /requests/:id           # Get request details
POST   /requests/:id/match     # Find matching professionals
POST   /requests/:id/assign    # Assign professional to request
PUT    /requests/:id/status    # Update request status
```

### Visits (MVP)
```
GET    /visits/professional    # Get visits for current professional
GET    /visits/client          # Get visits for current client
GET    /visits/:id             # Get visit details
POST   /visits/:id/accept      # Accept visit
POST   /visits/:id/en-route    # Mark as en route
POST   /visits/:id/complete    # Mark as completed
```

### Availability Management (Phase 2)
```
GET    /availability/me                    # Get current user's rules & exceptions
POST   /availability/rules                 # Create recurring availability rule
POST   /availability/exceptions            # Create date-specific exception
DELETE /availability/rules/:id             # Delete availability rule
DELETE /availability/exceptions/:id        # Delete availability exception
```

### Matching Engine (Phase 2)
```
POST   /matching/preview                   # Preview candidates for a request (admin)
GET    /matching/:requestId/history        # Get offer history for request
```

### Admin & Dispatch (Phase 2)
```
GET    /admin/queue                        # Get queued/offered care requests
GET    /admin/requests/:id                 # Get request with all offers
POST   /admin/assign                       # Manual professional assignment
GET    /admin/audit-logs                   # View audit logs with filtering
GET    /admin/stats                        # System health & statistics
```

### Legacy Admin (MVP)
```
GET    /admin/dashboard        # Get dashboard statistics
GET    /admin/professionals    # Get all healthcare professionals
GET    /admin/clients          # Get all clients
PUT    /admin/users/:id/deactivate   # Deactivate user
PUT    /admin/users/:id/reactivate   # Reactivate user
```

---

## 👥 Admin Credentials

### Primary Admin Account
- **Email:** onboarding@sochristventures.com
- **Password:** V#4]eBpb)^4PJ,n?
- **Role:** Admin
- **Organization:** Sochrist Ventures

> Additional user accounts must be created through the admin dashboard or API

---

## 🛠️ Technology Stack

### Backend
- **Framework:** Express.js 4.18
- **Language:** TypeScript 5.1
- **Runtime:** Node.js
- **Utilities:** UUID (ID generation)

### Frontend
- **Framework:** React 18.2
- **Build Tool:** Vite 4.4
- **Language:** TypeScript 5.0
- **Routing:** React Router v6
- **Styling:** CSS (no external UI library)

### Development
- **Type Safety:** Full TypeScript support
- **Code Quality:** ESLint configured

---

## 🔄 Data Models

### User
```typescript
- id: string (UUID)
- name: string
- email: string
- role: UserRole (ADMIN | NURSE | DOCTOR | CLIENT)
- location: string
- isActive: boolean
- createdAt: Date
- updatedAt: Date
```

### CareRequest
```typescript
- id: string (UUID)
- clientId: string
- serviceType: ServiceType
- description: string
- address: string
- scheduledDateTime: Date
- urgency: UrgencyLevel
- status: VisitStatus
- assignedProfessionalId?: string
- medication?: string
- createdAt: Date
- updatedAt: Date
```

### CareVisit
```typescript
- id: string (UUID)
- requestId: string
- clientId: string
- professionalId: string
- status: VisitStatus
- scheduledDateTime: Date
- completedDateTime?: Date
- notes?: string
- createdAt: Date
- updatedAt: Date
```

---

## 🧠 Matching Engine Logic (Phase 2)

The matching service performs intelligent matching in two phases:

### Phase 1: Constraint Validation (Hard Rules)
Before scoring, all candidates must pass 4 hard constraints:

1. **Role Match**
   - If request requires doctor-specific services → must be doctor
   - Otherwise → nurse or doctor allowed

2. **Verification Status**
   - CRITICAL urgency requests → require verified professional
   - Other requests → any professional allowed

3. **Availability**
   - Professional must have availability window covering request time
   - Considers recurring rules + date-specific exceptions

4. **Workload Capacity**
   - Professional cannot have > 5 concurrent active visits
   - Tracks real-time visit status from database

**Candidates failing any constraint are eliminated.**

### Phase 2: Scoring (Soft Ranking)
Remaining candidates scored on 5 weighted factors:

| Factor | Weight | Details |
|--------|--------|---------|
| Distance | 20% | Geographic proximity (0-20 pts) |
| Availability Buffer | 25% | How much buffer before/after visit (0-25 pts) |
| Workload | 20% | Lower current load = higher score (0-20 pts) |
| Urgency Boost | 15% | Critical requests boost qualified doctors (0-15 pts) |
| Verification | 10% | Verified professionals get bonus (0-10 pts) |

**Output:** Ranked candidate list with scores, breakdown, and reasoning.

### Automatic Dispatch Workflow

1. **Worker Polls** (every 15 seconds)
   - Fetches care requests with status='queued'
   - Sorted by urgency DESC, created_at ASC
   - Batch processes up to 10 requests

2. **Matching & Offer Creation**
   - Runs matching algorithm
   - Creates `visit_assignment` with top candidate
   - Sets offer_expires_at = NOW() + 3 minutes
   - Updates request status to 'offered'
   - Notifies professional via notification_outbox

3. **Timeout Handling**
   - If offer expires without response, status='offer_expired'
   - Request reverts to 'queued' for next iteration
   - Dispatcher tries next-ranked candidate

4. **Professional Response**
   - Accept → visit_assignments.status='accepted', care_requests.status='assigned'
   - Decline → status='declined', request returns to 'queued'
   - Timeout → status='expired', request returns to 'queued'

### Matching Preview (Admin)

Admins can preview matches before auto-dispatch:
```bash
POST /matching/preview
{
  "requestId": "uuid"
}
```

Returns top 10 candidates with scores and reasoning - useful for:
- Understanding why professionals were ranked this way
- Debugging matching issues
- Manual overrides via `/admin/assign`

---

## 🧠 Matching Engine Logic (MVP - Legacy)

---

## 📈 Feature Status

### MVP - Complete ✅
- [x] User authentication (roles: Admin, Professional, Client)
- [x] In-memory data store with seed data
- [x] Care request creation & tracking
- [x] Basic matching algorithm (location, availability, specialty)
- [x] Admin dashboard with user management
- [x] Role-based dashboards

### Phase 2 - Production Ready ✅
- [x] PostgreSQL persistence with migrations
- [x] Sophisticated two-phase matching (constraints + scoring)
- [x] Automatic dispatch worker with 15-second polling
- [x] Availability management (recurring rules + exceptions)
- [x] Professional verification tracking
- [x] Notification outbox with retry logic & exponential backoff
- [x] Audit logging for compliance
- [x] RBAC (Role-Based Access Control) middleware
- [x] Admin matching preview tool
- [x] Manual assignment override for admins
- [x] Dispatch queue monitoring
- [x] System health & statistics endpoints
- [x] Railway cloud deployment ready

### Phase 3 - Future Enhancements ⏳
- [ ] Real geo-location matching (Google Maps API)
- [ ] Advanced scheduling engine (calendar integration)
- [ ] Payment processing (Stripe integration)
- [ ] Email notifications (nodemailer integration)
- [ ] SMS alerts (Twilio integration)
- [ ] Mobile API (Apple/Android)
- [ ] Rating and review system
- [ ] Real-time tracking (WebSocket)
- [ ] Video consultation support
- [ ] AI-powered predictive matching
- [ ] GDPR/HIPAA compliance audit
- [ ] HL7 medical data standards
- [ ] Multi-language support

---

## 📈 Future Enhancements

### Phase 3 - Enterprise Features
- [ ] GDPR/HIPAA compliance
- [ ] HL7 medical data standards
- [ ] Integration with hospital systems
- [ ] Advanced analytics and reporting
- [ ] AI-powered predictive matching
- [ ] Video consultation support
- [ ] Multi-language support

---

## 🔐 Security Notes

### Current Implementation
- Simple JWT-like tokens (base64 encoded)
- Password hashing (base64, needs bcrypt upgrade)

### Production Recommendations
```bash
npm install bcrypt jsonwebtoken
npm install @types/bcryptjs @types/jsonwebtoken --save-dev
```

Then update:
1. `src/services/auth.service.ts` - Use bcrypt for passwords, real JWT tokens
2. `src/middleware/auth.ts` - Validate JWT properly
3. Add rate limiting on auth routes
4. Add CORS configuration per environment
5. Use HTTPS in production

---

## � Phase 2.5: Real-Time Updates (SSE)

Real-time dashboard updates without page refresh. Uses **Server-Sent Events** (SSE) for instant notifications.

### Features

✅ **Live Offer Countdowns** — Professionals see expiration timers that update every second
✅ **Instant Dashboard Sync** — All dashboards update when status changes
✅ **Connection Status Indicator** — Green/amber/red status badge shows live connection health
✅ **Auto-Reconnect** — Seamlessly handles network interruptions
✅ **Role-Based Filtering** — Clients see their requests, pros see their offers, admins see all

### Quick Test

Start all services (API + Worker + Frontend), then:

1. **Admin Console:** Login as `onboarding@sochristventures.com` with provided password
2. **Create Additional Accounts** — Use admin dashboard to create client and professional accounts
3. **Watch Admin Dashboard** — Create requests and watch real-time updates appear instantly
4. **Test Professional Portal** — Login with created professional account to see offers with countdown timers

See [REALTIME_IMPLEMENTATION.md](./REALTIME_IMPLEMENTATION.md) for full testing guide.

---

## �📝 License

This project is part of the Homecare Matching Platform ecosystem.

---

## 🤝 Contributing

1. Follow the existing code structure
2. Maintain TypeScript strict mode
3. Keep components and services separated
4. Add tests for new features
5. Update this README with significant changes

---

## ✉️ Support

For issues, questions, or feature requests, please open an issue in the repository.

---

**Happy Care Matching! 🏥❤️**
