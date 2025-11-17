# Prompt for Claude: Build Dairy Farmer Portal MVP

## Business Context

Vitulo is a beef calf management company that:
1. **Buys calves from dairy farmers** (Aberdeen Angus, Hereford, etc.)
2. Raises calves or places them with finisher farms
3. Manages slaughter and sales
4. Pays dairy farmers for their calves

We have an existing **Vitulo Management Dashboard** (Next.js 15, Prisma, PostgreSQL) that handles all internal operations. Now we need a **separate portal for dairy farmers** to view their sold calves and payment history.

---

## Current Backend (Shared Database)

### Database Schema (Prisma)

**Key Models:**

```prisma
model Farm {
  id            String   @id @default(cuid())
  name          String
  type          FarmType // DAIRY_SUPPLIER, FINISHER, VITULO_OWNED
  animals       Animal[]
  suppliedCalves CalfPurchase[] @relation("SourceFarm")
}

model Animal {
  id              String   @id @default(cuid())
  tagNumber       String   @unique
  breed           Breed
  sex             Sex
  dateOfBirth     DateTime
  status          AnimalStatus // ALIVE, SLAUGHTERED, SOLD
  sourceFarmId    String?  // Dairy farm that sold calf
  sourceFarm      Farm?    @relation(fields: [sourceFarmId])
  currentFarmId   String?  // Current location
  currentFarm     Farm?    @relation(fields: [currentFarmId])
  calfPurchase    CalfPurchase?
  killRecord      KillRecord?
  createdAt       DateTime @default(now())
}

model CalfPurchase {
  id               String   @id @default(cuid())
  animalId         String   @unique
  animal           Animal   @relation(fields: [animalId])
  purchasePrice    Decimal  // What Vitulo paid dairy farmer
  purchaseDate     DateTime
  purchaseWeight   Decimal?
  sourceFarmId     String?  // Dairy farm
  sourceFarm       Farm?    @relation("SourceFarm", fields: [sourceFarmId])
  transferValue    Decimal? // What finisher pays Vitulo (dairy doesn't see)
  transferDate     DateTime?
  finisherFarmId   String?
  importedFrom     String?
  paymentStatus    PaymentStatus? // PENDING, PAID
  paymentDate      DateTime?
}

model KillRecord {
  id                  String   @id @default(cuid())
  animalId            String   @unique
  animal              Animal   @relation(fields: [animalId])
  dateOfKill          DateTime
  deadweight          Decimal  // kg
  fatClass            String   // 1-5
  conformationClass   String   // E, U, R, O, P
  carcassValue        Decimal
}

enum PaymentStatus {
  PENDING
  PAID
  OVERDUE
}
```

### API Base URL
```
https://vitulo.vercel.app/api
```

### Authentication (To Be Implemented)
- Use NextAuth.js with JWT tokens
- Each dairy farm gets login credentials
- Token includes `farmId` to scope queries

---

## Dairy Portal MVP Requirements

### Target User: Dairy Farmer

**What they need to see:**
1. **Calves Sold** - All calves they've sold to Vitulo
2. **Payment History** - What they've been paid and when
3. **Performance Feedback** - How their calves performed (optional, good for relationship)
4. **Delivery Schedule** - Upcoming collections (future enhancement)

**What they DON'T need:**
- Other dairy farms' data
- Finisher information
- Vitulo's margins or transfer prices
- Internal Vitulo operations

---

## MVP Feature Specification

### 1. Dashboard (Home Page)

**Layout:**
```
┌─────────────────────────────────────────┐
│  [Farm Name] Dashboard                  │
├─────────────────────────────────────────┤
│  Summary Cards:                         │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐  │
│  │ 156     │ │ £45,678 │ │ £2,340   │  │
│  │ Calves  │ │ Total   │ │ Pending  │  │
│  │ Sold    │ │ Earned  │ │ Payment  │  │
│  └─────────┘ └─────────┘ └──────────┘  │
│                                         │
│  Recent Activity:                       │
│  - Payment received £5,234 (Nov 10)     │
│  - 12 calves collected (Nov 5)          │
│  - 8 calves scheduled for pickup        │
└─────────────────────────────────────────┘
```

**Data Required:**
- Count of animals where `sourceFarmId = user.farmId`
- Sum of all `calfPurchase.purchasePrice` for their calves
- Sum of unpaid purchases (`paymentStatus = 'PENDING'`)
- Recent transactions (last 30 days)

---

### 2. Calves Sold Page

**Features:**
- **Table View** with columns:
  - Tag Number
  - Breed
  - Sex
  - Date of Birth
  - Sold Date (purchaseDate)
  - Sold Weight (purchaseWeight)
  - **Price Paid** (purchasePrice)
  - Payment Status (Pending / Paid)
  - Current Status (Alive / Slaughtered)

- **Filters:**
  - Payment Status: All / Paid / Pending
  - Breed dropdown
  - Date range picker

- **Sorting:** All columns sortable

- **Search:** Filter by tag number

**Sample Data:**
```
Tag Number      | Breed | Sex | DOB        | Sold      | Weight | Price   | Payment | Status
UK102020107746  | AAX   | F   | 2025-01-12 | 2025-07-14| 141kg  | £670.00 | PAID    | ALIVE
UK123741310156  | BBX   | F   | 2025-01-03 | 2025-07-14| 160kg  | £720.00 | PENDING | ALIVE
```

**API Endpoint:**
```
GET /api/dairy/calves?farmId={farmId}
```

**Business Logic:**
- Show ALL calves they've ever sold to Vitulo
- Include current status (alive at finisher, slaughtered, etc.)
- Clear indication of payment status

---

### 3. Payments Page

**Features:**
- **Payment History Table:**
  - Payment Date
  - Number of Calves
  - Total Amount
  - Payment Method (Bank Transfer, Check, etc.)
  - Invoice Number / Reference

- **Grouped by Month:**
  ```
  November 2025 - £5,234.00
  ├─ 2025-11-10 | 12 calves | £5,234.00 | Bank Transfer | INV-2025-11-001

  October 2025 - £8,456.00
  ├─ 2025-10-15 | 18 calves | £8,456.00 | Bank Transfer | INV-2025-10-002
  ├─ 2025-10-02 | 6 calves  | £2,340.00 | Bank Transfer | INV-2025-10-001
  ```

- **Summary Stats:**
  - Total earned (all time)
  - Average price per calf
  - Payment trend chart (monthly)

- **Outstanding Payments:**
  - Clear section showing unpaid calves
  - Number of days pending
  - Expected payment date (if available)

**API Endpoint:**
```
GET /api/dairy/payments?farmId={farmId}
```

---

### 4. Performance Dashboard (Optional MVP+)

**Purpose:** Show dairy farmers how their genetics/breeding program is performing

**Features:**
- **Slaughter Performance** (for calves that have been slaughtered):
  - Average deadweight
  - Grade distribution (R3, U3, etc.)
  - Average carcass value
  - Compare to industry benchmarks

- **Charts:**
  - Average weight gain over time
  - Grade distribution pie chart
  - Breed performance comparison

**Sample Layout:**
```
┌─────────────────────────────────────────┐
│  Performance Metrics (Last 12 Months)   │
├─────────────────────────────────────────┤
│  Calves Slaughtered: 47                 │
│  Avg Deadweight: 324kg (↑ 5% vs prev)   │
│  Avg Grade: R3                          │
│  Top Grade Count: 12 calves (R4+)       │
│                                         │
│  [Pie Chart: Grade Distribution]        │
│  [Line Chart: Weight Trend]             │
└─────────────────────────────────────────┘
```

**Why This Matters:**
- Helps dairy farmers improve breeding decisions
- Shows Vitulo values the partnership
- Differentiates Vitulo from competitors

**API Endpoint:**
```
GET /api/dairy/performance?farmId={farmId}
```

---

## Technical Requirements

### Stack (Must Match Management App)

- **Framework:** Next.js 15 (App Router)
- **Database:** Shared PostgreSQL via Prisma
- **Styling:** Tailwind CSS + shadcn/ui components
- **Auth:** NextAuth.js (JWT strategy)
- **Charts:** Recharts or Chart.js
- **Deployment:** Vercel

### Project Structure

```
vitulo-dairy-portal/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx              # Dashboard
│   │   │   ├── calves/
│   │   │   │   └── page.tsx          # Calves sold
│   │   │   ├── payments/
│   │   │   │   └── page.tsx          # Payment history
│   │   │   └── performance/
│   │   │       └── page.tsx          # Performance metrics (optional)
│   │   ├── api/
│   │   │   └── dairy/
│   │   │       ├── calves/route.ts
│   │   │       ├── payments/route.ts
│   │   │       └── performance/route.ts
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                        # shadcn components
│   │   ├── dashboard/
│   │   │   ├── SummaryCard.tsx
│   │   │   └── RecentActivity.tsx
│   │   ├── calves/
│   │   │   ├── CalvesTable.tsx
│   │   │   └── CalfFilters.tsx
│   │   ├── payments/
│   │   │   ├── PaymentHistory.tsx
│   │   │   └── OutstandingPayments.tsx
│   │   └── nav/
│   │       └── DairyNav.tsx
│   └── lib/
│       ├── auth.ts                    # NextAuth config
│       ├── prisma.ts                  # Prisma client
│       └── utils.ts
├── prisma/
│   └── schema.prisma                  # Same as management app
├── .env.local
│   DATABASE_URL=postgresql://...      # Same DB!
│   NEXTAUTH_SECRET=...
│   NEXTAUTH_URL=http://localhost:3002
└── package.json
```

---

## API Implementation

### Example: Calves Endpoint

```typescript
// src/app/api/dairy/calves/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.farmId || session.user.role !== 'DAIRY_SUPPLIER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const calves = await prisma.animal.findMany({
    where: {
      sourceFarmId: session.user.farmId,
    },
    include: {
      calfPurchase: {
        select: {
          purchasePrice: true,
          purchaseDate: true,
          purchaseWeight: true,
          paymentStatus: true,
          paymentDate: true,
        },
      },
      killRecord: {
        select: {
          dateOfKill: true,
          deadweight: true,
          conformationClass: true,
          fatClass: true,
          carcassValue: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return NextResponse.json(calves);
}
```

### Example: Payments Endpoint

```typescript
// src/app/api/dairy/payments/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.farmId || session.user.role !== 'DAIRY_SUPPLIER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get all purchases from this dairy farm
  const purchases = await prisma.calfPurchase.findMany({
    where: {
      sourceFarmId: session.user.farmId,
    },
    include: {
      animal: {
        select: {
          tagNumber: true,
          breed: true,
        },
      },
    },
    orderBy: {
      purchaseDate: 'desc',
    },
  });

  // Group by payment date/batch
  const paymentGroups = purchases.reduce((acc, purchase) => {
    const key = purchase.paymentDate?.toISOString() || 'PENDING';
    if (!acc[key]) {
      acc[key] = {
        paymentDate: purchase.paymentDate,
        status: purchase.paymentStatus,
        calves: [],
        totalAmount: 0,
      };
    }
    acc[key].calves.push(purchase);
    acc[key].totalAmount += Number(purchase.purchasePrice);
    return acc;
  }, {} as Record<string, any>);

  return NextResponse.json({
    payments: Object.values(paymentGroups),
    summary: {
      totalEarned: purchases.reduce((sum, p) => sum + Number(p.purchasePrice), 0),
      totalPaid: purchases
        .filter(p => p.paymentStatus === 'PAID')
        .reduce((sum, p) => sum + Number(p.purchasePrice), 0),
      totalPending: purchases
        .filter(p => p.paymentStatus === 'PENDING')
        .reduce((sum, p) => sum + Number(p.purchasePrice), 0),
    },
  });
}
```

---

## Authentication Setup

### NextAuth Configuration

```typescript
// src/lib/auth.ts
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from './prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { farm: true },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        // Verify user is a dairy supplier
        if (user.role !== 'DAIRY_SUPPLIER') {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          farmId: user.farmId,
          farmName: user.farm?.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.farmId = user.farmId;
        token.farmName = user.farmName;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.farmId = token.farmId as string;
        session.user.farmName = token.farmName as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};
```

---

## UI/UX Guidelines

### Design System
- Use **shadcn/ui** components (same as management app)
- Color scheme: **Blue/green pastoral tones** (dairy farm aesthetic)
- Simple, clean interface (farmers may not be tech-savvy)
- Large fonts, clear labels
- Mobile-friendly (farmers may check on phones)

### Navigation

```
┌─────────────────────────────────────┐
│  [Logo] Vitulo Dairy Portal          │
├─────────────────────────────────────┤
│  Dashboard                          │
│  Calves Sold                        │
│  Payments                           │
│  Performance (optional)             │
│  [Logout]                           │
└─────────────────────────────────────┘
```

### Color-Coded Payment Status

```typescript
const getStatusBadge = (status: PaymentStatus) => {
  switch (status) {
    case 'PAID':
      return <Badge variant="success">Paid</Badge>;
    case 'PENDING':
      return <Badge variant="warning">Pending</Badge>;
    case 'OVERDUE':
      return <Badge variant="destructive">Overdue</Badge>;
  }
};
```

---

## MVP Deliverables

### Phase 1: Core Infrastructure (Week 1)
- [ ] Next.js project setup
- [ ] Connect to shared Prisma database
- [ ] NextAuth.js authentication (dairy role only)
- [ ] Protected route middleware
- [ ] Basic navigation layout

### Phase 2: Calves & Dashboard (Week 2)
- [ ] Dashboard with summary cards
- [ ] Calves sold table with filters
- [ ] API endpoints for calves
- [ ] Payment status indicators
- [ ] Responsive design

### Phase 3: Payments (Week 3)
- [ ] Payment history list
- [ ] Outstanding payments section
- [ ] Payment summary statistics
- [ ] API endpoints
- [ ] Date filtering

### Phase 4: Performance (Optional - Week 4)
- [ ] Performance metrics page
- [ ] Charts (weight, grades)
- [ ] Breed comparison
- [ ] Industry benchmarks

### Phase 5: Polish & Testing (Week 4)
- [ ] Error handling
- [ ] Loading states
- [ ] Test with real data
- [ ] Deploy to Vercel
- [ ] Create test dairy account

---

## Environment Setup

### .env.local

```bash
# Database (SAME as management app!)
DATABASE_URL="postgresql://user:pass@host:5432/vitulo_db"

# NextAuth
NEXTAUTH_SECRET="generate-random-secret"
NEXTAUTH_URL="http://localhost:3002"

# App Config
NEXT_PUBLIC_APP_NAME="Vitulo Dairy Portal"
```

---

## Test Data Setup

Create a test dairy farm and user:

```sql
-- Insert test dairy farm
INSERT INTO "Farm" (id, name, type, location, "createdAt", "updatedAt")
VALUES ('test-dairy-farm', 'Test Dairy Farm', 'DAIRY_SUPPLIER', 'Test Location', NOW(), NOW());

-- Insert test user
INSERT INTO "User" (id, email, name, "passwordHash", role, "farmId", "createdAt", "updatedAt")
VALUES (
  'test-dairy-user',
  'dairy@test.com',
  'Test Dairy Farmer',
  '$2a$10$XQfj8F7kJZ9Y5vN3QH2Z1.KZ5XK5YJ5K5YJ5K5YJ5K5YJ5K5YJ5K5',  -- password: "test123"
  'DAIRY_SUPPLIER',
  'test-dairy-farm',
  NOW(),
  NOW()
);

-- Insert test calves
INSERT INTO "Animal" (id, "tagNumber", breed, sex, "dateOfBirth", status, "sourceFarmId", "createdAt", "updatedAt")
VALUES
  ('test-calf-1', 'UK102020107746', 'ANGUS', 'FEMALE', '2025-01-12', 'ALIVE', 'test-dairy-farm', NOW(), NOW()),
  ('test-calf-2', 'UK123741310156', 'HEREFORD', 'FEMALE', '2025-01-03', 'ALIVE', 'test-dairy-farm', NOW(), NOW());

-- Insert test purchases
INSERT INTO "CalfPurchase" (id, "animalId", "purchasePrice", "purchaseDate", "purchaseWeight", "sourceFarmId", "paymentStatus", "createdAt", "updatedAt")
VALUES
  ('test-purchase-1', 'test-calf-1', 670.00, '2025-07-14', 141.7, 'test-dairy-farm', 'PAID', NOW(), NOW()),
  ('test-purchase-2', 'test-calf-2', 720.00, '2025-07-14', 160.2, 'test-dairy-farm', 'PENDING', NOW(), NOW());
```

---

## Enhanced Features (Post-MVP)

### 1. Invoice Download
- PDF generation of payment invoices
- Download all invoices for tax purposes
- Email invoices automatically

### 2. Delivery Scheduling
- Calendar view of upcoming collections
- Request pickup for ready calves
- Notifications before collection

### 3. Calf Upload
- Dairy farmer uploads manifest of available calves
- Vitulo approves and schedules collection
- Reduces manual data entry

### 4. Communication
- Message center to communicate with Vitulo
- Request information about specific calves
- Report issues or concerns

### 5. Contract Management
- View pricing agreements
- Historical pricing trends
- Contract renewal notifications

---

## Success Criteria

✅ **MVP is successful if:**
1. Dairy farmer can log in with credentials
2. Dashboard shows accurate calf counts and payments
3. Calves table displays all sold calves with payment status
4. Payments page shows complete payment history
5. All queries are scoped to dairy farmId (security)
6. Mobile-responsive for phone/tablet use
7. No access to other dairy farms' data
8. Clear indication of pending vs paid invoices

---

## Business Value Propositions

### For Vitulo:
- **Transparency builds trust** - Farmers see exactly what they're owed
- **Reduces support calls** - Self-service payment info
- **Competitive advantage** - Most competitors don't offer this
- **Data accuracy** - Farmers can flag discrepancies

### For Dairy Farmers:
- **Visibility** - See all calves sold and their status
- **Peace of mind** - Track pending payments
- **Performance feedback** - Learn which genetics perform best
- **Professional partnership** - Modern, transparent business relationship

---

## Questions to Clarify

1. Should dairy farmers see carcass values (how much their calves sold for at slaughter)?
2. Do we show live location of calves (which finisher farm they're at)?
3. Should farmers be able to dispute payment amounts?
4. Do we show Vitulo's margin (purchase price vs sale price)?
5. Can farmers see historical price trends for their farm?

**Recommendation:** Keep MVP simple - show purchase price, payment status, and basic performance. Add pricing transparency in later versions.

---

## Build Instructions for Claude

Please build a complete Next.js 15 application following this specification. Start with:

1. Project initialization and dependencies
2. Prisma schema updates (add PaymentStatus enum if missing)
3. NextAuth.js authentication (dairy role enforcement)
4. Dashboard page with summary cards
5. Calves sold table with payment status
6. Payments history page
7. (Optional) Performance metrics page
8. Responsive navigation
9. Deployment configuration

Provide complete, production-ready code for each file. Use TypeScript, Tailwind CSS, and shadcn/ui components.

Focus on:
- **Clarity** - Simple, easy-to-understand UI
- **Trust** - Transparent payment information
- **Mobile-first** - Farmers use phones
- **Security** - Strict farm-scoped queries

---

**Ready to build? Let's create the dairy portal MVP!**
