# 🏥 TeleHealth - Modern Telemedicine Platform

A production-grade full-stack telemedicine platform enabling real-time video consultations, appointment management, digital prescriptions, and integrated pharmacy services.

## ✨ Key Features

- 🔐 **Secure Authentication** - Role-based access control (Patient, Doctor, Admin)
- 📹 **Real-time Video Calls** - WebRTC peer-to-peer HD video with Socket.IO signaling
- 📅 **Smart Appointment Booking** - Race-condition protected (3-layer validation)
- 💊 **Integrated Pharmacy** - Product catalog, cart, orders, and reviews
- 📋 **Digital Prescriptions** - PDF generation and download
- 🏥 **Medical Records Vault** - Cloud storage with encryption
- 📊 **Admin Dashboard** - Real-time statistics and management
- 🔄 **Real-time Updates** - Socket.IO for live notifications
- 📱 **Fully Responsive** - Dark/light theme support

## 🛠️ Tech Stack

**Frontend**: Next.js 16, React 19, TypeScript, TailwindCSS, Socket.IO, WebRTC  
**Backend**: Express.js, PostgreSQL, Redis, Socket.IO, JWT, Zod  
**Storage**: Supabase, Multer, pdfkit  
**Security**: Helmet, bcrypt, rate limiting, CORS

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- Redis 5+

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/telehealth.git
cd telehealth

# Install backend dependencies
npm install

# Install frontend dependencies
cd telehealth-frontend
npm install
cd ..
```

### Environment Setup

Create `.env` in root:

```
NODE_ENV=development
PORT=10000
DATABASE_URL=postgresql://user:pass@localhost:5432/telehealth
REDIS_URL=redis://localhost:6379
ACCESS_TOKEN_SECRET=your_secret_here
REFRESH_TOKEN_SECRET=your_refresh_secret
FRONTEND_URL=http://localhost:3000
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
EMAILJS_SERVICE_ID=your_emailjs_service
EMAILJS_TEMPLATE_ID=your_template_id
EMAILJS_PUBLIC_KEY=your_emailjs_key
```

Create `telehealth-frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:10000
NEXT_PUBLIC_SOCKET_URL=http://localhost:10000
```

### Run Services

```bash
# Terminal 1: Backend
npm run dev
# Server starts on http://localhost:10000

# Terminal 2: Frontend
npm --prefix telehealth-frontend run local:dev
# Frontend starts on http://localhost:3000

# Terminal 3: Redis (if not running as service)
redis-server
```

## � Project Structure

```
telehealth/
├── src/                          # Backend Node.js/Express
│   ├── modules/                  # Feature modules
│   │   ├── auth/                 # Authentication & JWT
│   │   ├── appointment/          # Booking & scheduling
│   │   ├── video/                # WebRTC signaling
│   │   ├── pharmacy/             # E-commerce
│   │   ├── admin/                # Dashboard
│   │   ├── profile/              # User profiles
│   │   ├── schedule/             # Doctor schedules
│   │   └── vault/                # Medical records
│   ├── config/                   # Database, Redis, Socket.IO
│   ├── middleware/               # Auth, validation, error handling
│   ├── utils/                    # Logger, error classes
│   └── server.js                 # Entry point
├── telehealth-frontend/          # Next.js frontend
│   ├── src/app/                  # App Router pages
│   ├── src/components/           # React components
│   └── src/lib/                  # API client, utilities
└── package.json
```

## 🔧 API Endpoints

### Core Endpoints

- **Auth**: Signup, login, logout, refresh token
- **Appointments**: Book, cancel, reschedule, list
- **Video**: WebRTC room management with Socket.IO signaling
- **Pharmacy**: Products, cart, orders, reviews, wishlist
- **Admin**: Dashboard, user management, pharmacy management

### API Versioning & Compatibility

- Primary API surface is available under `/api/v1/*`.
- Legacy routes under `/api/*`, `/appointments/*`, `/vault/*`, `/patient/*`, and `/doctor/*` remain active for backward compatibility.
- Route aliasing is handled in backend middleware in `src/app.js`.

### Response Contract

- Standard JSON contract for API responses:
  - `success`
  - `message`
  - `data`
- Controllers are standardized through `src/utils/sendResponse.js`.
- Binary/file download endpoints intentionally return streamed/buffered content and are exceptions to JSON contract.

For complete API documentation, see [COMPREHENSIVE_PROJECT_DOCUMENTATION.txt](./COMPREHENSIVE_PROJECT_DOCUMENTATION.txt).

## 🔐 Security Features

- JWT authentication with refresh token rotation
- Password hashing (bcrypt, 10 rounds)
- Role-based access control (RBAC)
- Rate limiting on sensitive endpoints
- SQL injection prevention (parameterized queries)
- XSS protection (HTML escaping, CSP headers)
- CORS configuration for production
- HTTPOnly secure cookies
- Database advisory locks for race condition prevention

## 🐳 Docker Setup

```bash
# Build and run with Docker Compose
docker-compose up -d

# Backend: http://localhost:10000
# Frontend: http://localhost:3000
# PostgreSQL: port 5432
# Redis: port 6379
```

## 📚 Documentation

- **[COMPREHENSIVE_PROJECT_DOCUMENTATION.txt](./COMPREHENSIVE_PROJECT_DOCUMENTATION.txt)** - Full technical documentation
  - Architecture & design patterns
  - Complete database schema with relationships
  - All 80+ API endpoints with examples
  - Business logic flows
  - Security implementation details
  - Performance optimizations
  - Deployment instructions
  - Testing strategies
  - Future enhancements

## 🧪 Testing

```bash
# Run tests (when configured)
npm test

# Run linter
npm run lint

# Build production bundle
npm run build
```

## 📊 Database

PostgreSQL with:

- Connection pooling (max 3 connections)
- Advisory locks for appointment booking
- Full-text search on pharmacy products
- Comprehensive data integrity triggers
- Optimized indexes for fast queries

## 🚀 Production Deployment

### Environment Variables

Set all required env vars in production:

- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `ACCESS_TOKEN_SECRET` - JWT secret
- `REFRESH_TOKEN_SECRET` - Refresh token secret
- `SUPABASE_URL`, `SUPABASE_KEY` - Cloud storage
- `EMAILJS_*` - Email service credentials
- `NEXT_SERVER_API_URL` - Required for frontend production build (must be HTTPS)

### Render + Vercel Deployment Notes

- Backend (Render): run `npm start` from repository root.
- Frontend (Vercel): set project root to `telehealth-frontend`.
- Vercel required env:
  - `NEXT_SERVER_API_URL=https://<your-render-backend-domain>`
- Optional frontend env:
  - `NEXT_PUBLIC_API_URL=https://<your-render-backend-domain>`
  - `NEXT_PUBLIC_SOCKET_URL=https://<your-render-backend-domain>`
- Backend CORS must allow your Vercel domain and send credentials.

### PM2 Process Management

```bash
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

### Nginx Reverse Proxy

```nginx
upstream backend {
  server localhost:10000;
}

upstream frontend {
  server localhost:3000;
}

server {
  listen 443 ssl http2;
  server_name yourdomain.com;

  location /api {
    proxy_pass http://backend;
  }

  location /socket.io {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }

  location / {
    proxy_pass http://frontend;
  }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 👥 Support & Contact

- 📧 Email: support@telehealth.dev
- 📖 Docs: [COMPREHENSIVE_PROJECT_DOCUMENTATION.txt](./COMPREHENSIVE_PROJECT_DOCUMENTATION.txt)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/telehealth/issues)

## 🙏 Acknowledgments

- Next.js & React communities
- Socket.IO for real-time communication
- Supabase for cloud storage
- PostgreSQL for reliable data management
- WebRTC for peer-to-peer video

---

**Made with ❤️ for better healthcare delivery**
