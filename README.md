# 🏥 TeleHealth - Modern Telemedicine Platform

> **Production-Grade Full-Stack Healthcare System** | Next.js 16 + Express.js + PostgreSQL + WebRTC

A comprehensive telemedicine platform enabling patients to book appointments with doctors, conduct real-time high-definition video consultations via WebRTC, receive digital prescriptions, and purchase medications through an integrated pharmacy system. Built with modern cloud-native architecture, race-condition-safe booking, and real-time features powered by Socket.IO and Redis.

**Key Features:**
- ✅ Secure role-based authentication (Patient, Doctor, Admin)
- ✅ 24/7 online video consultations with WebRTC
- ✅ Race-condition protected appointment booking (3-layer protection)
- ✅ Full-screen responsive video UI with dark/light theme
- ✅ Complete pharmacy system (products, cart, orders, reviews)
- ✅ Medical records vault (Supabase cloud storage)
- ✅ AI symptom prediction (Clinical BERT model)
- ✅ Admin dashboard with real-time stats
- ✅ Digital prescriptions (PDF generation)
- ✅ Doctor schedule management with overrides
- ✅ Real-time appointment updates via Socket.IO

---

## 📋 Table of Contents

1. [Tech Stack & Architecture](#tech-stack--architecture)
2. [System Design & Optimizations](#system-design--optimizations)
3. [Project Structure](#project-structure)
4. [Database Schema](#database-schema)
5. [Business Logic Flows](#business-logic-flows)
6. [Authentication & Authorization](#authentication--authorization)
7. [API Endpoints](#api-endpoints)
8. [Real-Time Features](#real-time-features)
9. [Error Handling](#error-handling)
10. [Environment Variables](#environment-variables)
11. [Getting Started](#getting-started)

## 🗄️ Database Schema (PostgreSQL)

### Core Identity & Authentication

**`users`** - All system users (patient, doctor, admin)
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,           -- bcrypt hashed (10 rounds)
  role VARCHAR(20) NOT NULL,                -- 'user' | 'doctor' | 'admin'
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**`refresh_tokens`** - JWT token rotation & revocation tracking
```sql
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  role VARCHAR(20) NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- Index: (user_id) for quick token lookup on login/refresh
```

---

### User Profiles

**`user_profile`** - Patient profile information (1:1 with users role='user')
```sql
CREATE TABLE user_profile (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  gender VARCHAR(50),
  custom_gender VARCHAR(100),
  date_of_birth DATE,
  weight_kg NUMERIC(5,2),
  height_cm NUMERIC(5,1),
  blood_group VARCHAR(10),
  allergies TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**`doc_profile`** - Doctor profile information (1:1 with users role='doctor')
```sql
CREATE TABLE doc_profile (
  id SERIAL PRIMARY KEY,
  doc_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  specialization VARCHAR(255),
  experience_years INT,
  qualification VARCHAR(500),
  hospital_name VARCHAR(255),
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### Appointments & Scheduling

**`appointments`** - Core appointment booking & video call records
```sql
CREATE TABLE appointments (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  doctor_id INT NOT NULL REFERENCES users(id),
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status VARCHAR(50) NOT NULL,              -- 'scheduled'|'started'|'completed'|'cancelled'|'approved'
  room_id UUID UNIQUE,                      -- WebRTC room identifier
  symptoms TEXT,
  records_allowed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancelled_by VARCHAR(50),
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_active_appointment UNIQUE (doctor_id, appointment_date, appointment_time)
    WHERE status NOT IN ('cancelled', 'completed')
);

CREATE INDEX idx_appointments_user ON appointments(user_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
```

**`doctor_schedules`** - Weekly working hours for doctors
```sql
CREATE TABLE doctor_schedules (
  id SERIAL PRIMARY KEY,
  doctor_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL,                 -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_day CHECK (day_of_week BETWEEN 0 AND 6)
);

CREATE INDEX idx_doctor_schedules ON doctor_schedules(doctor_id, day_of_week);
```

**`schedule_overrides`** - Exceptions to regular schedule (holidays, custom hours)
```sql
CREATE TABLE schedule_overrides (
  id SERIAL PRIMARY KEY,
  doctor_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  override_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_override UNIQUE (doctor_id, override_date)
);

CREATE INDEX idx_schedule_overrides ON schedule_overrides(doctor_id, override_date);
```

---

### Video Calls & Consultation Notes

**`doctor_notes`** - Prescription notes & consultation records per video call
```sql
CREATE TABLE doctor_notes (
  id SERIAL PRIMARY KEY,
  room_id UUID UNIQUE NOT NULL,              -- Links to appointment.room_id
  appointment_id INT NOT NULL REFERENCES appointments(id),
  doctor_id INT NOT NULL REFERENCES users(id),
  notes TEXT,                                -- Prescription details
  sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_doctor_notes_appointment ON doctor_notes(appointment_id);
CREATE INDEX idx_doctor_notes_doctor ON doctor_notes(doctor_id);
```

---

### Medical Records (Vault)

**`medical_records`** - Patient-uploaded medical documents stored in Supabase
```sql
CREATE TABLE medical_records (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,                   -- Supabase CDN URL
  record_type VARCHAR(100),                  -- 'prescription'|'lab_test'|'report'|'xray'|etc.
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_medical_records_user ON medical_records(user_id);
CREATE INDEX idx_medical_records_type ON medical_records(record_type);
```

---

### AI Predictions

**`ai_prechecks`** - Symptom precheck results from Clinical BERT model
```sql
CREATE TABLE ai_prechecks (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symptoms TEXT NOT NULL,                    -- Comma-separated symptom list
  ai_response JSONB,                         -- Clinical BERT output (disease predictions)
  severity VARCHAR(50),                      -- 'low'|'medium'|'high'
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ai_prechecks_user ON ai_prechecks(user_id);
```

---

### Pharmacy - Products & Inventory

**`pharmacy_categories`** - Product categories (Medicines, Supplements, Devices, etc.)
```sql
CREATE TABLE pharmacy_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(120) UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_category_slug ON pharmacy_categories(slug);
CREATE INDEX idx_category_active ON pharmacy_categories(is_active) WHERE is_active = TRUE;
```

**`pharmacy_products`** - Medicine & health product catalog
```sql
CREATE TABLE pharmacy_products (
  id SERIAL PRIMARY KEY,
  category_id INT NOT NULL REFERENCES pharmacy_categories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(280) UNIQUE NOT NULL,
  description TEXT,
  short_description VARCHAR(500),
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  compare_at_price NUMERIC(10,2),            -- Original/list price
  sku VARCHAR(50) UNIQUE NOT NULL,
  image_url TEXT,
  manufacturer VARCHAR(200),
  dosage_form VARCHAR(100),                  -- 'tablet', 'capsule', 'suspension', etc.
  strength VARCHAR(100),                     -- Dosage amount
  pack_size VARCHAR(100),                    -- '10 tablets', '100ml', etc.
  prescription_required BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  avg_rating NUMERIC(2,1) DEFAULT 0,
  review_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for product discovery & filtering
CREATE INDEX idx_product_category ON pharmacy_products(category_id);
CREATE INDEX idx_product_slug ON pharmacy_products(slug);
CREATE INDEX idx_product_sku ON pharmacy_products(sku);
CREATE INDEX idx_product_active ON pharmacy_products(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_product_price ON pharmacy_products(price);
CREATE INDEX idx_product_prescription ON pharmacy_products(prescription_required);
CREATE INDEX idx_product_rating ON pharmacy_products(avg_rating DESC);
CREATE INDEX idx_product_search ON pharmacy_products USING GIN (
  to_tsvector('english', name || ' ' || description)
);
```

**`pharmacy_inventory`** - Stock levels and reorder info (1:1 with products)
```sql
CREATE TABLE pharmacy_inventory (
  id SERIAL PRIMARY KEY,
  product_id INT UNIQUE NOT NULL REFERENCES pharmacy_products(id) ON DELETE CASCADE,
  stock_quantity INT DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold INT DEFAULT 10,
  reorder_quantity INT DEFAULT 50,
  last_restocked TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_inventory_product ON pharmacy_inventory(product_id);
CREATE INDEX idx_inventory_low_stock ON pharmacy_inventory(product_id) 
  WHERE stock_quantity < low_stock_threshold;
```

---

### Pharmacy - Shopping Cart & Orders

**`pharmacy_carts`** - Shopping carts (one active per user)
```sql
CREATE TABLE pharmacy_carts (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'active',       -- 'active'|'converted'|'abandoned'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fast lookup of active cart
CREATE INDEX idx_cart_user_active ON pharmacy_carts(user_id) 
  WHERE status = 'active';
```

**`pharmacy_cart_items`** - Line items in shopping cart
```sql
CREATE TABLE pharmacy_cart_items (
  id SERIAL PRIMARY KEY,
  cart_id INT NOT NULL REFERENCES pharmacy_carts(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES pharmacy_products(id) ON DELETE CASCADE,
  quantity INT NOT NULL CHECK (quantity BETWEEN 1 AND 50),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_cart_product UNIQUE (cart_id, product_id)
);

CREATE INDEX idx_cart_items_cart ON pharmacy_cart_items(cart_id);
```

**`pharmacy_orders`** - Purchase orders with payment & shipping info
```sql
CREATE TABLE pharmacy_orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(20) UNIQUE NOT NULL,  -- Format: PH-YYYYMMDD-XXXX (auto-generated)
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
                                             -- 'pending'|'confirmed'|'processing'|
                                             -- 'shipped'|'delivered'|'cancelled'|'returned'
  subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  discount_amount NUMERIC(10,2) DEFAULT 0,
  shipping_fee NUMERIC(10,2) DEFAULT 0,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  
  shipping_name VARCHAR(255),
  shipping_phone VARCHAR(20),
  shipping_address VARCHAR(500),
  shipping_city VARCHAR(100),
  shipping_state VARCHAR(100),
  shipping_pincode VARCHAR(10),
  
  notes TEXT,
  prescription_verified BOOLEAN DEFAULT FALSE,
  cancelled_reason TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for order lookup & filtering
CREATE INDEX idx_order_user ON pharmacy_orders(user_id);
CREATE INDEX idx_order_status ON pharmacy_orders(status);
CREATE INDEX idx_order_number ON pharmacy_orders(order_number);
CREATE INDEX idx_order_created ON pharmacy_orders(created_at DESC);
```

**`pharmacy_order_items`** - Product snapshot at purchase time (preserves pricing)
```sql
CREATE TABLE pharmacy_order_items (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES pharmacy_orders(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES pharmacy_products(id) ON DELETE RESTRICT,
  product_name VARCHAR(255) NOT NULL,       -- Snapshot of name at purchase time
  product_image TEXT,
  quantity INT NOT NULL CHECK (quantity BETWEEN 1 AND 50),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC(10,2) NOT NULL CHECK (total_price >= 0),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_order_items_order ON pharmacy_order_items(order_id);
CREATE INDEX idx_order_items_product ON pharmacy_order_items(product_id);
```

---

### Pharmacy - Reviews & Wishlist

**`pharmacy_reviews`** - Product reviews with verified purchase badge
```sql
CREATE TABLE pharmacy_reviews (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES pharmacy_products(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id INT REFERENCES pharmacy_orders(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title VARCHAR(200),
  comment TEXT,
  is_verified BOOLEAN DEFAULT FALSE,        -- TRUE if user purchased this product
  is_visible BOOLEAN DEFAULT TRUE,           -- Admin can hide reviews
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_review UNIQUE (product_id, user_id)
);

CREATE INDEX idx_review_product ON pharmacy_reviews(product_id);
CREATE INDEX idx_review_user ON pharmacy_reviews(user_id);
CREATE INDEX idx_review_rating ON pharmacy_reviews(rating DESC);
CREATE INDEX idx_review_visible ON pharmacy_reviews(product_id) 
  WHERE is_visible = TRUE;
```

**`pharmacy_wishlist`** - User saved products for later
```sql
CREATE TABLE pharmacy_wishlist (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES pharmacy_products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_wishlist UNIQUE (user_id, product_id)
);

CREATE INDEX idx_wishlist_user ON pharmacy_wishlist(user_id);
CREATE INDEX idx_wishlist_product ON pharmacy_wishlist(product_id);
```

---

### Important Database Features

**Triggers:**
- `set_updated_at()` - Auto-updates `updated_at` on every modification
- `generate_pharmacy_order_number()` - Auto-generates `PH-YYYYMMDD-XXXX` format
- `update_product_rating()` - Recalculates product `avg_rating` on review changes
- `restore_order_inventory()` - Restores `pharmacy_inventory.stock_quantity` on order cancellation

**Stored Procedures:**
- `acquire_advisory_lock()` - Serializes appointments on same (doctorId, date)

**Foreign Key Rules:**
- `ON DELETE CASCADE` - Most user-related data (profiles, records, orders) deleted with user
- `ON DELETE RESTRICT` - Order items prevent product deletion (preserves historical data)
- `ON DELETE SET NULL` - Reviews survive when orders deleted

---

## 🛠️ Tech Stack & Architecture

### Frontend Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 16.1.6 | React framework with App Router, SSR, file-based routing |
| **React** | 19.2.3 | UI library with modern hooks-based components |
| **TypeScript** | 5.x | Type-safe JavaScript with strict checking |
| **TailwindCSS** | 4.x | Utility-first CSS framework with dark/light mode |
| **Socket.IO Client** | 4.8.1 | Real-time bidirectional communication (signaling) |
| **WebRTC API** | Native | Peer-to-peer video/audio streaming (RTCPeerConnection) |
| **shadcn/ui** | Latest | Accessible UI component library (Button, Input, Dialog, etc.) |
| **Lucide React** | 0.577.0 | Beautiful SVG icon library (57 icon set) |
| **Sonner** | 2.0.7 | Toast notifications |
| **Zustand** | 5.0.11 | Lightweight state management (if used) |
| **Date-fns** | 4.1.0 | Date manipulation and formatting |
| **Framer Motion** | 12.36.0 | Animation library (smooth transitions, drawer animations) |

### Backend Stack

| Library | Version | Purpose |
|---------|---------|---------|
| **Express.js** | 4.18.2 | HTTP web framework with middleware support |
| **PostgreSQL** | 12+ | Relational database with ACID transactions, advisory locks, triggers |
| **Redis** | 5.10.0 | In-memory cache for locks, tokens, real-time state |
| **Socket.IO** | 4.7.2 | Real-time event-driven communication (video signaling, dashboards) |
| **@socket.io/redis-adapter** | 8.3.0 | Redis-backed Socket.IO adapter for horizontal scaling |
| **Node.js** | 18+ | JavaScript runtime |
| **JWT (jsonwebtoken)** | 9.0.2 | Token generation and verification |
| **bcrypt** | 5.1.1 | Password hashing (10 salt rounds) |
| **Multer** | 1.4.5 | File upload handling with MIME type filtering |
| **pdfkit** | 0.14.0 | Dynamic PDF generation for prescriptions |
| **@supabase/supabase-js** | 2.39.3 | Cloud storage client (medical records vault) |
| **Zod** | 4.3.6 | Runtime schema validation for request payloads |
| **Winston** | 3.11.0 | Structured logging (file + console output) |
| **Helmet** | 7.1.0 | Security headers (CSP, HSTS, X-Frame-Options) |
| **CORS** | 2.8.5 | Cross-Origin Resource Sharing configuration |
| **express-rate-limit** | 7.1.5 | Rate limiting on auth endpoints (15 req/15 min) |
| **cookie-parser** | 1.4.7 | HTTP cookie parsing for JWT tokens |
| **compression** | 1.8.1 | Gzip response compression (reduces payload by ~70%) |
| **@emailjs/nodejs** | 5.0.2 | Serverless email notifications (appointment reminders) |

### Infrastructure & External Services

| Service | Purpose |
|---------|---------|
| **PostgreSQL** (Cloud) | Primary relational database, transactional consistency |
| **Redis** (Cloud) | High-speed caching, distributed locking, session store |
| **Supabase Storage** | Cloud file storage for medical records (S3-compatible) |
| **Google STUN Servers** | NAT traversal for WebRTC (stun.l.google.com:19302) |
| **TURN Servers** | Optional media relay for restricted networks (not yet integrated) |

---

## 🏗️ System Design & Optimizations

### 1. **Three-Layer Booking Protection** (Race Condition Safety)

Appointment booking is protected by three defense layers to ensure no double-booking occurs even under extreme concurrent request scenarios:

```
Layer 1 (Optimistic):  Redis SET NX - Fast check (5-min TTL)
         ↓
Layer 2 (Pessimistic): PostgreSQL Advisory Lock - Transaction-scoped serialization
         ↓
Layer 3 (Constraint):  Partial Unique Index - Database-level constraint
```

**Layer 1: Redis Optimistic Lock**
```javascript
// src/modules/schedule/schedule.service.js
const lockKey = `appointment:${doctorId}:${date}:${time}`;
const lockToken = generateToken();
await redisClient.set(lockKey, lockToken, 'NX', 'EX', 300); // 5-min TTL
```
- **Advantage:** O(1) lookup, handles 99% of conflicts
- **Limitation:** Unreliable in distributed systems (Redis fail → lock lost)

**Layer 2: PostgreSQL Advisory Lock**
```javascript
// Inside transaction
await client.query(
  "SELECT pg_advisory_xact_lock(hashtext($1 || '-' || $2))",
  [doctorId, appointmentDate]
);
```
- **Advantage:** Transaction-scoped, auto-rollback on failure
- **Serialization:** Serializes concurrent requests on same (doctorId, date)
- **Limitation:** Adds ~5ms latency per transaction

**Layer 3: Partial Unique Index**
```sql
-- Database constraint (executed once at setup)
CREATE UNIQUE INDEX idx_unique_active_appointment
ON appointments (doctor_id, appointment_date, appointment_time)
WHERE status NOT IN ('cancelled', 'completed');
```
- **Advantage:** Final defense against app logic bypass, ACID guarantee
- **Limitation:** Triggers 23505 exception if violated

**Why Three Layers?**
- Layer 1 handles normal load efficiently
- Layer 2 catches race conditions in high concurrency
- Layer 3 catches application logic errors or database corruption

### 2. **Call State Machine** (Redis + PostgreSQL Fallback)

WebRTC calls transition through states stored in Redis with PostgreSQL fallback:

```
scheduled → waiting → ongoing → completed
   ↓         ↓         ↓        ↓
  Redis (2hr TTL) / PostgreSQL appointments.status
```

**State Transitions:**
```javascript
scheduled   // Appointment booked, no one in room
waiting     // One participant joined, waiting for other (grace timer: 30s)
ongoing     // Both participants present, call active
completed   // Call ended by doctor, prescription saved
```

**Benefits:**
- Fast state checks (Redis O(1))
- Atomic update guarantees (PostgreSQL transaction)
- Grace period handling (30s reconnection window)

### 3. **JWT Token Pair Rotation** (Security)

```
Access Token (15 min)  ──→ Expired
       ↓
   Refresh Token (7 days) ──→ Issue new pair + revoke old
       ↓
   Revoke both (logout)
```

**Flow:**
1. User logs in: Generate newAccess + new Refresh
2. Access expires: Use Refresh to get new pair
3. Old Refresh is revoked (single-use rotation)
4. Refresh expires: Force re-login

**Stored In:**
- Cookies: httpOnly, secure, SameSite=Strict (XSS/CSRF protected)
- Database: `refresh_tokens` table tracks revocation + expiry
- Redis: Token blacklist (on logout, TTL = remaining token lifetime)

### 4. **WebRTC Signaling Optimization** (ICE Candidate Queueing)

Problem: ICE candidates arrive before remote SDP is set → addIceCandidate fails silently

**Solution: Candidate Queue**
```javascript
// VideoRoomClient.tsx
const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

// When SDP received
handleSignal(payload) {
  if (payload.sdp.type === 'offer') {
    // Accept offer
    await pc.setRemoteDescription(...);
    
    // Flush pending candidates only after remote SDP set
    await flushPendingIceCandidates();
  } else if (payload.candidate) {
    // Queue candidate if remote SDP not ready
    if (!pc.remoteDescription) {
      pendingIceCandidatesRef.current.push(payload.candidate);
    } else {
      await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
    }
  }
}

flushPendingIceCandidates() {
  for (const candidate of pendingIceCandidatesRef.current) {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }
  pendingIceCandidatesRef.current = [];
}
```

**Benefits:**
- Eliminates "Operation failed" errors
- Maintains signaling state consistency
- Supports unreliable network conditions

### 5. **Full-Screen Responsive Video UI**

**Architecture:**
```
Role-Specific Rendering
├─ Doctor View
│  ├─ Full-screen remote video (background)
│  ├─ Local video PiP (bottom-right, 160px)
│  ├─ Floating control bar (mute, camera, end)
│  └─ Slide-in notes drawer (right edge, h-72vh)
│
└─ Patient View
   ├─ Full-screen remote video (background)
   ├─ Local video PiP (bottom-right, 160px)
   ├─ Floating control bar (mute, camera, leave)
   └─ Session info panel (compact)
```

**Optimization Techniques:**
- Remote video as CSS background (`absolute inset-0`)
- Local video as overlay (`absolute bottom-3 right-3`)
- Controls on floating bar (eliminates reflow)
- Notes drawer with `translate-x` animation (GPU-accelerated)
- Dark/light theme toggle persisted to localStorage

### 6. **PostgreSQL Query Optimizations**

**Indexes Used:**
```sql
-- Appointments
CREATE UNIQUE INDEX idx_unique_active_appointment 
  ON appointments (doctor_id, appointment_date, appointment_time) 
  WHERE status NOT IN ('cancelled', 'completed');

-- Schedule lookups
CREATE INDEX idx_doctor_schedules ON doctor_schedules (doctor_id, day_of_week);

-- Pharmacy (full-text search)
CREATE INDEX idx_pharm_prod_search 
  ON pharmacy_products USING GIN (to_tsvector('english', name || ' ' || description));

-- Cart active lookup
CREATE INDEX idx_pharm_cart_user_active 
  ON pharmacy_carts (user_id) WHERE status = 'active';

-- Low stock alerts
CREATE INDEX idx_pharm_inv_low_stock 
  ON pharmacy_inventory (product_id) WHERE stock_quantity < low_stock_threshold;
```

**Triggers for Data Integrity:**
```sql
-- Auto-update updated_at on every modification
CREATE TRIGGER trg_pharm_products_updated_at
  BEFORE UPDATE ON pharmacy_products
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Auto-generate order numbers
CREATE TRIGGER trg_pharm_ord_number
  BEFORE INSERT ON pharmacy_orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_pharmacy_order_number();

-- Auto-update product avg_rating on review change
CREATE TRIGGER trg_pharm_review_rating
  AFTER INSERT OR UPDATE OR DELETE ON pharmacy_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_product_rating();

-- Restore inventory on order cancel
CREATE TRIGGER trg_restore_inventory
  AFTER UPDATE ON pharmacy_orders
  FOR EACH ROW
  WHEN (OLD.status != 'cancelled' AND NEW.status = 'cancelled')
  EXECUTE FUNCTION restore_order_inventory();
```

### 7. **Connection Pooling & Resilience**

**PostgreSQL Pool:**
```javascript
const pool = new Pool({
  max: 3,                          // Max connections (lightweight)
  idleTimeoutMillis: 30000,        // Close unused after 30s
  connectionTimeoutMillis: 10000,  // Fail-fast on timeout
  keepAlive: true,                 // TCP keep-alive
  keepAliveInitialDelayMillis: 10000,
  application_name: 'TeleHealth'   // For debugging
});

// Transient error recovery
pool.on('error', (err) => {
  if (TRANSIENT_ERRORS.includes(err.code)) return; // Self-recover
  logger.error('Pool error:', err);
});
```

**Redis Reconnection:**
```javascript
client.on('error', (err) => {
  if (err instanceof SocketClosedUnexpectedlyError) {
    // Auto-reconnect with exponential backoff
  }
});
```

### 8. **Rate Limiting & Security**

**Login Endpoint Protection:**
```javascript
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,                   // 15 requests
  message: 'Too many login attempts, please try again later'
});

app.post('/api/auth/login', loginLimiter, authController.login);
```

**HTTP Security Headers (Helmet):**
- CSP (Content Security Policy)
- HSTS (HTTP Strict Transport Security)
- X-Frame-Options (Clickjacking prevention)
- X-Content-Type-Options (MIME type sniffing prevention)

---

## 📁 Project Structure

```
TeleHealth Production/
│
├── src/                                   # Backend Node.js/Express application
│   ├── server.js                          # HTTP server bootstrap + Socket.IO initialization
│   ├── app.js                             # Express app setup with middleware chain
│   │
│   ├── config/                            # Centralized configuration
│   │   ├── index.js                       # Config exports aggregator
│   │   ├── database.js                    # PostgreSQL pool (3 connections, connection retry logic)
│   │   ├── redis.js                       # Redis client with auto-reconnect
│   │   ├── socket.js                      # Socket.IO transport config (HTTP long-polling, WebSocket)
│   │   ├── auth.js                        # JWT secrets, bcrypt settings, token TTLs
│   │   ├── supabase.js                    # Supabase storage client for medical records
│   │   └── upload.js                      # Multer file upload config (MIME types, size limits)
│   │
│   ├── middleware/                        # Express middleware (request processing chain)
│   │   ├── auth.js                        # authenticate(), authorize(roles), blockAfterLogin
│   │   ├── validation.js                  # Zod schema validation + domain constants
│   │   ├── errorHandler.js                # Global error catcher + 404 handler
│   │   ├── staticPaths.js                 # Static file path utilities
│   │   └── index.js                       # Middleware exports
│   │
│   ├── utils/                             # Utility functions
│   │   ├── AppError.js                    # AppError, AuthError, ValidationError, NotFoundError classes
│   │   ├── catchAsync.js                  # Async wrapper (error propagation)
│   │   ├── logger.js                      # Winston logger configured (file + console)
│   │   └── escapeHtml.js                  # XSS prevention utility
│   │
│   ├── modules/                           # Feature modules (MVC pattern - each feature isolated)
│   │   ├── auth/                          # Authentication & token management
│   │   │   ├── auth.routes.js             # /auth/patient, /auth/doctor, /logout, /refresh-token
│   │   │   ├── auth.controller.js         # signupController, loginController, logoutController
│   │   │   ├── auth.service.js            # Password validation, JWT generation, token rotation logic
│   │   │   ├── auth.model.js              # SQL queries (user creation, token storage, verification)
│   │   │   └── auth.schema.js             # Zod schemas for signup/login payloads
│   │   │
│   │   ├── profile/                       # User & doctor profile CRUD
│   │   │   ├── profile.routes.js          # GET/POST profile, profile completion status
│   │   │   ├── profile.controller.js      # Profile create/update handlers
│   │   │   ├── profile.service.js         # Profile validation + image upload
│   │   │   ├── profile.model.js           # SQL: INSERT user_profile, doctor_profile
│   │   │   └── profile.schema.js          # Zod validation schemas
│   │   │
│   │   ├── appointment/                   # Core appointment lifecycle
│   │   │   ├── appointment.routes.js      # Book, cancel, reschedule, status endpoints
│   │   │   ├── appointment.controller.js  # Request handlers (input validation, response)
│   │   │   ├── appointment.service.js     # 3-layer booking protection, validation logic
│   │   │   │                              │ (ADVANCE_BOOKING_HOURS = 24, CANCEL_CUTOFF = 2hr)
│   │   │   ├── appointment.model.js       # SQL: INSERT with advisory lock, conflict detection
│   │   │   └── appointment.schema.js      # Zod schemas
│   │   │
│   │   ├── schedule/                      # Doctor schedule management
│   │   │   ├── schedule.routes.js         # GET/PUT my schedule, add/delete overrides
│   │   │   ├── schedule.controller.js     # Request handlers
│   │   │   ├── schedule.service.js        # Schedule slot generation, lock verification
│   │   │   ├── schedule.model.js          # SQL: SELECT available slots, override logic
│   │   │   └── schedule.schema.js         # Zod schemas
│   │   │
│   │   ├── video/                         # WebRTC signaling & call state
│   │   │   ├── video.routes.js            # GET /video/:roomId, POST /start-call
│   │   │   ├── video.controller.js        # Room access validation
│   │   │   ├── video.service.js           # Call start/join/end logic
│   │   │   ├── video.model.js             # SQL: UPDATE call status, save notes
│   │   │   ├── video.schema.js            # Zod schemas
│   │   │   └── video.socket.js            # Socket.IO handlers: join-room, signal, mute-state, etc.
│   │   │
│   │   ├── admin/                         # Admin dashboard & management
│   │   │   ├── admin.routes.js            # GET /login, POST /api/admin/login, dashboard endpoints
│   │   │   ├── admin.controller.js        # Admin auth & dashboard controllers
│   │   │   ├── admin.service.js           # Statistics, doctor/patient/appointment list, overrides
│   │   │   ├── admin.model.js             # SQL: System stats, pagination queries
│   │   │   └── admin.schema.js            # Zod schemas
│   │   │
│   │   ├── pharmacy/                      # Pharmacy product, cart, orders, reviews
│   │   │   ├── pharmacy.routes.js         # Products, cart, orders, reviews, wishlist endpoints
│   │   │   ├── pharmacy.controller.js     # CRUD handlers for products/cart/orders
│   │   │   ├── pharmacy.service.js        # Cart logic, order creation (transactional), stock checks
│   │   │   ├── pharmacy.model.js          # SQL: Inventory updates, order number generation, triggers
│   │   │   └── pharmacy.schema.js         # Zod schemas
│   │   │
│   │   ├── vault/                         # Medical records storage (Supabase)
│   │   │   ├── vault.routes.js            # Upload, list, download, delete files
│   │   │   ├── vault.controller.js        # File handling (multipart)
│   │   │   ├── vault.service.js           # Supabase upload/download + metadata storage
│   │   │   ├── vault.model.js             # SQL: medical_records table
│   │   │   └── vault.schema.js            # Zod schemas
│   │   │
│   │   └── ai/                            # AI symptom prediction (Clinical BERT)
│   │       └── ai.model.js                # Integration with disease-predictor service
│   │
│   ├── routes/                            # Cross-cutting route aggregators
│   │   ├── index.js                       # Main route aggregator
│   │   ├── ai.routes.js                   # AI prediction endpoints
│   │   └── prescription.routes.js         # Prescription PDF download
│   │
│   ├── services/                          # Shared services
│   │   ├── auth.service.js                # Token generation, verification, rotation
│   │   ├── cache.service.js               # Redis cache operations
│   │   ├── file.service.js                # File upload/download utilities
│   │   ├── prescription.service.js        # PDF generation logic
│   │   ├── video.service.js               # Video room management
│   │   └── appointment.service.js         # Shared appointment logic
│   │
│   ├── sockets/                           # Socket.IO namespace handlers
│   │   └── videoSocket.js                 # Signaling events: join-room, signal, mute-state
│   │
│   ├── logs/                              # Runtime logs (Winston output)
│   ├── temp_uploads/                      # Temporary multipart uploads (auto-cleaned)
│   └── package.json                       # Backend dependencies
│
├── telehealth-frontend/                   # Next.js 16 frontend application
│   ├── src/
│   │   ├── app/                           # App Router - file-based routing & layouts
│   │   │   ├── layout.tsx                 # Root layout (HTML, fonts, Toaster provider)
│   │   │   ├── page.tsx                   # Landing page
│   │   │   ├── not-found.tsx              # Custom 404 page
│   │   │   ├── globals.css                # Global styles + Tailwind directives
│   │   │   │
│   │   │   ├── admin/                     # Admin section (/admin/auth, /admin)
│   │   │   │   ├── auth/
│   │   │   │   │   └── page.tsx           # Admin login form (phone + password)
│   │   │   │   └── page.tsx               # Admin dashboard (stats, doctors, patients, appointments)
│   │   │   │
│   │   │   ├── auth/                      # Authentication pages
│   │   │   │   ├── patient/
│   │   │   │   │   ├── login/page.tsx
│   │   │   │   │   └── signup/page.tsx
│   │   │   │   └── doctor/
│   │   │   │       ├── login/page.tsx
│   │   │   │       └── signup/page.tsx
│   │   │   │
│   │   │   ├── patient/                   # Patient dashboard & features
│   │   │   │   ├── home                   # Dashboard with appointments
│   │   │   │   ├── appointments           # Book appointment
│   │   │   │   ├── video/
│   │   │   │   │   ├── dashboard          # Upcoming appointments list
│   │   │   │   │   └── [roomId]           # Video call room (VideoRoomClient)
│   │   │   │   └── profile                # Profile setup/edit
│   │   │   │
│   │   │   ├── doctor/                    # Doctor dashboard & features
│   │   │   │   ├── home                   # Dashboard with upcoming appointments
│   │   │   │   ├── schedule               # Manage weekly schedule + overrides
│   │   │   │   ├── video/
│   │   │   │   │   ├── dashboard          # Appointments list, start call button
│   │   │   │   │   └── [roomId]           # Video call room (VideoRoomClient)
│   │   │   │   └── profile                # Profile setup/edit
│   │   │   │
│   │   │   ├── pharmacy/                  # Pharmacy shopping
│   │   │   │   ├── page.tsx               # Product listing + categories
│   │   │   │   ├── product/[slug]         # Product detail page
│   │   │   │   ├── cart                   # Shopping cart
│   │   │   │   ├── checkout               # Checkout form
│   │   │   │   ├── orders                 # Order history
│   │   │   │   └── wishlist               # Wishlist items
│   │   │   │
│   │   │   ├── services                   # Static service info page
│   │   │   ├── contact                    # Contact form
│   │   │   └── predict                    # AI symptom checker
│   │   │
│   │   ├── components/                    # Reusable React components
│   │   │   ├── video/
│   │   │   │   └── VideoRoomClient.tsx    # Full-screen video call with signaling
│   │   │   │                              │ - WebRTC peer connection
│   │   │   │                              │ - Socket.IO signaling
│   │   │   │                              │ - ICE candidate queueing
│   │   │   │                              │ - Role-specific UI (doctor/patient)
│   │   │   │                              │ - Theme toggle
│   │   │   │
│   │   │   ├── ui/                        # shadcn/ui components
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   └── ...
│   │   │   │
│   │   │   ├── AuthCard.tsx               # Login/signup card layout
│   │   │   ├── Navbar.tsx                 # Navigation bar
│   │   │   ├── Footer.tsx                 # Footer
│   │   │   └── ...
│   │   │
│   │   ├── lib/
│   │   │   ├── api.ts                     # Type-safe API client (request, response, errors)
│   │   │   │                              │ - Admin functions (login, stats, lists)
│   │   │   │                              │ - Auth functions (logout)
│   │   │   │                              │ - Appointment functions
│   │   │   │                              │ - Video functions
│   │   │   ├── utils.ts                   # Helper functions
│   │   │   └── constants.ts               # App constants
│   │   │
│   │   ├── proxy.ts                       # Next.js middleware for routing
│   │   │                                  │ - Role-based redirects (patient/doctor/admin)
│   │   │                                  │ - Protected route guards
│   │   │                                  │ - Session validation
│   │   │
│   │   └── types/                         # TypeScript interfaces & types
│   │
│   ├── public/                            # Static assets
│   │   └── images/                        # PNG, SVG, icons
│   │
│   ├── next.config.mjs                    # Next.js configuration
│   ├── tsconfig.json                      # TypeScript strict mode enabled
│   ├── tailwind.config.ts                 # TailwindCSS configuration
│   ├── postcss.config.mjs                 # PostCSS config (Tailwind)
│   └── package.json                       # Frontend dependencies
│
├── disease-predictor/                     # Python AI model service
│   ├── app.py                             # Flask app for predictions
│   ├── Dockerfile                         # Docker image for AI service
│   ├── model/                             # Clinical BERT model
│   │   ├── predictor.py                   # Prediction logic
│   │   ├── binary_processor.py            # Input preprocessing
│   │   └── postprocess.py                 # Output formatting
│   ├── saved_models/
│   │   └── clinical_bert_final.h5         # Pre-trained BERT weights
│   └── requirements.txt                   # Python dependencies
│
├── views/                                 # Legacy EJS templates (deprecated, use Next.js)
│
├── temp_uploads/                          # Server temp file storage
├── logs/                                  # Backend logs (Winston output)
│
├── package.json                           # Root workspace config
├── README.md                              # This file
└── .env.example                           # Environment variables template
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
6. Redirect to role-based home page (`/patient/home`, `/doctor/home`, `/admin/dashboard`)

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
- Doctor configures weekly availability via `/doctor/schedule` (day, start time, end time)
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
1. Doctor views appointments on `/doctor/video/dashboard`
2. Clicks "Start Call" -> `POST /appointments/:id/start` updates status to `started`
3. Doctor is redirected to `/doctor/video/:roomId`

### 4. Patient Joins Call
1. Patient sees updated status on `/patient/video/dashboard` (via Socket.IO real-time update)
2. Clicks "Join Call" -> `GET /user/join-call/:appointmentId`
3. Patient is redirected to `/patient/video/:roomId`

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

## 🔄 Business Logic Flows

### 1. Authentication Flow

**User Signup (Patient/Doctor)**
```
1. User submits phone + password on signup form
   ↓
2. Validate: phone unique, password length >= 6
   ↓
3. Hash password with bcrypt (10 rounds)
   ↓
4. INSERT into users table with role ('user' or 'doctor')
   ↓
5. Redirect to login page
```

**Login Flow**
```
1. User enters phone + password
   ↓
2. Query users table by phone + verify bcrypt password
   ↓
3. If invalid → throw AuthError('Invalid credentials')
   ↓
4. Generate JWT tokens:
   - Access Token: {id, role} → 15 min expiry
   - Refresh Token: {id, role, type: 'refresh'} → 7 day expiry
   ↓
5. Store refresh token in database (refresh_tokens table)
   ↓
6. Set both as httpOnly, secure, SameSite=Strict cookies
   ↓
7. Redirect to role-based home page (/patient/home or /doctor/home)
```

**Token Refresh (Auto-Rotation)**
```
1. Access token expires (15 min)
   ↓
2. Frontend detects 401 on API call
   ↓
3. POST /api/refresh-token with refresh token from cookies
   ↓
4. Verify refresh token:
   - Check JWT signature & expiry
   - Verify token exists in database (not revoked)
   - Verify type = 'refresh'
   ↓
5. If valid:
   - Revoke OLD refresh token in database
   - Issue NEW access + refresh token pair
   - Set cookies with new tokens
   ↓
6. If invalid → redirect to role-specific login
```

**Logout**
```
1. POST /api/auth/logout (includes access token in JWT)
   ↓
2. Add access token to Redis blacklist (TTL = remaining lifetime)
   ↓
3. Mark refresh token as revoked in database
   ↓
4. Clear cookies (set max-age=0)
   ↓
5. Redirect to login page
```

---

### 2. Appointment Booking Flow (3-Layer Race Condition Protection)

**Step 1: Get Available Slots**
```
1. Patient selects doctor + date
   ↓
2. Doctor's weekly schedule loaded:
   - Query doctor_schedules for that day_of_week
   - Check schedule_overrides for that specific date
   ↓
3. Generate 30-minute slots:
   - Loop from start_time to end_time in 30-min intervals
   - Filter out past slots (no same-day, min 24-hour advance)
   - Check Redis for locked slots
   ↓
4. Return available + locked slots to frontend
```

**Step 2: Lock Slot (Optimistic - Layer 1)**
```
1. User clicks "Check Availability" on a slot
   ↓
2. Frontend calls POST /api/slots/lock (doctorId, date, time)
   ↓
3. Generate lockToken = random UUID
   ↓
4. Redis SET NX:
   SET lock:{doctorId}:{date}:{time} = lockToken NX EX 300
   ↓
5. If key already exists (NX fails) → Slot locked, try another
   ↓
6. Return { lockToken } to frontend (valid for 5 minutes)
```

**Step 3: Book Appointment (Pessimistic - Layer 2 + Layer 3)**
```
1. User confirms booking → POST /api/appointments/book
   (includes lockToken from Step 2)
   ↓
2. DATABASE TRANSACTION begins:
   ↓
3. Layer 2 - PostgreSQL Advisory Lock:
   SELECT pg_advisory_xact_lock(hashtext(doctorId || '-' || date))
   (serializes all concurrent requests for this doctor+date)
   ↓
4. Verify Redis lock ownership:
   GET lock:{doctorId}:{date}:{time}
   IF != lockToken → throw 409 Conflict
   ↓
5. Check for existing active appointment:
   SELECT FROM appointments WHERE user_id = $1 AND status IN (...)
   IF found → throw 'Already have active appointment'
   ↓
6. Check for slot conflict within transaction:
   SELECT FROM appointments WHERE doctor_id=$1 AND date=$2 AND time=$3
   AND status NOT IN ('cancelled', 'completed')
   IF found → throw 409 (Race condition detected)
   ↓
7. Generate room_id (UUID)
   ↓
8. Layer 3 - INSERT (Unique Index enforcer):
   INSERT INTO appointments (user_id, doctor_id, appointment_date, 
     appointment_time, status='scheduled', room_id, symptoms)
   
   IF unique constraint violated (23505) → catch & throw 409 Conflict
   ↓
9. COMMIT transaction
   ↓
10. Clean up:
   - DELETE Redis lock
   - Invalidate doctors cache
   ↓
11. Return { appointmentId, room_id }
```

**Why 3 Layers?**
- **Layer 1 (Redis):** 99% of conflicts caught, O(1) speed
- **Layer 2 (Advisory Lock):** Serializes remaining edge cases
- **Layer 3 (Unique Index):** Database-enforced constraint

---

### 3. Video Call Flow

**WebRTC Signaling Architecture:**
```
Doctor Browser          Frontend               Backend Socket             Patient Browser
(port 3000)            Socket (port 3000)     (port 10000)              (port 3000)
     |                      |                      |                         |
     |-- View Appts ---→ GET /api/appointments ---|→ DB Query
     |                      |                      |
     |-- Start Call ----→ POST /start-call -------|→ Update status='started'
     |                      |                      |   (store in Redis 2hr TTL)
     |                      |←─ emit 'doctor-online' ←│
     |                      |                      |
     |(redirect to room)     |                      |
     |                      |                      |
     |-- join-room ------→ socket.io connect     |
     |(role='doctor') --|→→→ validate access    |
     |                      |                      | (Save in Redis)
     |                      |← 'doctor-joined' ←← |
     |                      |                      | emit to patient
     |                      |←─ 'doctor-online' ← | patient sees it
     |                      |                      |
     |-- ICE candidates →→→ | relay SDP -------→→→ emit 'signal'
     |   + SDP offer--→→→→→→→ | + ICE cand -→ ICE queue
     |                      |←← SDP answer ←──── |
     |                      |← ICE candidates ←← |
     |                      |                      |
     | (flush queued ICE on first SDP)
     | (attach remote stream on track event)
     |                      |                      |
     +─────────────────────────→→→→ VIDEO: Full-Screen RTC Peer Connection
     │ - Remote video dominates (full-screen)
     │ - Local video PiP (bottom-right, 160px)
     │ - Floating control bar (mute, camera, end)
     │ - Doctor: slide-in notes drawer (GPU-accelerated)
     │ - Both: dark/light theme toggle
     │
     | (Call ongoing - state='ongoing' in Redis)
     |
     |-- write notes ----→ (visible in drawer)
     |                      |
     |-- end call -------→→→→ 'doctor-end-call' event
     |                      |                      |
     |                      |                      | - Save notes
     |                      |                      | - UPDATE status='completed'
     |                      |                      | - Generate prescription PDF
     |                      |←─ 'call-ended-by-doctor' ←
     |                      | ← 'prescription-ready'
     | (Download prescription link)
     | (Auto-redirect after 30s)
```

**Call State Machine (Redis + PostgreSQL Fallback):**
```
scheduled ──→ waiting ──→ ongoing ──→ completed
(Appointment    (One        (Both)       (Doctor)
 booked)        here)                    (ends)

Redis TTL: 2 hours
Fallback: appointments.status column
```

**Grace Period Reconnection (30 seconds):**
```
If participant disconnects:
  1. emit 'participant-disconnected'
  2. Other gets event with { grace: true, timer: 30s }
  
  If reconnected within 30s:
    - Clear timer
    - Resume call seamlessly
  
  If not reconnected:
    - emit 'participant-left' with { permanent: true }
    - Update appointment status
    - Close other peer's connection
```

---

### 4. Pharmacy Order Flow (Transactional)

**Browse & Cart**
```
1. GET /api/pharmacy/products (with filters/search/sort)
   → Query products + inventory + ratings (paginated)

2. GET /api/pharmacy/products/:slug
   → Load full details + reviews

3. POST /api/pharmacy/cart/add
   → Find active cart for user (status='active')
   → If no cart: CREATE new
   → INSERT/UPDATE cart_items

4. PUT /api/pharmacy/cart/update
   → Validate quantity BETWEEN 1-50
   → UPDATE cart_items.quantity

5. DELETE /api/pharmacy/cart/remove/:productId
   → DELETE cart_items row
```

**Checkout (Transactional - Atomic or Nothing)**
```
1. GET /pharmacy/checkout
   → Load active cart + current prices

2. POST /api/pharmacy/orders (TRANSACTION):
   ↓
3. Validate stock:
   SELECT stock_quantity FROM pharmacy_inventory
   IF insufficient → 409 Conflict, ROLLBACK
   ↓
4. Generate order_number (PH-YYYYMMDD-XXXX via trigger)
   ↓
5. Calculate totals:
   subtotal = SUM(qty * current_price)
   tax = subtotal * TAX_RATE
   shipping = (subtotal > $50) ? 0 : SHIPPING_COST
   total = subtotal + tax + shipping - discount
   ↓
6. INSERT pharmacy_orders with all totals
   ↓
7. For each cart_item:
   INSERT pharmacy_order_items (SNAPSHOT):
   - product_name, product_image, quantity
   - unit_price (at order time), total_price
   ↓
8. UPDATE pharmacy_inventory:
   stock_quantity -= ordered_quantity
   ↓
9. UPDATE pharmacy_carts:
   status = 'converted'
   ↓
10. DELETE pharmacy_cart_items rows
    ↓
11. COMMIT
    → Return { orderId, orderNumber }
    → send_notification_email()
```

**Order Lifecycle**
```
pending ──→ confirmed ──→ processing ──→ shipped ──→ delivered
(Created)   (Paid)       (Packed)       (In-flight)  (Received)
   ↓
   cancelled (at any stage before shipped)
   → Restore inventory (trigger: trg_restore_inventory)
```

---

### 5. Admin Dashboard Flow

**Admin Login**
```
1. POST /api/admin/login (phone, password)
   ↓
2. Query users WHERE phone=$1 AND role='admin'
   ↓
3. Verify bcrypt password
   ↓
4. Generate JWT tokens (same as patient/doctor)
   ↓
5. Return { admin: {id, phone}, accessToken, refreshToken }
   ↓
6. Frontend: Redirect to /admin (middleware checks backendRole='admin')
```

**Dashboard Load**
```
1. GET /admin (middleware validates backendRole='admin')
   ↓
2. Parallel data fetch:
   - GET /api/admin/stats → { totalPatients, totalDoctors, activeAppointments, etc. }
   - GET /api/admin/doctors?page=1 → First 20 doctors with pagination
   - GET /api/admin/patients?page=1 → First 20 patients with pagination
   - GET /api/admin/appointments → Recent 8 appointments with status
   ↓
3. Render dashboard:
   - Stats cards (4 col grid on desktop, responsive)
   - Doctor list with name, phone, specialization
   - Patient list with name, phone, blood group
   - Appointment table with color-coded status badges
   - Theme toggle (dark/light, persisted to localStorage)
   - Logout button
```

---

## 🔐 Authentication & Authorization

### JWT Token Strategy

**Token Pair System:**
- **Access Token** (15 min): Short-lived, contains `{id, role}`
  - Used in `Authorization: Bearer` header
  - Checked on every protected route
  
- **Refresh Token** (7 days): Long-lived, type='refresh', stored securely
  - Kept in httpOnly cookie
  - Used to get new access token when expired
  - Single-use: revoked when used (token rotation)

**Storage:**
```javascript
// Frontend: httpOnly cookies (set by server)
document.cookie = "accessToken=jwt...; HttpOnly; Secure; SameSite=Strict";
document.cookie = "refreshToken=jwt...; HttpOnly; Secure; SameSite=Strict";

// Backend: PostgreSQL refresh_tokens table
{id, user_id, role, token, expires_at, revoked, revoked_at}

// Backend: Redis blacklist on logout
SET token_blacklist:{jwt_jti} value X EX {remaining_ttl}
```

### Role-Based Access Control (RBAC)

**Three Roles:**
1. **user** (patient) - Book appointments, video calls, pharmacy
2. **doctor** - Manage schedule, start calls, write prescriptions
3. **admin** - Dashboard, user management, system stats

**Middleware Protection:**
```javascript
// src/middleware/auth.js

authenticate() {
  // Verify JWT, attach req.user = {id, role}
  // Check Redis blacklist (revoked tokens)
}

authorize(...roles) {
  // Verify req.user.role in allowed roles
}

blockAfterLogin() {
  // Redirect authenticated users away from login/signup
}
```

**Route Examples:**
```javascript
// Public (no auth)
GET  /patient/signup
GET  /services

// Protected by role
GET  /patient/home        // require: authorize('user')
GET  /doctor/home         // require: authorize('doctor')
GET  /admin               // require: authorize('admin')
POST /api/appointments/book  // require: authorize('user')
```

---

## API Endpoints

### Authentication (6 endpoints)

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| POST | `/patient/signup` | No | Register new patient account |
| POST | `/patient/login` | No | Patient login, returns JWT cookies |
| POST | `/doctor/signup` | No | Register new doctor account |
| POST | `/doctor/login` | No | Doctor login, returns JWT cookies |
| GET | `/logout` | No | Clear auth cookies, revoke tokens |
| POST | `/api/refresh-token` | No | Rotate access + refresh tokens |

### Public Pages (8 endpoints)

| Method | Path | Middleware | Description |
|--------|------|:----------:|-------------|
| GET | `/` | blockAfterLogin | Landing page |
| GET | `/role` | blockAfterLogin | Role selection (user/doctor) |
| GET | `/patient/login` | blockAfterLogin | Patient login form |
| GET | `/patient/signup` | blockAfterLogin | Patient registration form |
| GET | `/doctor/login` | blockAfterLogin | Doctor login form |
| GET | `/doctor/signup` | blockAfterLogin | Doctor registration form |
| GET | `/services` | blockAfterLogin | Services information page |
| GET | `/contact` | blockAfterLogin | Contact page |

### Protected Pages (6 endpoints)

| Method | Path | Role | Description |
|--------|------|:----:|-------------|
| GET | `/patient/home` | user | Patient dashboard |
| GET | `/doctor/home` | doctor | Doctor dashboard |
| GET | `/appointments` | user | Appointment booking page |
| GET | `/records` | user | Medical records page |
| GET | `/patient/profile/create` | user | Patient profile setup |
| GET | `/doctor/profile/create` | doctor | Doctor profile setup |

### Profile Management (8 endpoints)

| Method | Path | Role | Description |
|--------|------|:----:|-------------|
| GET | `/patient/profile` | user | View patient profile |
| POST | `/patient/profile` | user | Create patient profile |
| GET | `/patient/profile/edit` | user | Edit patient profile form |
| POST | `/patient/profile/edit` | user | Update patient profile |
| GET | `/doctor/profile` | doctor | View doctor profile |
| POST | `/doctor/profile` | doctor | Create doctor profile |
| GET | `/doctor/profile/edit` | doctor | Edit doctor profile form |
| POST | `/doctor/profile/edit` | doctor | Update doctor profile |

### Appointments (12 endpoints)

| Method | Path | Role | Description |
|--------|------|:----:|-------------|
| POST | `/appointments/book` | user | Book appointment (3-layer protection) |
| GET | `/api/appointments/patient` | user | Get patient's appointments |
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
| GET | `/doctor/schedule` | doctor | Schedule management page |
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
| GET | `/patient/video/:roomId` | user | Patient video call room |
| GET | `/doctor/video/:roomId` | doctor | Doctor video call room |
| GET | `/doctor/video/dashboard` | doctor | Doctor's appointment dashboard |
| GET | `/patient/video/dashboard` | user | Patient's appointment dashboard |
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
| Auth | 15 min | 20 | `/patient/signup`, `/patient/login`, `/doctor/signup`, `/doctor/login`, `/api/refresh-token` |
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

Canonical source-of-truth files:

- Backend: [.env.example](.env.example)
- Frontend: [telehealth-frontend/.env.example](telehealth-frontend/.env.example)
- Environment matrix and done criteria: [docs/phase-0-baseline.md](docs/phase-0-baseline.md)

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

## Phase 1: Local Stability First

Standardized two-terminal local run flow:

1. Terminal 1 (backend, from repository root)

```bash
npm run local:backend
```

2. Terminal 2 (frontend)

```bash
cd telehealth-frontend
npm run local:dev
```

Startup friction handling:

- Port conflicts:
   - Root helper (ports `10000` and `3000`):

```bash
npm run local:free-ports
```

   - Frontend-only helper (port `3000`):

```bash
cd telehealth-frontend
npm run local:free-port
```

- Bad env values:
   - Backend preflight validates required local env (`DATABASE_URL`, access token secret, refresh token secret).
   - Frontend preflight validates `NEXT_SERVER_API_URL` format if set.
- Missing dependencies:
   - Both preflights check for `node_modules` and fail with clear install guidance.

Clean local smoke checklist:

1. Login works.
2. Session refresh works.
3. Core dashboard loads.
4. One appointment flow works end-to-end.
5. One file upload and one file download work.

Done criteria:

- Both apps can be restarted any time and come up cleanly.
- The smoke checklist passes repeatedly in local development.

Detailed runbook:

- [docs/local-smoke-checklist.md](docs/local-smoke-checklist.md)

Built by [Abhijit Reddy](https://abhijitreddy-portfolio.netlify.app/)
