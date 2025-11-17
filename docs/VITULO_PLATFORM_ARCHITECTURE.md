# Vitulo Platform Architecture
## Complete 3-App Ecosystem

**Version:** 1.0
**Last Updated:** November 17, 2025
**Status:** Planning Phase

---

## Executive Summary

The Vitulo platform consists of **three separate applications** sharing a **single PostgreSQL database**, serving three distinct user groups in the beef calf supply chain.

```
┌─────────────────────────────────────────────────────────────┐
│                    VITULO PLATFORM                          │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Vitulo     │  │   Finisher   │  │    Dairy     │     │
│  │ Management   │  │    Portal    │  │    Portal    │     │
│  │              │  │              │  │              │     │
│  │  (Internal)  │  │ (Customers)  │  │ (Suppliers)  │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                 │             │
│         └─────────────────┴─────────────────┘             │
│                          ↓                                 │
│              ┌───────────────────────┐                     │
│              │  Shared PostgreSQL DB │                     │
│              │   (Single Database)   │                     │
│              └───────────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. System Overview

### Three Applications, One Database

| Application | URL | Users | Purpose |
|-------------|-----|-------|---------|
| **Vitulo Management** | vitulo.vercel.app | Vitulo staff | Internal operations, imports, reconciliation |
| **Finisher Portal** | vitulo-finisher.vercel.app | Beef finishers | Track animals, view kill records, payments |
| **Dairy Portal** | vitulo-dairy.vercel.app | Dairy farmers | View sold calves, payment history, performance |

### Technology Stack

```
┌─────────────────────────────────────────────────────────┐
│                    SHARED STACK                         │
├─────────────────────────────────────────────────────────┤
│  Framework:     Next.js 15 (App Router)                 │
│  Language:      TypeScript                              │
│  Styling:       Tailwind CSS + shadcn/ui                │
│  Database:      PostgreSQL (Supabase/Neon)              │
│  ORM:           Prisma                                  │
│  Auth:          NextAuth.js (JWT)                       │
│  Deployment:    Vercel (3 separate projects)            │
│  API:           REST/tRPC (shared contracts)            │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Detailed Architecture Diagram

```
                        VITULO PLATFORM ARCHITECTURE
                        ============================


USER GROUPS                    APPLICATIONS                    DATABASE
===========                    ============                    ========

┌──────────────┐              ┌──────────────┐
│ Vitulo Staff │──────────────▶│   Vitulo     │
│ (Admin)      │              │ Management   │
└──────────────┘              │              │
                              │ Port: 3000   │
                              │ Auth: Admin  │
                              └──────┬───────┘
                                     │
                                     │
┌──────────────┐              ┌─────▼────────┐               ┌─────────────┐
│   Finisher   │──────────────▶│  Finisher    │───────────────▶│             │
│   Farms      │              │   Portal     │               │             │
│ (Customers)  │              │              │               │             │
└──────────────┘              │ Port: 3001   │               │             │
                              │ Auth: Role   │               │             │
                              └──────┬───────┘               │             │
                                     │                       │  PostgreSQL │
                                     │                       │             │
┌──────────────┐              ┌─────▼────────┐               │  Database   │
│    Dairy     │──────────────▶│    Dairy     │───────────────▶│             │
│   Farmers    │              │   Portal     │               │  (Shared)   │
│ (Suppliers)  │              │              │               │             │
└──────────────┘              │ Port: 3002   │               │             │
                              │ Auth: Role   │               │             │
                              └──────────────┘               └─────────────┘
                                     │                              │
                                     │                              │
                                     └──────────────────────────────┘
                                            ALL APPS SHARE
                                           SAME DATABASE
```

---

## 3. Database Schema (Core Models)

### Entity Relationship Diagram

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│    User     │         │    Farm     │         │   Animal    │
├─────────────┤         ├─────────────┤         ├─────────────┤
│ id          │────┐    │ id          │◀───┐    │ id          │
│ email       │    │    │ name        │    └────│ sourceFarmId│
│ passwordHash│    └───▶│ type        │◀────────│ currentFarmId│
│ role        │         │ location    │         │ tagNumber   │
│ farmId      │────┐    └─────────────┘         │ breed       │
└─────────────┘    │           ▲                │ sex         │
                   │           │                │ dateOfBirth │
                   │           │                │ status      │
                   │           │                └──────┬──────┘
                   │           │                       │
                   │           │                       │
                   │    ┌──────┴───────┐      ┌────────▼────────┐
                   │    │ CalfPurchase │      │   KillRecord    │
                   │    ├──────────────┤      ├─────────────────┤
                   │    │ id           │      │ id              │
                   └───▶│ animalId     │      │ animalId        │
                        │ purchasePrice│      │ dateOfKill      │
                        │ sourceFarmId │      │ deadweight      │
                        │ finisherFarmId│     │ conformationClass│
                        │ transferValue│      │ fatClass        │
                        │ transferDate │      │ carcassValue    │
                        │ paymentStatus│      │ slaughterPayment│
                        └──────────────┘      └─────────────────┘
                               │
                               │
                        ┌──────▼──────────┐
                        │ MonthlyPayment  │
                        ├─────────────────┤
                        │ id              │
                        │ animalId        │
                        │ paymentDate     │
                        │ amount          │
                        └─────────────────┘
```

### Key Enums

```prisma
enum UserRole {
  VITULO_ADMIN      // Full access to management app
  FINISHER          // Access to finisher portal
  DAIRY_SUPPLIER    // Access to dairy portal
}

enum FarmType {
  DAIRY_SUPPLIER    // Source farms (sell calves to Vitulo)
  FINISHER          // Customer farms (buy calves from Vitulo)
  VITULO_OWNED      // Vitulo's own farms
}

enum AnimalStatus {
  ALIVE             // Currently on farm
  SLAUGHTERED       // Processed
  SOLD              // Transferred
  DEAD              // Died on farm
}

enum PaymentStatus {
  PENDING           // Not yet paid
  PAID              // Payment complete
  OVERDUE           // Past due date
}
```

---

## 4. Data Access Patterns

### Vitulo Management App (Full Access)

```typescript
// NO RESTRICTIONS - Can query all data

// View all animals across all farms
const allAnimals = await prisma.animal.findMany();

// View all farms (dairy, finisher, owned)
const allFarms = await prisma.farm.findMany();

// View all financial data
const allPurchases = await prisma.calfPurchase.findMany();
const allKillRecords = await prisma.killRecord.findMany();
```

### Finisher Portal (Farm-Scoped)

```typescript
// RESTRICTED - Only their farm's data

// View only animals on their farm
const myAnimals = await prisma.animal.findMany({
  where: { currentFarmId: session.user.farmId }  // ← SCOPED
});

// View only their kill records
const myKills = await prisma.killRecord.findMany({
  where: {
    animal: {
      currentFarmId: session.user.farmId  // ← SCOPED
    }
  }
});

// CANNOT see:
// - Other finishers' animals
// - Dairy farm information
// - Vitulo's purchase costs from dairy farmers
```

### Dairy Portal (Farm-Scoped)

```typescript
// RESTRICTED - Only calves they sold

// View only calves they sold to Vitulo
const myCalves = await prisma.animal.findMany({
  where: { sourceFarmId: session.user.farmId }  // ← SCOPED
});

// View only their payments
const myPayments = await prisma.calfPurchase.findMany({
  where: { sourceFarmId: session.user.farmId }  // ← SCOPED
});

// CANNOT see:
// - Other dairy farms' calves
// - Finisher farm locations
// - Vitulo's transfer prices to finishers
// - Vitulo's margins
```

---

## 5. Authentication & Authorization

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    LOGIN FLOW                               │
└─────────────────────────────────────────────────────────────┘

1. User enters email/password
        ↓
2. NextAuth verifies credentials
        ↓
3. Check user role (VITULO_ADMIN / FINISHER / DAIRY_SUPPLIER)
        ↓
4. Issue JWT token with:
   - userId
   - farmId
   - role
        ↓
5. Redirect to appropriate app
        ↓
   ┌────────────────┬───────────────┬──────────────┐
   │                │               │              │
   ▼                ▼               ▼              │
VITULO_ADMIN    FINISHER      DAIRY_SUPPLIER      │
   │                │               │              │
   ▼                ▼               ▼              │
Management      Finisher        Dairy             │
Dashboard       Dashboard       Dashboard         │
   │                │               │              │
   └────────────────┴───────────────┴──────────────┘
                    ↓
          All queries scoped by role/farmId
```

### JWT Token Structure

```json
{
  "userId": "user_123",
  "email": "finisher@farm.com",
  "farmId": "farm_456",
  "farmName": "Herdman Farm",
  "role": "FINISHER",
  "iat": 1700000000,
  "exp": 1700086400
}
```

### Middleware Protection

```typescript
// middleware.ts (in each app)
export function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  // Check if user has correct role for this app
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!token) {
      return NextResponse.redirect('/login');
    }

    // Finisher Portal: Only allow FINISHER role
    if (token.role !== 'FINISHER') {
      return NextResponse.redirect('/unauthorized');
    }
  }

  return NextResponse.next();
}
```

---

## 6. API Structure

### REST API Endpoints

```
VITULO MANAGEMENT APP
=====================
/api/animals                    GET    List all animals
/api/animals/:id                GET    Get animal details
/api/farms                      GET    List all farms
/api/purchases/import           POST   Import purchase data
/api/slaughter/import           POST   Import slaughter data
/api/imports/financial          POST   Import kill detail
/api/imports/history            GET    Import history


FINISHER PORTAL
===============
/api/finisher/animals           GET    My animals (scoped)
/api/finisher/kill-records      GET    My kill records (scoped)
/api/finisher/payments          GET    My payments (scoped)
/api/finisher/dashboard         GET    Dashboard stats (scoped)


DAIRY PORTAL
============
/api/dairy/calves               GET    My sold calves (scoped)
/api/dairy/payments             GET    My payment history (scoped)
/api/dairy/performance          GET    My calves' performance (scoped)
/api/dairy/dashboard            GET    Dashboard stats (scoped)
```

### API Security Pattern

```typescript
// Every API endpoint follows this pattern:

export async function GET(request: Request) {
  // 1. Get session
  const session = await getServerSession(authOptions);

  // 2. Verify authentication
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 3. Verify role
  if (session.user.role !== 'FINISHER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 4. Query with farmId scope
  const data = await prisma.animal.findMany({
    where: { currentFarmId: session.user.farmId }  // ← ALWAYS SCOPED
  });

  return NextResponse.json(data);
}
```

---

## 7. Deployment Architecture

### Vercel Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                        VERCEL                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │ vitulo-mgmt      │  │ vitulo-finisher  │               │
│  │ (Project 1)      │  │ (Project 2)      │               │
│  │                  │  │                  │               │
│  │ vitulo.vercel.app│  │ vitulo-finisher  │               │
│  │                  │  │ .vercel.app      │               │
│  └────────┬─────────┘  └────────┬─────────┘               │
│           │                     │                          │
│           │     ┌───────────────┴──────┐                   │
│           │     │ vitulo-dairy         │                   │
│           │     │ (Project 3)          │                   │
│           │     │                      │                   │
│           │     │ vitulo-dairy         │                   │
│           │     │ .vercel.app          │                   │
│           │     └───────────┬──────────┘                   │
│           │                 │                              │
└───────────┼─────────────────┼──────────────────────────────┘
            │                 │
            ▼                 ▼
┌───────────────────────────────────────┐
│      SUPABASE / NEON / RAILWAY        │
│      PostgreSQL Database              │
│                                       │
│  DATABASE_URL (same for all 3 apps)  │
└───────────────────────────────────────┘
```

### Environment Variables (Each App)

```bash
# .env (All 3 apps have same DATABASE_URL)

# Database - SHARED
DATABASE_URL="postgresql://user:pass@db.provider.com:5432/vitulo_prod"

# NextAuth - DIFFERENT per app
NEXTAUTH_SECRET="random-secret-mgmt-app"
NEXTAUTH_URL="https://vitulo.vercel.app"

# App-Specific
NEXT_PUBLIC_APP_NAME="Vitulo Management"
NEXT_PUBLIC_APP_ROLE="VITULO_ADMIN"
```

---

## 8. Data Flow Examples

### Example 1: Dairy Farmer Sells Calves

```
STEP 1: Vitulo buys calves from dairy farm
───────────────────────────────────────────
Vitulo staff uploads File #2/3 (Finisher Delivery)
   ↓
Management App: /api/purchases/import
   ↓
Creates in database:
   - Animal records (sourceFarmId = dairy farm)
   - CalfPurchase records (purchasePrice, sourceFarmId)
   ↓
Dairy farmer logs into Dairy Portal
   ↓
Dashboard shows: "12 new calves purchased"
   ↓
Payments page shows: "£8,456 PENDING"


STEP 2: Vitulo pays dairy farmer
─────────────────────────────────
Vitulo staff marks payment as PAID
   ↓
Update CalfPurchase:
   - paymentStatus = 'PAID'
   - paymentDate = today
   ↓
Dairy Portal refreshes
   ↓
Payments page shows: "£8,456 PAID on Nov 15"
```

### Example 2: Finisher Receives Calves

```
STEP 1: Vitulo delivers calves to finisher
───────────────────────────────────────────
Vitulo staff uploads File #2 (Finisher Delivery)
   ↓
Management App: /api/purchases/import
   ↓
Creates in database:
   - Animal records (currentFarmId = finisher farm)
   - CalfPurchase records (transferValue, finisherFarmId)
   ↓
Finisher logs into Finisher Portal
   ↓
Dashboard shows: "18 new animals on farm"


STEP 2: Animals are slaughtered
────────────────────────────────
Vitulo staff uploads File #1 (Slaughter CSV)
   ↓
Management App: /api/slaughter/import
   ↓
Creates in database:
   - KillRecord entries
   - Updates Animal.status = 'SLAUGHTERED'
   ↓
Finisher Portal refreshes
   ↓
Kill Records page shows: "18 animals slaughtered"
   ↓
Payments page shows: "£23,456 settlement pending"
```

### Example 3: Cross-Portal Data Consistency

```
SAME ANIMAL VIEWED BY 3 USERS
══════════════════════════════

Animal: UK102020107746
Status: SLAUGHTERED

┌───────────────────────────────────────────────────────────┐
│  VITULO MANAGEMENT                                        │
├───────────────────────────────────────────────────────────┤
│  Tag: UK102020107746                                      │
│  Source: Test Dairy Farm                                  │
│  Purchase Price: £670 (paid to dairy)                     │
│  Finisher: Herdman Farm                                   │
│  Transfer Price: £660 (charged to finisher)               │
│  Slaughter: Nov 15, 2025 | 320kg | R3                    │
│  Carcass Value: £2,156                                    │
│  Net to Finisher: £1,969                                  │
│  Vitulo Margin: £10 (transfer - purchase)                │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│  FINISHER PORTAL (Herdman Farm)                           │
├───────────────────────────────────────────────────────────┤
│  Tag: UK102020107746                                      │
│  Received: Jul 14, 2025 | 141kg                           │
│  Days on Farm: 124 days                                   │
│  Slaughter: Nov 15, 2025 | 320kg | R3                    │
│  Carcass Value: £2,156                                    │
│  Deductions: £187 (haulage, BVD, etc.)                   │
│  Settlement: £1,969 PENDING                               │
│                                                           │
│  CANNOT SEE: Purchase price (£670) or transfer price     │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│  DAIRY PORTAL (Test Dairy Farm)                           │
├───────────────────────────────────────────────────────────┤
│  Tag: UK102020107746                                      │
│  Sold: Jul 14, 2025 | 141kg                               │
│  Purchase Price: £670                                     │
│  Payment Status: PAID (Jul 20, 2025)                     │
│                                                           │
│  Performance Feedback:                                    │
│  ├─ Slaughtered: Nov 15, 2025 (124 days)                │
│  ├─ Final Weight: 320kg                                  │
│  ├─ Grade: R3 (Good)                                     │
│  └─ Carcass Value: £2,156                                │
│                                                           │
│  CANNOT SEE: Transfer price, finisher location,          │
│              Vitulo's margin                              │
└───────────────────────────────────────────────────────────┘
```

---

## 9. Security Considerations

### Row-Level Security via Application Logic

```typescript
// Every query includes farmId filter based on user role

// GOOD ✅
const animals = await prisma.animal.findMany({
  where: { currentFarmId: session.user.farmId }
});

// BAD ❌ (would expose all data)
const animals = await prisma.animal.findMany();
```

### Prevent Cross-Farm Data Leaks

```typescript
// Verify ownership before allowing detail view

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  const animal = await prisma.animal.findUnique({
    where: { id: params.id }
  });

  // ⚠️ CRITICAL CHECK
  if (animal.currentFarmId !== session.user.farmId) {
    return NextResponse.json(
      { error: 'Not found' },  // Don't reveal it exists
      { status: 404 }
    );
  }

  return NextResponse.json(animal);
}
```

### API Rate Limiting (Future)

```typescript
// Prevent abuse via rate limiting middleware

import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

export default limiter;
```

---

## 10. Monitoring & Observability

### Logging Strategy

```
┌─────────────────────────────────────────────────────────┐
│                   LOGGING LAYERS                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Application Logs (Vercel)                             │
│  ├─ API request/response                               │
│  ├─ Authentication events                              │
│  ├─ Import job results                                 │
│  └─ Error stack traces                                 │
│                                                         │
│  Database Logs (Supabase/Neon)                         │
│  ├─ Slow queries                                       │
│  ├─ Connection pool usage                              │
│  └─ Failed transactions                                │
│                                                         │
│  Security Audit Log (Future)                           │
│  ├─ Login attempts (success/failure)                   │
│  ├─ Role changes                                       │
│  ├─ Data access by user                                │
│  └─ Export/download events                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 11. Development Workflow

### Local Development Setup

```bash
# 1. Clone all three repos
git clone https://github.com/vitulo/vitulo-mgmt
git clone https://github.com/vitulo/vitulo-finisher
git clone https://github.com/vitulo/vitulo-dairy

# 2. Use SAME database URL in all .env files
# vitulo-mgmt/.env
DATABASE_URL="postgresql://localhost:5432/vitulo_dev"
NEXTAUTH_URL="http://localhost:3000"

# vitulo-finisher/.env
DATABASE_URL="postgresql://localhost:5432/vitulo_dev"  # ← SAME!
NEXTAUTH_URL="http://localhost:3001"

# vitulo-dairy/.env
DATABASE_URL="postgresql://localhost:5432/vitulo_dev"  # ← SAME!
NEXTAUTH_URL="http://localhost:3002"

# 3. Run all three on different ports
cd vitulo-mgmt && npm run dev      # Port 3000
cd vitulo-finisher && npm run dev  # Port 3001
cd vitulo-dairy && npm run dev     # Port 3002
```

### Shared Prisma Schema

```
Option 1: Git Submodule
─────────────────────────
vitulo-shared/
└── prisma/
    └── schema.prisma  ← Single source of truth

Each app: git submodule add https://github.com/vitulo/vitulo-shared


Option 2: npm Package (Better)
───────────────────────────────
@vitulo/database/
├── prisma/
│   └── schema.prisma
└── package.json

Each app: npm install @vitulo/database
```

---

## 12. Roadmap

### Phase 1: Management App (✅ COMPLETE)
- [x] Import system (4 file types)
- [x] Animal tracking
- [x] Farm management
- [x] Import history
- [x] Documentation

### Phase 2: API Layer (🔄 IN PROGRESS)
- [ ] Add User model to Prisma schema
- [ ] Implement NextAuth in management app
- [ ] Create farm-scoped API endpoints
- [ ] Add role-based middleware
- [ ] API documentation

### Phase 3: Finisher Portal (📅 PLANNED)
- [ ] Build portal app from spec
- [ ] Dashboard with summary cards
- [ ] Animals table
- [ ] Kill records page
- [ ] Payments tracking
- [ ] Test with real finisher

### Phase 4: Dairy Portal (📅 PLANNED)
- [ ] Build portal app from spec
- [ ] Dashboard with summary cards
- [ ] Calves sold table
- [ ] Payment history
- [ ] Performance feedback
- [ ] Test with real dairy farmer

### Phase 5: Production Launch (📅 FUTURE)
- [ ] Custom domains for each portal
- [ ] Email notifications
- [ ] PDF exports
- [ ] Mobile apps (React Native)
- [ ] Analytics dashboard

---

## 13. Cost Estimate

### Monthly Operating Costs (Estimated)

```
Database (Supabase Pro)              £20/month
Vercel Pro (3 projects)              £60/month (£20 × 3)
Custom Domains (3)                   £15/year ≈ £1.25/month
Email Service (SendGrid)             £10/month
─────────────────────────────────────────────
TOTAL                                ~£91/month

Per User Cost:
- 1 Vitulo admin + 5 finishers + 10 dairy farms = 16 users
- £91 ÷ 16 = £5.69 per user per month
```

---

## 14. Success Metrics

### Technical KPIs
- API response time < 200ms (p95)
- Database query time < 50ms (p95)
- Uptime > 99.9%
- Zero cross-farm data leaks

### Business KPIs
- Finisher portal adoption: 80% within 6 months
- Dairy portal adoption: 60% within 6 months
- Support tickets reduced by 50%
- Payment inquiry calls reduced by 70%

---

## 15. Risk Analysis

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Database connection leak** | All 3 apps go down | Connection pooling, monitoring |
| **Cross-farm data exposure** | Security breach | Strict farm-scoped queries, auditing |
| **Schema migration breaks app** | App crashes | Shared schema repo, staging environment |
| **JWT token compromise** | Unauthorized access | Short expiry, refresh tokens, IP validation |
| **Vercel serverless timeout** | Import failures | Background jobs, queue system |

---

## 16. Next Steps

### Immediate Actions
1. ✅ Review architecture diagrams
2. ✅ Approve approach (separate apps vs monolith)
3. ⏳ Add User model to Prisma schema
4. ⏳ Implement NextAuth in management app
5. ⏳ Build finisher portal MVP
6. ⏳ Test with Chris/one finisher farm

### Questions to Resolve
- [ ] Should finishers see Vitulo's purchase costs?
- [ ] Should dairy farmers see where their calves ended up?
- [ ] Do we allow data export (CSV/PDF)?
- [ ] Mobile apps needed immediately or later?

---

**Architecture Status:** ✅ Ready for Implementation

**Contact:** Development Team
**Version Control:** GitHub (3 separate repositories)
**Project Management:** [Tool TBD]

---

**Last Updated:** November 17, 2025
**Next Review:** After Phase 2 completion
