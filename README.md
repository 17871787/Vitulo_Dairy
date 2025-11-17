# Vitulo Dairy Portal

A customer-facing web portal for dairy farmers who supply calves to Vitulo. Allows dairy suppliers to view their sold calves, track payments, and monitor livestock performance outcomes.

## Overview

The Vitulo Dairy Portal is part of a 3-app ecosystem for managing livestock operations:

- **Vitulo Management App** - Internal staff application for managing the entire livestock operation (port 3000)
- **Vitulo Finisher Portal** - Customer portal for beef finisher farms (port 3001)
- **Vitulo Dairy Portal** - Customer portal for dairy suppliers (port 3002) ← **This project**

All three applications share a single PostgreSQL database hosted on Supabase.

## Features

### 📊 Dashboard
- Total calves sold (all-time)
- Total earnings and pending payments
- Month-over-month sales trends
- Recent activity feed
- Quick action cards for easy navigation

### 🐄 Calves Sold
- Complete list of all calves supplied to Vitulo
- Purchase details (date, weight, price)
- Search and filter by tag number, breed, date range
- Sortable table columns
- Export capability

### 💰 Payment History
- Monthly payment summaries grouped by period
- Payment status tracking (Paid, Pending, Overdue)
- Detailed breakdown by individual animal
- Invoice references and payment methods
- Total earnings, paid, and pending amounts

### 📈 Performance Metrics
- Slaughter outcomes for your calves
- Carcass grading distribution (conformation & fat class)
- Average deadweight and carcass value
- Comparison to industry benchmarks
- Monthly performance trends
- Breed-specific performance analysis

## Technology Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (Supabase)
- **ORM:** Prisma
- **Authentication:** NextAuth.js with credentials provider
- **UI Components:** Radix UI + Tailwind CSS
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Access to the Vitulo Supabase database

### Installation

1. Clone the repository:
```bash
git clone https://github.com/17871787/Vitulo_Dairy.git
cd vitulo-dairy
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory:
```env
# Database
DATABASE_URL="postgresql://[your-supabase-connection-string]"
DIRECT_URL="postgresql://[your-supabase-connection-string]"

# NextAuth
NEXTAUTH_SECRET="[generate-with: openssl rand -base64 32]"
NEXTAUTH_URL="http://localhost:3002"

# App Config
NEXT_PUBLIC_APP_NAME="Vitulo Dairy Portal"
NEXT_PUBLIC_APP_ROLE="DAIRY_SUPPLIER"
```

4. Generate Prisma client:
```bash
npx prisma generate
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3002](http://localhost:3002) in your browser.

### Database Setup

The database schema is shared with the main Vitulo management app. To sync the schema:

1. Copy schema from management app (if needed):
```bash
cp ../vitulo/prisma/schema.prisma ./prisma/schema.prisma
```

2. Generate the Prisma client:
```bash
npx prisma generate
```

## Development Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3002 |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run seed` | Seed demo data (creates Demo Dairy Farm with 15 animals) |
| `npm run check-user` | Verify test user credentials and data |
| `npm run fix-password` | Reset test user password to 'test123' |
| `npm run add-test-animals` | Add 12 test animals to existing farm |

## Testing

### Test Credentials

**Email:** `dairy@test.com`
**Password:** `test123`

### Seeding Test Data

To populate the database with test data:

```bash
# Option 1: Full demo data (creates new "Demo Dairy Farm")
npm run seed

# Option 2: Add animals to the existing "Test Dairy Farm"
npm run add-test-animals
```

This creates:
- A test dairy farm with DAIRY_SUPPLIER type
- A test user account linked to the farm
- 12-15 demo animals with purchase records
- 2 payment records (1 paid, 1 pending)
- 4-5 kill records for performance data

### Verifying Setup

Check if user is configured correctly:
```bash
npm run check-user
```

This will show:
- ✅ User exists and has valid credentials
- ✅ Farm is linked correctly
- ✅ Password hash is valid
- 📊 Number of animals in the system

## Project Structure

```
vitulo-dairy/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # NextAuth API routes
│   │   │   └── dairy/         # Dairy-specific API endpoints
│   │   │       ├── calves/   # GET calves sold
│   │   │       ├── payments/ # GET payment history
│   │   │       └── performance/ # GET performance metrics
│   │   ├── dashboard/         # Dashboard pages
│   │   │   ├── calves/       # Calves sold page
│   │   │   ├── payments/     # Payments page
│   │   │   ├── performance/  # Performance metrics page
│   │   │   └── page.tsx      # Main dashboard
│   │   ├── login/            # Login page
│   │   └── layout.tsx        # Root layout
│   ├── components/            # React components
│   │   ├── ui/               # Reusable UI components (shadcn)
│   │   ├── nav/              # Navigation components
│   │   └── dashboard/        # Dashboard-specific components
│   └── lib/                   # Utilities and configurations
│       ├── auth.ts           # NextAuth configuration
│       ├── prisma.ts         # Prisma client instance
│       └── utils.ts          # Helper functions
├── prisma/
│   └── schema.prisma         # Database schema (shared across apps)
├── scripts/                   # Utility scripts
│   ├── seed-demo-data.ts     # Full demo data seeder
│   ├── check-user.ts         # User verification script
│   ├── fix-user-password.ts  # Password reset script
│   └── add-test-animals.ts   # Add animals to existing farm
├── docs/                      # Documentation
│   ├── DAIRY_PORTAL_MVP_PROMPT.md
│   ├── VITULO_PLATFORM_ARCHITECTURE.md
│   └── MULTI_PROJECT_SETUP_GUIDE.md
└── public/                    # Static assets
```

## Key Features Implementation

### Authentication
- Role-based access control (DAIRY_SUPPLIER only)
- JWT session management (30-day expiry)
- Farm-scoped data access (users only see their own farm's data)
- Bcrypt password hashing (cost factor: 10)

### Data Queries
All queries are filtered by `breederFarmId` to ensure dairy suppliers only see calves they've supplied:

```typescript
const calves = await prisma.calfPurchase.findMany({
  where: {
    animal: {
      breederFarmId: session.user.farmId  // Farm-scoped security
    }
  }
});
```

### API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dairy/calves` | GET | Fetch calves sold with optional filters (breed, date range, search) |
| `/api/dairy/payments` | GET | Fetch payment history grouped by month |
| `/api/dairy/performance` | GET | Fetch performance metrics with period filter |
| `/api/auth/[...nextauth]` | * | NextAuth authentication endpoints |

## Database Schema (Key Models)

### User
- Stores dairy supplier credentials and farm association
- Fields: `email`, `passwordHash`, `name`, `farmId`, `role`
- Role must be: `DAIRY_SUPPLIER`

### Farm
- Represents dairy supplier farms
- Type: `DAIRY_SUPPLIER`
- Links to User records

### Animal
- Livestock records
- Linked to breeder farm via `breederFarmId`
- Key fields: `tagNumber`, `breed`, `sex`, `dateOfBirth`

### CalfPurchase
- Records of calves purchased from dairy farms
- Pricing breakdown: `basePrice`, `weightAdjustment`, `finalPrice`
- Transfer tracking: `transferDate`, `transferWeight`, `transferValue`

### Payment
- Payment records to dairy suppliers
- Status: `PAID`, `PENDING`, `OVERDUE`
- Links to Farm via `farmId`

### AnimalPayment
- Links individual animals to payment batches
- Enables detailed payment breakdown per animal

### KillRecord
- Slaughter outcomes and carcass grading
- Fields: `killDate`, `conformation`, `fatClass`, `totalWeight`, `value`
- Used for performance metrics dashboard

## Deployment

### Production Deployment (Vercel)

The app is automatically deployed to Vercel on every push to the `main` branch.

**Production URL:** https://vitulo-dairy-gl2pdn979-joe-towers-projects.vercel.app

### Manual Deployment

```bash
# Build locally to test
npm run build

# Deploy to Vercel production
vercel --prod
```

### Environment Variables (Vercel)

Required environment variables must be set in the Vercel dashboard:
- `DATABASE_URL` - Supabase connection string (pooler)
- `DIRECT_URL` - Supabase direct connection string
- `NEXTAUTH_SECRET` - Secure random string for JWT signing
- `NEXTAUTH_URL` - Production URL
- `NEXT_PUBLIC_APP_NAME` - "Vitulo Dairy Portal"
- `NEXT_PUBLIC_APP_ROLE` - "DAIRY_SUPPLIER"

## Configuration

### Port Configuration
This app runs on port **3002** to avoid conflicts with other Vitulo apps:
- Management App: port 3000
- Finisher Portal: port 3001
- Dairy Portal: port 3002 ← **This app**

### Multi-Project Development
When working across multiple Vitulo projects:

1. Each app has its own directory and git repository
2. All apps share the same `prisma/schema.prisma` file
3. Keep schemas in sync by copying from the management app
4. Run `npx prisma generate` after schema updates in each project

## Troubleshooting

### Login Issues

If you can't log in with test credentials:

1. **Check the user exists:**
```bash
npm run check-user
```
Expected output: ✅ User found, ✅ Password valid

2. **Reset the password:**
```bash
npm run fix-password
```
This generates a fresh bcrypt hash for "test123"

3. **Verify the user has a farmId:**
The check-user script will show if farmId is set

4. **Common issues:**
   - Password hash in SQL script was invalid (use fix-password)
   - User role is not DAIRY_SUPPLIER
   - farmId is NULL or points to non-existent farm

### No Data Showing on Dashboard

If the dashboard shows zero calves/payments:

1. **Verify you're logged in with correct user:**
Check browser dev tools → Application → Cookies

2. **Check the farm has animals:**
```bash
npm run check-user
```
Shows: "📊 Animals for this farm: X"

3. **Add test data:**
```bash
npm run add-test-animals
```
Adds 12 animals, 2 payments, 4 kill records

4. **Verify query filtering:**
All queries filter by `breederFarmId = session.user.farmId`

### Build Errors

Common issues and fixes:

1. **Prisma client out of sync:**
```bash
npx prisma generate
```

2. **Environment variables not loaded:**
   - Ensure `.env.local` exists in project root
   - Check variable names match exactly (case-sensitive)
   - Use `dotenv` in scripts for manual execution

3. **Type errors after schema changes:**
   - Pull latest schema: `cp ../vitulo/prisma/schema.prisma ./prisma/`
   - Regenerate client: `npx prisma generate`
   - Restart dev server

4. **Module resolution errors:**
   - Clear `.next` folder: `rm -rf .next`
   - Reinstall dependencies: `npm install`
   - Rebuild: `npm run build`

### Database Connection Issues

1. **Pooler connection timeout:**
   - Use connection pooling URL (port 6543) for migrations
   - Use direct connection (port 5432) for queries

2. **SSL errors:**
   - Supabase requires SSL - connection strings include `?sslmode=require`

3. **Too many connections:**
   - Use Prisma's connection pooling
   - Limit concurrent requests in production

## Security Considerations

### Data Isolation
- ✅ All queries filtered by `session.user.farmId`
- ✅ Middleware protects all `/dashboard/*` routes
- ✅ API routes verify `DAIRY_SUPPLIER` role
- ✅ No cross-farm data leakage possible

### Authentication
- ✅ Passwords hashed with bcrypt (cost factor: 10)
- ✅ JWT tokens stored in HTTP-only cookies
- ✅ 30-day session expiry with automatic renewal
- ✅ CSRF protection via NextAuth

### API Security
- ✅ Server-side session validation on all API routes
- ✅ Farm ID verification prevents unauthorized access
- ✅ No direct database queries from client side
- ✅ Prisma prevents SQL injection

### Production Hardening
- ✅ HTTPS enforcement (Vercel automatic)
- ✅ Environment variables never exposed to client
- ✅ Error messages sanitized in production
- ✅ Rate limiting on authentication endpoints

## Performance Optimization

- Server-side rendering for initial page loads
- API routes use Prisma query optimization
- Efficient indexes on `breederFarmId`, `farmId`, `killDate`
- Image optimization via Next.js
- Code splitting for faster page loads
- CDN delivery via Vercel Edge Network

## Contributing

This is a private project for Vitulo. For development:

1. Create a feature branch from `main`
2. Make your changes
3. Test locally with `npm run dev`
4. Build to verify: `npm run build`
5. Commit and push to GitHub
6. Vercel will auto-deploy preview environment
7. Test preview deployment
8. Merge to `main` for production deployment

## Related Documentation

- [Platform Architecture](./docs/VITULO_PLATFORM_ARCHITECTURE.md) - Full 3-app ecosystem overview
- [Dairy Portal MVP Spec](./docs/DAIRY_PORTAL_MVP_PROMPT.md) - Original requirements
- [Multi-Project Setup Guide](./docs/MULTI_PROJECT_SETUP_GUIDE.md) - Development workflow

## Related Repositories

- **Management App:** https://github.com/17871787/Vitulo
- **Finisher Portal:** https://github.com/17871787/vitulo-finisher
- **Dairy Portal:** https://github.com/17871787/Vitulo_Dairy ← **This repo**

## Support

For issues or questions:
- **GitHub Issues:** https://github.com/17871787/Vitulo_Dairy/issues
- **Contact:** Joe Tower (Vitulo)

## Changelog

### v1.0.0 (November 2025)
- ✅ Initial production release
- ✅ Dashboard with summary metrics
- ✅ Calves sold page with filtering
- ✅ Payment history with monthly grouping
- ✅ Performance metrics with benchmarks
- ✅ Authentication with role-based access
- ✅ Farm-scoped data security
- ✅ Deployed to Vercel production

## License

Private - All Rights Reserved - Vitulo Ltd.

---

**Last Updated:** November 2025
**Version:** 1.0.0
**Status:** Production Ready ✅

Built with ❤️ for UK dairy farmers by Vitulo
