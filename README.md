# Vitulo Dairy Portal

A secure, mobile-friendly portal for dairy farmers to view their calf sales and payment history with Vitulo.

## Features

### 🏠 Dashboard
- Summary cards showing total calves sold, revenue, and pending payments
- Recent activity feed
- Month-over-month trends
- Quick action cards for easy navigation

### 🐄 Calves Sold
- Complete table of all calves sold to Vitulo
- Real-time payment status tracking
- Advanced filtering by payment status, breed, and date
- Search by tag number
- Sortable columns
- Export functionality

### 💰 Payments
- Monthly payment history
- Outstanding payment alerts
- Detailed breakdown of paid vs pending
- Expandable monthly views
- Invoice tracking
- Overdue payment warnings

### 📊 Performance (Optional)
- Slaughter performance metrics
- Grade distribution charts
- Breed comparison analysis
- Monthly trends
- Industry benchmark comparisons
- Carcass value tracking

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with JWT
- **Styling**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **Deployment**: Vercel

## Setup Instructions

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd vitulo-dairy-portal
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your database credentials:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/vitulo_db"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3002"
```

4. Setup the database:
```bash
npx prisma generate
npx prisma db push
```

5. Create test data (optional):
```bash
npx prisma db seed
```

6. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3002](http://localhost:3002) in your browser.

## Database Setup

### Creating a Test Dairy User

Run this SQL to create a test dairy farm and user:

```sql
-- Create test farm
INSERT INTO "Farm" (id, name, type, location, "createdAt", "updatedAt")
VALUES ('test-dairy-1', 'Test Dairy Farm', 'DAIRY_SUPPLIER', 'Cumbria, UK', NOW(), NOW());

-- Create test user (password: test123)
INSERT INTO "User" (id, email, name, "passwordHash", role, "farmId", "createdAt", "updatedAt")
VALUES (
  'test-user-1',
  'dairy@test.com',
  'Test Farmer',
  '$2a$10$K7L1OJ0TfPi8dZ6hXH3d2OQkPqN4Nic9XmB6QoNXkqXkLxR3bqWEa',
  'DAIRY_SUPPLIER',
  'test-dairy-1',
  NOW(),
  NOW()
);
```

## Deployment

### Deploy to Vercel

1. Push your code to GitHub

2. Import project in Vercel:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Configure environment variables
   - Deploy

3. Set environment variables in Vercel:
   - `DATABASE_URL` - Your production PostgreSQL connection string
   - `NEXTAUTH_SECRET` - Generate a secure secret
   - `NEXTAUTH_URL` - Your production URL (e.g., https://dairy.vitulo.com)

### Production Database

Ensure your production database has:
- SSL enabled for connections
- Regular backups configured
- Proper indexes on frequently queried fields:
  ```sql
  CREATE INDEX idx_animal_source_farm ON "Animal"("sourceFarmId");
  CREATE INDEX idx_purchase_source_farm ON "CalfPurchase"("sourceFarmId");
  CREATE INDEX idx_purchase_payment_status ON "CalfPurchase"("paymentStatus");
  ```

## Security Features

- ✅ JWT-based authentication
- ✅ Role-based access control (DAIRY_SUPPLIER only)
- ✅ Farm-scoped data queries
- ✅ Secure session management
- ✅ Protected API routes
- ✅ SQL injection prevention via Prisma
- ✅ HTTPS enforcement in production

## Mobile Optimization

- Responsive design for all screen sizes
- Touch-friendly interface elements
- Larger text on mobile devices
- Collapsible navigation menu
- Optimized table scrolling
- Fast load times

## API Endpoints

All endpoints require authentication and DAIRY_SUPPLIER role:

- `GET /api/dairy/calves` - Fetch all calves for the authenticated farm
- `GET /api/dairy/payments` - Fetch payment history
- `GET /api/dairy/performance` - Fetch performance metrics

## Customization

### Branding
- Update colors in `tailwind.config.js`
- Replace logo in navigation component
- Modify company name in `.env.local`

### Adding Features
- Invoice PDF generation
- Email notifications
- SMS alerts
- Delivery scheduling
- Direct messaging

## Support

For issues or questions:
- Email: support@vitulo.com
- Phone: 01234 567890
- Documentation: docs.vitulo.com

## License

Private - Vitulo Ltd. All rights reserved.

---

Built with ❤️ for UK dairy farmers by Vitulo
