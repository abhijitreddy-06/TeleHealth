# TeleHealth - Full-Stack Telemedicine Platform

A production-grade telemedicine web application enabling patients to book appointments with doctors, conduct real-time video consultations via WebRTC, receive digital prescriptions, and purchase medications through an integrated pharmacy. Built with Express.js, PostgreSQL, Redis, Socket.IO, and EJS templating.

---

## Table of Contents

1. [Tech Stack & Libraries](#tech-stack--libraries)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [Authentication Flow](#authentication-flow)
5. [Appointment-to-Video-Call Flow](#appointment-to-video-call-flow)
6. [Pharmacy Flow](#pharmacy-flow)
7. [API Endpoints](#api-endpoints)
8. [Real-Time Features](#real-time-features)
9. [Error Handling](#error-handling)
10. [SQL Optimizations](#sql-optimizations)
11. [Cybersecurity](#cybersecurity)
12. [Environment Variables](#environment-variables)
13. [Getting Started](#getting-started)

---

## Tech Stack & Libraries

### Backend

| Library | Version | Purpose |
|---------|---------|---------|
| **express** | ^4.18.2 | Web framework - routing, middleware, request handling |
| **pg** | ^8.11.3 | PostgreSQL client with connection pooling |
| **redis** | ^5.10.0 | In-memory cache for tokens, slot locks, call state |
| **socket.io** | ^4.7.2 | Real-time bidirectional communication (signaling, dashboards) |
| **@socket.io/redis-adapter** | ^8.3.0 | Redis-backed Socket.IO adapter for horizontal scaling |
| **jsonwebtoken** | ^9.0.2 | JWT access and refresh token generation/verification |
| **bcrypt** | ^5.1.1 | Password hashing with salt rounds |
| **helmet** | ^7.1.0 | HTTP security headers (CSP, HSTS, X-Frame-Options) |
| **cors** | ^2.8.5 | Cross-Origin Resource Sharing configuration |
| **express-rate-limit** | ^7.1.5 | Rate limiting on auth and API endpoints |
| **zod** | ^4.3.6 | Runtime schema validation for request payloads |
| **ejs** | ^3.1.9 | Server-side HTML templating for views |
| **pdfkit** | ^0.14.0 | Dynamic PDF generation for prescriptions |
| **multer** | ^1.4.5-lts.1 | Multipart file upload handling with MIME filtering |
| **@supabase/supabase-js** | ^2.39.3 | Cloud file storage for medical records (vault) |
| **winston** | ^3.11.0 | Structured logging to files and console |
| **express-winston** | ^4.2.0 | HTTP request/response logging middleware |
| **compression** | ^1.8.1 | Gzip response compression |
| **cookie-parser** | ^1.4.7 | Parse cookies for JWT token extraction |
| **dotenv** | ^16.3.1 | Load environment variables from `.env` |
| **body-parser** | ^1.20.4 | Parse JSON and URL-encoded request bodies |
| **@emailjs/nodejs** | ^5.0.2 | Email notifications via EmailJS |

### Frontend

| Technology | Purpose |
|-----------|---------|
| **Vanilla JavaScript** | Client-side logic, DOM manipulation, fetch API |
| **WebRTC** | Peer-to-peer video/audio streaming |
| **Socket.IO Client** | Real-time event communication |
| **Font Awesome 6.4** | Icons throughout the UI |
| **Google Fonts (Poppins)** | Typography |

### Infrastructure

| Service | Purpose |
|---------|---------|
| **PostgreSQL** | Primary relational database |
| **Redis** | Caching, token blacklist, slot locking, call state machine |
| **Supabase Storage** | Cloud file storage for medical records |
| **STUN/TURN Servers** | NAT traversal for WebRTC connections |

---

## Architecture

The application follows a **modular MVC architecture** where each feature domain is encapsulated in its own module with dedicated model, service, controller, routes, and schema files.

```
Request Flow:
Client -> Express Middleware -> Route -> Controller -> Service -> Model -> PostgreSQL/Redis
                                                                       -> Supabase (files)
```

**Key architectural decisions:**

- **Three-layer booking protection:** Redis lock (optimistic) -> PostgreSQL advisory lock (pessimistic) -> Partial unique index (constraint)
- **Call State Machine:** Redis-backed FSM tracking video call lifecycle (`scheduled -> waiting -> ongoing -> completed`)
- **Grace period reconnection:** 30-second window for participants to reconnect after disconnection before marking as permanently left
- **Dashboard namespace:** Separate Socket.IO namespace (`/dashboard`) for real-time UI updates without interfering with video signaling
- **Token pair rotation:** Access tokens (15 min) + refresh tokens (7 days) with automatic rotation and Redis blacklisting on logout

---

## Project Structure

```
TeleHealth Production/
├── src/
│   ├── server.js                          # HTTP server + Socket.IO initialization
│   ├── app.js                             # Express app configuration & middleware
│   │
│   ├── config/
│   │   ├── index.js                       # Centralized config exports
│   │   ├── database.js                    # PostgreSQL pool (max 3, SSL, retries)
│   │   ├── redis.js                       # Redis client (auto-reconnect, backoff)
│   │   ├── socket.js                      # Socket.IO transport & timing config
│   │   ├── auth.js                        # JWT secrets & bcrypt settings
│   │   ├── supabase.js                    # Supabase storage client
│   │   └── upload.js                      # Multer file upload settings
│   │
│   ├── middleware/
│   │   ├── auth.js                        # authenticate, authorize, blockAfterLogin
│   │   ├── validation.js                  # Zod validate() + domain constants
│   │   ├── errorHandler.js                # Global error handler + 404 handler
│   │   └── staticPaths.js                 # Static file path utilities
│   │
│   ├── utils/
│   │   ├── AppError.js                    # AppError, AuthError, ValidationError, NotFoundError
│   │   ├── catchAsync.js                  # Async controller wrapper
│   │   ├── logger.js                      # Winston logger (file + console)
│   │   └── escapeHtml.js                  # XSS prevention utility
│   │
│   ├── modules/                           # Feature modules (MVC pattern)
│   │   ├── auth/                          # Registration, login, logout, token refresh
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js
│   │   │   ├── auth.model.js
│   │   │   └── auth.schema.js
│   │   ├── profile/                       # User & doctor profile CRUD
│   │   │   ├── profile.routes.js
│   │   │   ├── profile.controller.js
│   │   │   ├── profile.service.js
│   │   │   ├── profile.model.js
│   │   │   └── profile.schema.js
│   │   ├── appointment/                   # Booking, cancellation, rescheduling
│   │   │   ├── appointment.routes.js
│   │   │   ├── appointment.controller.js
│   │   │   ├── appointment.service.js
│   │   │   ├── appointment.model.js
│   │   │   └── appointment.schema.js
│   │   ├── schedule/                      # Doctor schedules, overrides, slot management
│   │   │   ├── schedule.routes.js
│   │   │   ├── schedule.controller.js
│   │   │   ├── schedule.service.js
│   │   │   ├── schedule.model.js
│   │   │   └── schedule.schema.js
│   │   ├── video/                         # WebRTC signaling, call state machine
│   │   │   ├── video.routes.js
│   │   │   ├── video.controller.js
│   │   │   ├── video.service.js
│   │   │   ├── video.model.js
│   │   │   ├── video.schema.js
│   │   │   ├── video.socket.js            # Socket.IO event handlers
│   │   │   └── video.statemachine.js      # Redis-backed call FSM
│   │   ├── pharmacy/                      # Products, cart, orders, reviews, wishlist
│   │   │   ├── pharmacy.routes.js
│   │   │   ├── pharmacy.controller.js
│   │   │   ├── pharmacy.service.js
│   │   │   ├── pharmacy.model.js
│   │   │   └── pharmacy.schema.js
│   │   ├── admin/                         # Admin dashboard, user/doctor management
│   │   │   ├── admin.routes.js
│   │   │   ├── admin.controller.js
│   │   │   ├── admin.service.js
│   │   │   ├── admin.model.js
│   │   │   └── admin.schema.js
│   │   ├── vault/                         # Medical records file storage
│   │   │   ├── vault.routes.js
│   │   │   ├── vault.controller.js
│   │   │   ├── vault.service.js
│   │   │   ├── vault.model.js
│   │   │   └── vault.schema.js
│   │   └── ai/                            # AI symptom prediction
│   │       └── ai.model.js
│   │
│   └── routes/                            # Cross-cutting & legacy route files
│       ├── index.js                       # Main route aggregator
│       ├── public.routes.js               # Unauthenticated pages
│       ├── protected.routes.js            # Authenticated page renders
│       ├── ai.routes.js                   # AI prediction endpoints
│       └── prescription.routes.js         # Prescription PDF download
│
├── public/                                # Static frontend assets
│   ├── pages/                             # HTML pages (user_home, appointments, etc.)
│   ├── css/                               # Stylesheets (shared.css)
│   ├── js/                                # Client-side JavaScript (shared.js, config.js)
│   └── images/                            # Static images & icons
│
├── views/                                 # EJS templates (server-side rendered)
│   ├── doc_video.ejs                      # Doctor video call interface
│   ├── user_video.ejs                     # Patient video call interface
│   ├── doc_video_dashboard.ejs            # Doctor appointment dashboard
│   ├── user_video_dashboard.ejs           # Patient appointment dashboard
│   ├── predict.ejs                        # AI symptom checker
│   ├── pharmacy.ejs                       # Pharmacy shop pages
│   └── ...                                # Profile, checkout, orders, etc.
│
├── sql/                                   # Database schema & seeds
│   └── pharmacy/
│       ├── 01_schema.sql                  # Pharmacy tables, triggers, indexes
│       └── 02_categories.sql              # Category seed data
│
├── logs/                                  # Runtime logs (gitignored)
├── temp_uploads/                          # Temporary file uploads (auto-cleaned)
├── disease-predictor/                     # AI model service
└── package.json
```

---

## Authentication Flow

### Registration
1. User/Doctor submits signup form with name, email, password
2. **Zod schema** validates input (email format, password length >= 8)
3. Password is hashed with **bcrypt** (10 salt rounds)
4. User row is inserted into PostgreSQL `users` table with role (`user` or `doctor`)
5. On success, redirect to login page

### Login
1. User submits email + password
2. Server looks up user by email, verifies password with `bcrypt.compare()`
3. Generates **JWT access token** (15 min expiry) and **refresh token** (7 days expiry)
4. Refresh token is stored in PostgreSQL `refresh_tokens` table
5. Both tokens are set as **httpOnly, secure, SameSite=Strict cookies**
6. Redirect to role-based home page (`/user_home`, `/doc_home`, `/admin/dashboard`)

### Token Refresh
1. When access token expires, the `authenticate` middleware detects it
2. If a valid refresh token exists in cookies, it calls `handleRefreshToken()`
3. Refresh token is verified against the database (not revoked, not expired)
4. Old refresh token is **revoked** (single-use rotation)
5. New access + refresh token pair is issued
6. If refresh token is also invalid, user is redirected to login

### Logout
1. Access token is added to Redis **blacklist** (TTL = remaining token lifetime)
2. Refresh token is **revoked** in PostgreSQL
3. Both cookies are cleared with `clearAuthCookies()`
4. Redirect to role-based login page

### Role-Based Access Control (RBAC)
- `authenticate` middleware: Verifies JWT, attaches `req.user = { id, role, name }`
- `authorize(...roles)` middleware: Checks `req.user.role` against allowed roles
- Three roles: `user` (patient), `doctor`, `admin`
- `blockAfterLogin` middleware: Prevents authenticated users from accessing login/signup pages

### Hourly Token Cleanup
- A scheduled job runs every 60 minutes via `cleanupExpiredTokens()`
- Deletes refresh tokens older than 30 days
- Deletes revoked refresh tokens older than 7 days

---

## Appointment-to-Video-Call Flow

### 1. Doctor Sets Schedule
- Doctor configures weekly availability via `/doc_schedule` (day, start time, end time)
- Can add overrides for specific dates (unavailable, custom hours)
- Schedule stored in `doctor_schedules` and `schedule_overrides` tables

### 2. Patient Books Appointment
1. Patient visits `/appointments` and selects a doctor from the available list
2. Selects a date on the calendar (must be at least 24 hours in advance)
3. Backend generates 30-minute slots from the doctor's schedule, filtering:
   - Slots within the 24-hour advance booking window (hidden)
   - Booked slots (from DB, shown as "booked")
   - Locked slots (from Redis, shown as "locked")
4. Patient clicks an available slot -> **Redis lock** acquired (`SET NX`, 5 min TTL)
   - Returns a `lockToken` for ownership verification
   - Other patients see the slot as "locked"
5. Patient confirms booking -> Three-layer protection:
   - **Layer 1:** Verify Redis lock ownership via `lockToken`
   - **Layer 2:** PostgreSQL advisory lock on `doctor_id + date` prevents concurrent inserts
   - **Layer 3:** Partial unique index catches any remaining race condition
6. Appointment created with status `scheduled`, unique `room_id` generated
7. Redis lock deleted, doctor cache invalidated

### 3. Doctor Starts Call
1. Doctor views appointments on `/doc_video_dashboard`
2. Clicks "Start Call" -> `POST /appointments/:id/start` updates status to `started`
3. Doctor is redirected to `/doc_video/:roomId`

### 4. Patient Joins Call
1. Patient sees updated status on `/user_video_dashboard` (via Socket.IO real-time update)
2. Clicks "Join Call" -> `GET /user/join-call/:appointmentId`
3. Patient is redirected to `/user_video/:roomId`

### 5. WebRTC Video Call
1. Both participants join the Socket.IO room via `join-room` event
2. Server validates user authorization for the room against the appointment record
3. **Call State Machine** transitions: `scheduled -> waiting -> ongoing`
4. WebRTC signaling occurs via Socket.IO:
   - Doctor creates SDP offer -> sends via `signal` event
   - Patient receives offer, creates SDP answer -> sends back
   - ICE candidates exchanged bidirectionally
5. Peer-to-peer video/audio stream established
6. Grace period (30s) handles temporary disconnections

### 6. Doctor Ends Call
1. Doctor writes consultation notes in the side panel
2. Clicks "End Call" -> `doctor-end-call` socket event
3. Server:
   - Saves prescription to database via `endCallWithPrescription()`
   - Records call metadata (duration, start/end time, disconnect reason)
   - Transitions state machine to `completed`
   - Generates downloadable PDF prescription via PDFKit
   - Emits `call-ended-by-doctor` and `prescription-ready` to patient
4. Patient is redirected to dashboard, can download prescription PDF

---

## Pharmacy Flow

### Browsing
1. Patient visits `/pharmacy` - products loaded from `pharmacy_products` joined with `pharmacy_inventory`
2. Products displayed with name, price, image, stock status, average rating
3. Category filtering and search available
4. Product detail page (`/pharmacy/product/:slug`) shows full info + reviews

### Cart
1. `POST /api/pharmacy/cart/add` - Adds product to cart (creates cart if none active)
2. `PUT /api/pharmacy/cart/update` - Updates item quantity
3. `DELETE /api/pharmacy/cart/remove/:productId` - Removes item from cart
4. `GET /api/pharmacy/cart` - Returns cart with items, quantities, and prices

### Checkout & Orders
1. Patient visits `/pharmacy/checkout` with cart summary
2. Enters shipping address and payment details
3. `POST /api/pharmacy/orders` - Creates order within a transaction:
   - Validates stock availability for all items
   - Decrements inventory (trigger: `trg_decrement_inventory`)
   - Converts cart status to `converted`
   - Generates order number (`PH-YYYYMMDD-XXXX` via trigger)
4. Order statuses: `pending -> confirmed -> shipped -> delivered` (or `cancelled`)
5. On cancellation, inventory is restored (trigger: `trg_restore_inventory`)

### Reviews
- `POST /api/pharmacy/reviews` - Submit review (rating 1-5, title, comment)
- Product `avg_rating` and `review_count` auto-updated via database trigger
- `is_verified` flag set if user has purchased the product

### Wishlist
- `POST /api/pharmacy/wishlist/toggle` - Add/remove product from wishlist
- `GET /api/pharmacy/wishlist` - Retrieve wishlist items

---

## API Endpoints

### Authentication (6 endpoints)

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| POST | `/user_signup` | No | Register new patient account |
| POST | `/user_login` | No | Patient login, returns JWT cookies |
| POST | `/doc_signup` | No | Register new doctor account |
| POST | `/doc_login` | No | Doctor login, returns JWT cookies |
| GET | `/logout` | No | Clear auth cookies, revoke tokens |
| POST | `/api/refresh-token` | No | Rotate access + refresh tokens |

### Public Pages (8 endpoints)

| Method | Path | Middleware | Description |
|--------|------|:----------:|-------------|
| GET | `/` | blockAfterLogin | Landing page |
| GET | `/role` | blockAfterLogin | Role selection (user/doctor) |
| GET | `/user_login` | blockAfterLogin | Patient login form |
| GET | `/user_signup` | blockAfterLogin | Patient registration form |
| GET | `/doc_login` | blockAfterLogin | Doctor login form |
| GET | `/doc_signup` | blockAfterLogin | Doctor registration form |
| GET | `/services` | blockAfterLogin | Services information page |
| GET | `/contact` | blockAfterLogin | Contact page |

### Protected Pages (6 endpoints)

| Method | Path | Role | Description |
|--------|------|:----:|-------------|
| GET | `/user_home` | user | Patient dashboard |
| GET | `/doc_home` | doctor | Doctor dashboard |
| GET | `/appointments` | user | Appointment booking page |
| GET | `/records` | user | Medical records page |
| GET | `/user_profile_create` | user | Patient profile setup |
| GET | `/doc_profile_create` | doctor | Doctor profile setup |

### Profile Management (8 endpoints)

| Method | Path | Role | Description |
|--------|------|:----:|-------------|
| GET | `/user_profile` | user | View patient profile |
| POST | `/user_profile` | user | Create patient profile |
| GET | `/user_profile/edit` | user | Edit patient profile form |
| POST | `/user_profile/edit` | user | Update patient profile |
| GET | `/doc_profile` | doctor | View doctor profile |
| POST | `/doc_profile` | doctor | Create doctor profile |
| GET | `/doc_profile/edit` | doctor | Edit doctor profile form |
| POST | `/doc_profile/edit` | doctor | Update doctor profile |

### Appointments (12 endpoints)

| Method | Path | Role | Description |
|--------|------|:----:|-------------|
| POST | `/appointments/book` | user | Book appointment (3-layer protection) |
| GET | `/api/appointments/user` | user | Get patient's appointments |
| GET | `/api/appointments/doctor` | doctor | Get doctor's appointments |
| GET | `/api/doctors` | user | List available doctors |
| POST | `/appointments/:id/complete` | doctor | Mark appointment completed |
| GET | `/api/appointments/:id/status` | any | Get appointment status |
| GET | `/api/appointments/recent-prescription` | user | Get latest completed appointment |
| POST | `/api/appointments/:id/cancel` | any | Cancel appointment (2hr cutoff) |
| GET | `/api/appointments/cancelled` | any | List cancelled appointments |
| POST | `/api/appointments/:id/reschedule` | user | Reschedule appointment |
| GET | `/api/appointments/upcoming` | any | Upcoming appointments (paginated) |
| GET | `/api/appointments/history` | any | Past appointments (paginated) |

### Schedule Management (9 endpoints)

| Method | Path | Role | Description |
|--------|------|:----:|-------------|
| GET | `/doc_schedule` | doctor | Schedule management page |
| GET | `/api/schedule/my` | doctor | Get doctor's weekly schedule + overrides |
| PUT | `/api/schedule/my` | doctor | Replace weekly schedule |
| POST | `/api/schedule/override` | doctor | Add date override (holiday/custom hours) |
| DELETE | `/api/schedule/override/:id` | doctor | Remove date override |
| GET | `/api/slots` | user | Get available time slots for doctor + date |
| GET | `/api/doctors/available` | user | List doctors with active schedules |
| POST | `/api/slots/lock` | user | Lock a slot (Redis SET NX, 5 min TTL) |
| POST | `/api/slots/unlock` | user | Release a locked slot |

### Video Calls (8 endpoints)

| Method | Path | Role | Description |
|--------|------|:----:|-------------|
| GET | `/user_video/:roomId` | user | Patient video call room |
| GET | `/doc_video/:roomId` | doctor | Doctor video call room |
| GET | `/doc_video_dashboard` | doctor | Doctor's appointment dashboard |
| GET | `/user_video_dashboard` | user | Patient's appointment dashboard |
| POST | `/appointments/:appointmentId/start` | doctor | Start video call session |
| POST | `/doc/start-call/:appointmentId` | doctor | Doctor initiates call |
| GET | `/user/join-call/:appointmentId` | user | Patient joins call |
| POST | `/api/notes/save` | doctor | Save consultation notes |

### Prescriptions (1 endpoint)

| Method | Path | Role | Description |
|--------|------|:----:|-------------|
| GET | `/api/prescription/download/:roomId` | any | Download prescription PDF |

### AI Prediction (2 endpoints)

| Method | Path | Role | Description |
|--------|------|:----:|-------------|
| GET | `/predict` | any | AI symptom checker page |
| POST | `/api/ai/precheck` | any | Submit symptoms for AI prediction |

### Medical Vault (5 endpoints)

| Method | Path | Role | Description |
|--------|------|:----:|-------------|
| POST | `/vault/upload` | user | Upload medical file to Supabase |
| GET | `/api/vault/user` | user | List user's vault files |
| GET | `/vault/file/:id` | any | Access/view vault file |
| GET | `/api/vault/download/:id` | any | Download vault file |
| DELETE | `/api/vault/:id` | user | Delete vault file |

### Pharmacy - Public (4 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/pharmacy/categories` | List all product categories |
| GET | `/api/pharmacy/products` | List products (with filters) |
| GET | `/api/pharmacy/products/:slug` | Get product details by slug |
| GET | `/api/pharmacy/reviews/:productId` | Get product reviews |

### Pharmacy - Pages (7 endpoints)

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| GET | `/pharmacy` | No | Shop main page |
| GET | `/pharmacy/product/:slug` | No | Product detail page |
| GET | `/pharmacy/cart` | Yes | Shopping cart page |
| GET | `/pharmacy/checkout` | Yes | Checkout page |
| GET | `/pharmacy/orders` | Yes | Order history page |
| GET | `/pharmacy/orders/:id` | Yes | Order detail page |
| GET | `/pharmacy/wishlist` | Yes | Wishlist page |

### Pharmacy - Cart & Orders (10 endpoints)

| Method | Path | Role | Description |
|--------|------|:----:|-------------|
| POST | `/api/pharmacy/cart/add` | user | Add product to cart |
| PUT | `/api/pharmacy/cart/update` | user | Update cart item quantity |
| DELETE | `/api/pharmacy/cart/remove/:productId` | user | Remove item from cart |
| GET | `/api/pharmacy/cart` | user | Get cart contents |
| POST | `/api/pharmacy/orders` | user | Place order (validates stock, creates order) |
| GET | `/api/pharmacy/orders` | user | List user's orders |
| GET | `/api/pharmacy/orders/:id` | user | Get order details |
| POST | `/api/pharmacy/reviews` | user | Submit product review |
| POST | `/api/pharmacy/wishlist/toggle` | user | Toggle wishlist item |
| GET | `/api/pharmacy/wishlist` | user | Get wishlist items |

### Admin (9 endpoints)

| Method | Path | Role | Description |
|--------|------|:----:|-------------|
| GET | `/admin/login` | No | Admin login page |
| POST | `/api/admin/login` | No | Admin authentication |
| GET | `/admin/dashboard` | admin | Admin dashboard page |
| GET | `/api/admin/stats` | admin | Dashboard statistics |
| GET | `/api/admin/doctors` | admin | List all doctors |
| GET | `/api/admin/patients` | admin | List all patients |
| GET | `/api/admin/appointments` | admin | List appointments (filterable) |
| POST | `/api/admin/appointments/:id/override` | admin | Override appointment status |
| GET | `/api/admin/doctors/:id/schedule` | admin | View doctor's schedule |

### Admin - Pharmacy Management (12 endpoints)

| Method | Path | Role | Description |
|--------|------|:----:|-------------|
| GET | `/api/admin/pharmacy/products` | admin | List products (filterable) |
| POST | `/api/admin/pharmacy/products` | admin | Create product |
| PUT | `/api/admin/pharmacy/products/:id` | admin | Update product |
| DELETE | `/api/admin/pharmacy/products/:id` | admin | Delete product |
| PUT | `/api/admin/pharmacy/products/:id/stock` | admin | Update stock level |
| GET | `/api/admin/pharmacy/low-stock` | admin | Low-stock alerts |
| GET | `/api/admin/pharmacy/categories` | admin | List categories |
| POST | `/api/admin/pharmacy/categories` | admin | Create category |
| PUT | `/api/admin/pharmacy/categories/:id` | admin | Update category |
| DELETE | `/api/admin/pharmacy/categories/:id` | admin | Delete category |
| GET | `/api/admin/pharmacy/orders` | admin | List orders (filterable) |
| PUT | `/api/admin/pharmacy/orders/:id/status` | admin | Update order status |

### Health Check (1 endpoint)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Server, database, and Redis health status |

---

## Real-Time Features

### Socket.IO Architecture

**Main Namespace (`/`)** - Video call signaling
- JWT authentication via middleware (cookie or handshake auth token)
- Events: `join-room`, `signal` (SDP/ICE), `mute-state`, `camera-state`, `doctor-end-call`, `disconnect`

**Dashboard Namespace (`/dashboard`)** - Real-time UI updates
- Separate JWT authentication middleware
- Room pattern: `dashboard:{role}:{userId}`
- Events: `appointment-updated` (booking, start, cancel, complete)
- No page reloads - DOM updates in real-time

### WebRTC Flow

```
Doctor                    Server                    Patient
  |                         |                         |
  |--- join-room ---------->|                         |
  |<-- doctor-joined -------|                         |
  |                         |<------- join-room ------|
  |                         |------- user-joined ---->|
  |<-- user-ready ----------|                         |
  |                         |                         |
  |--- signal (offer) ----->|--- signal (offer) ----->|
  |                         |<-- signal (answer) -----|
  |<-- signal (answer) -----|                         |
  |                         |                         |
  |--- signal (ICE) ------->|--- signal (ICE) ------->|
  |<-- signal (ICE) --------|<-- signal (ICE) --------|
  |                         |                         |
  |  [P2P Video/Audio Stream Established]             |
  |                         |                         |
  |--- doctor-end-call ---->|-- call-ended-by-doctor->|
  |<- call-ended-confirmed -|-- prescription-ready -->|
```

### Call State Machine

Redis-backed finite state machine tracking call lifecycle:

```
scheduled -> waiting -> ongoing -> completed
```

- **scheduled**: Appointment booked, no one in room
- **waiting**: One participant has joined, waiting for other
- **ongoing**: Both participants present, call active
- **completed**: Call ended by doctor, prescription saved

State is stored in Redis with 2-hour TTL. Falls back to PostgreSQL appointment status if Redis is unavailable.

### Grace Period Reconnection

When a participant disconnects (network issue, page refresh):
1. Server starts 30-second grace timer
2. Other participant receives `participant-disconnected` with `grace: true`
3. If disconnected user reconnects within 30s:
   - Grace timer is cleared
   - `participant-reconnected` event emitted
   - Call continues seamlessly
4. If grace period expires:
   - `participant-left` event with `permanent: true`
   - Call session updated with disconnect reason

---

## Error Handling

### Error Class Hierarchy

```
AppError (base)           - status: 500, isOperational: true
├── AuthError             - status: 401
├── ValidationError       - status: 400
└── NotFoundError         - status: 404
```

All custom errors have `isOperational = true`, distinguishing them from unexpected programmer errors.

### catchAsync Wrapper

Every async controller is wrapped with `catchAsync()`:

```javascript
const getUser = catchAsync(async (req, res, next) => {
    const user = await UserService.findById(req.params.id);
    res.json(user);
});
// Any thrown error automatically passed to next() -> global error handler
```

### Global Error Handler

Located in `src/middleware/errorHandler.js`:

1. **Logging**: 5xx errors logged at `error` level, 4xx at `warn` level
2. **Multer errors**: Converted to 400 with user-friendly message
3. **JWT errors**: `JsonWebTokenError` -> 401, `TokenExpiredError` -> 401
4. **API requests**: Return JSON `{ success: false, error: message }`
5. **Page requests**: Return JSON error response
6. **Development mode**: Stack traces included in response
7. **Production mode**: Generic "Internal server error" for 500s

### 404 Handler

Unmatched routes are caught by `notFoundHandler`, which:
- Logs the 404 request path
- Serves `public/pages/404.html`

### Logging Strategy

Winston logger writes to:
- `logs/error.log` - Error-level events only
- `logs/combined.log` - All log levels
- Console (development only) - Colorized, simple format

---

## SQL Optimizations

### Advisory Locks

PostgreSQL advisory locks prevent double-booking race conditions:

```sql
SELECT pg_advisory_xact_lock(hashtext($1 || '-' || $2))
```

- Scoped to transaction (`xact_lock`) - auto-released on COMMIT/ROLLBACK
- Lock key: hash of `doctorId-date` string
- Prevents two concurrent requests from booking the same slot

### Three-Layer Booking Protection

1. **Redis Lock (Optimistic)**: `SET NX` with 5-minute TTL - fast, prevents most conflicts
2. **Advisory Lock (Pessimistic)**: Transaction-scoped - serializes concurrent requests
3. **Partial Unique Index (Constraint)**: Final defense against any remaining race

```sql
CREATE UNIQUE INDEX idx_unique_active_appointment
ON appointments (doctor_id, appointment_date, appointment_time)
WHERE status NOT IN ('cancelled', 'completed');
```

### Database Triggers

Pharmacy module uses PostgreSQL triggers for data integrity:

- **`trg_generate_order_number`**: Auto-generates order numbers (`PH-YYYYMMDD-XXXX`)
- **`trg_update_timestamps`**: Auto-updates `updated_at` columns on all tables
- **`trg_decrement_inventory`**: Decreases stock when order is confirmed
- **`trg_restore_inventory`**: Restores stock when order is cancelled
- **`trg_update_product_rating`**: Recalculates `avg_rating` and `review_count` on review insert/update/delete

### Parameterized Queries

All database queries use parameterized placeholders (`$1`, `$2`, etc.) via the `pg` library, preventing SQL injection at the driver level:

```javascript
const result = await client.query(
    'SELECT * FROM appointments WHERE doctor_id = $1 AND appointment_date = $2',
    [doctorId, date]
);
```

### Connection Pool Configuration

```javascript
{
    max: 3,                    // Maximum connections
    idleTimeoutMillis: 30000,  // Close idle connections after 30s
    connectionTimeoutMillis: 10000, // Fail after 10s if can't connect
    keepAlive: true,           // TCP keep-alive enabled
    keepAliveInitialDelayMillis: 10000
}
```

Transient error handling: Auto-recovers from `ECONNRESET`, `ETIMEDOUT`, `EPIPE`, `ECONNREFUSED`, and PostgreSQL error codes `57P01`, `57P03`.

---

## Cybersecurity

### HTTP Security Headers (Helmet)

```javascript
helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "cdn.socket.io",
                        "cdn.jsdelivr.net", "cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com",
                       "cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "*.supabase.co", "images.unsplash.com"],
            connectSrc: ["'self'", "wss:", "ws:", "*.supabase.co"],
            frameSrc: ["'self'", "google.com"],
            frameAncestors: ["'none'"]
        }
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
    xssFilter: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
})
```

### CORS Configuration

```javascript
{
    origin: ['https://production-domain.com'],  // Strict whitelist
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,  // Allow cookies
    maxAge: 600         // Preflight cache: 10 minutes
}
```

### Rate Limiting

| Scope | Window | Max Requests | Applied To |
|-------|--------|:------------:|------------|
| Auth | 15 min | 20 | `/user_signup`, `/user_login`, `/doc_signup`, `/doc_login`, `/api/refresh-token` |
| API | 15 min | 100 | `/api/appointments/`, `/api/ai/`, `/api/pharmacy/` |

### Password Security

- **bcrypt** with 10 salt rounds
- Passwords never stored in plain text
- Minimum 8 character requirement enforced by Zod schema validation

### JWT Token Security

- **Access token**: 15-minute expiry, stored in httpOnly cookie
- **Refresh token**: 7-day expiry, stored in httpOnly cookie, tracked in database
- **Cookie flags**: `httpOnly`, `secure` (production), `SameSite: Strict`, `path: /`
- **Token rotation**: Refresh tokens are single-use (revoked after each rotation)
- **Blacklisting**: Logged-out access tokens are blacklisted in Redis until expiry
- **Socket auth**: JWT verified on every Socket.IO connection, not just page load

### Input Validation

- **Zod schemas** on all API endpoints validate type, format, and constraints
- **Server-side validation** for email format, phone regex, blood groups, genders, record types
- **File upload validation**: MIME type whitelist + extension whitelist + 10MB size limit
- **HTML escaping**: `escapeHtml()` utility prevents XSS in server-rendered content

### SQL Injection Prevention

- All queries use **parameterized placeholders** (`$1`, `$2`) via the `pg` library
- No string concatenation or template literals in SQL queries
- Advisory lock keys are hashed via `hashtext()` PostgreSQL function

### XSS Prevention

- **Helmet CSP** restricts script sources to self + trusted CDNs
- **`escapeHtml()`** utility for server-side template rendering
- **Frontend `escapeHtml()`** function creates text nodes via `document.createElement('div').textContent`
- `X-Content-Type-Options: nosniff` prevents MIME type sniffing

### Additional Security Measures

- **Trust proxy**: Configured per environment for accurate IP detection behind load balancers
- **Request body limits**: 1MB max for JSON and URL-encoded payloads
- **File cleanup**: Uploaded files automatically deleted after response is sent
- **Graceful shutdown**: SIGINT/SIGTERM handlers ensure clean connection closure
- **Token cleanup**: Hourly job purges expired/revoked tokens from the database
- **Advisory lock timeout**: Prevents indefinite blocking on concurrent booking attempts

---

## Environment Variables

```bash
# Server
PORT=10000                          # Server listen port
NODE_ENV=development                # development | production
FRONTEND_URL=https://yourdomain.com # Allowed CORS origin

# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Authentication
ACCESS_TOKEN_SECRET=<secret>        # JWT signing secret (access tokens)
REFRESH_TOKEN_SECRET=<secret>       # JWT signing secret (refresh tokens)
ACCESS_TOKEN_EXPIRE_MINUTES=15      # Access token TTL (default: 15)
REFRESH_TOKEN_EXPIRE_DAYS=7         # Refresh token TTL (default: 7)

# Redis (optional - app works without it)
REDIS_URL=redis://localhost:6379

# Supabase (file storage)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=<service-role-key>

# Email (optional)
EMAILJS_SERVICE_ID=<service-id>
```

---

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL database
- Redis instance (optional but recommended)
- Supabase project (for file storage)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd "TeleHealth Production"

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
psql $DATABASE_URL < sql/pharmacy/01_schema.sql
psql $DATABASE_URL < sql/pharmacy/02_categories.sql

# Start development server
npm run dev

# Start production server
npm start
```

### Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `node --dns-result-order=ipv4first src/server.js` | Production server |
| `dev` | `nodemon src/server.js` | Development with auto-reload |
| `prod` | `NODE_ENV=production node src/server.js` | Explicit production mode |

---

Built by [Abhijit Reddy](https://abhijitreddy-portfolio.netlify.app/)
