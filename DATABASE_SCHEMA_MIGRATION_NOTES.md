# Database Schema Migration Notes

## Current Status

The dairy portal was built with a simplified schema, but the production database has a more complex structure from the management app. Here's what needs to be aligned:

## Schema Differences

### CalfPurchase Model

**Expected (Dairy Portal):**
- `purchasePrice` - What Vitulo paid the dairy
- `purchaseWeight` - Weight at purchase
- `paymentStatus` - PENDING, PAID, OVERDUE
- `paymentDate` - When payment was made

**Actual (Production DB):**
- `final_price` - Final price paid
- `weight_at_purchase` - Weight at purchase
- No payment tracking fields (payments tracked separately in `payments` and `animal_payments` tables)

### Payment Tracking

The production database uses a separate payment system:
- `payments` table - Tracks farm-level payments
- `animal_payments` table - Tracks individual animal payments linked to payment batches

### Missing Fields for Dairy Portal

To make the dairy portal fully functional, we need to either:

1. **Option A: Use existing payment tables**
   - Query `animal_payments` JOIN `payments` to get payment status
   - Map payment status based on whether `payments.status = 'PAID'`

2. **Option B: Add simplified fields** (Recommended for MVP)
   - Keep the portal simple
   - Show all calves as "Payment tracked separately"
   - Link to payment history from monthly payments table

## Updated API Routes Needed

### 1. `/api/dairy/calves` ✅ PARTIAL
- Maps `final_price` → `purchasePrice`
- Maps `weight_at_purchase` → `purchaseWeight`
- Sets default `paymentStatus` to `'PENDING'`
- **TODO:** Query animal_payments to get actual payment status

### 2. `/api/dairy/payments` ❌ NEEDS UPDATE
- Should query `payments` table WHERE `farm_id = session.user.farmId`
- Join with `animal_payments` to get individual animal details
- Group by month

### 3. `/api/dairy/performance` ❌ NEEDS UPDATE
- No `KillRecord` model exists in production
- Use `kill_records` table instead
- Fields are different (kill_date, net_weight_1, conformation, etc.)

## SQL to Create Test Dairy User

Run `create-test-dairy-user.sql` to create a test account:
- Email: dairy@test.com
- Password: test123
- Farm: Test Dairy Farm

## Next Steps

1. ✅ Update `/api/dairy/calves` to use actual schema (done)
2. ⏳ Update `/api/dairy/payments` to query payments table
3. ⏳ Update `/api/dairy/performance` to use kill_records
4. ⏳ Update dashboard calculations
5. ⏳ Test with real data

## Quick Fix Approach

For MVP, simplify the portal:
1. Show calves sold with prices (working)
2. Show "Payment information available from Vitulo staff" message
3. Remove payment status filtering until payment system is integrated
4. Remove performance page until kill_records integration is complete
