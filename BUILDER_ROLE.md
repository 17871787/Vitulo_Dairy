# Dairy Portal - Builder Agent Role

**Last Updated:** November 17, 2025

---

## Your Role: Builder Agent

You are a **BUILDER** working on the Vitulo Dairy Portal. You report to the **ORCHESTRATOR** session (vitulo management repo).

### Authority Level: Limited

- ✅ **You CAN:** Build UI, create API routes, fix bugs, improve UX
- ❌ **You CANNOT:** Modify schema, change database, make architectural decisions

---

## Critical Rules

### 🛑 NEVER DO THESE:

1. **NEVER modify `prisma/schema.prisma`**
   - The schema is managed by the orchestrator
   - It is copied FROM the management app TO this project
   - You only consume it, never modify it

2. **NEVER run these commands:**
   - `npx prisma db push` ❌
   - `npx prisma db pull` ❌
   - `npx prisma migrate dev` ❌
   - `npx prisma migrate deploy` ❌

3. **NEVER add new models or fields**
   - All data model changes happen in orchestrator session
   - Request changes through the user, who will bring them to orchestrator

4. **NEVER skip farm-scoping in queries**
   - Every query MUST filter by `session.user.farmId`
   - This is a security requirement

### ✅ ALWAYS DO THESE:

1. **Use the schema as-is**
   - The schema uses PascalCase models with @map() directives
   - Use camelCase in TypeScript: `animal.breederFarmId`
   - The @map() handles database column mapping automatically

2. **Run `npx prisma generate` when schema updates**
   - After orchestrator copies new schema
   - Regenerates Prisma client types
   - That's the ONLY Prisma command you should run

3. **Farm-scope ALL queries**
   ```typescript
   // ✅ CORRECT - Dairy farm supplied these calves
   const calfsSold = await prisma.calfPurchase.findMany({
     where: {
       animal: {
         breederFarmId: session.user.farmId  // Required!
       }
     }
   });

   // ❌ WRONG - Missing farm-scoping
   const calfsSold = await prisma.calfPurchase.findMany({});
   ```

4. **Ask orchestrator for:**
   - Schema clarifications
   - Data model questions
   - Real farm IDs for testing
   - Cross-app coordination
   - Database migrations

---

## Your Responsibilities

### 1. UI Development
- Build React components
- Implement responsive design
- Create intuitive user experience
- Handle loading/error states

### 2. API Routes
- Create Next.js API routes in `/app/api/dairy/`
- Implement farm-scoped queries
- Return properly formatted JSON
- Handle authentication checks

### 3. Authentication Integration
- Use NextAuth.js for session management
- Check `session.user.farmId` exists
- Verify `session.user.role === 'DAIRY_SUPPLIER'`
- Redirect unauthorized users

### 4. Testing
- Test locally before deploying
- Verify farm-scoping works correctly
- Check authentication flows
- Test with real data when provided

---

## Data Access Pattern

### Dairy Portal Queries

**Calves this dairy farm sold to Vitulo:**
```typescript
const calfsSold = await prisma.calfPurchase.findMany({
  where: {
    animal: {
      breederFarmId: session.user.farmId  // Dairy farm that supplied the calf
    }
  },
  include: {
    animal: {
      include: {
        killRecords: true  // Performance data
      }
    },
    finisherFarm: true  // Where the calf went
  },
  orderBy: {
    purchaseDate: 'desc'
  }
});
```

**Payments received from Vitulo:**
```typescript
const payments = await prisma.payment.findMany({
  where: {
    farmId: session.user.farmId  // Payments to this dairy farm
  },
  include: {
    animalPayments: {
      include: {
        animal: {
          select: {
            tagNumber: true,
            breed: true
          }
        }
      }
    }
  },
  orderBy: {
    paidOn: 'desc'
  }
});
```

**Performance of calves (slaughter data):**
```typescript
const killRecords = await prisma.killRecord.findMany({
  where: {
    animal: {
      breederFarmId: session.user.farmId  // Calves from this dairy farm
    }
  },
  include: {
    animal: {
      select: {
        tagNumber: true,
        breed: true,
        sex: true,
        dateOfBirth: true
      }
    }
  },
  orderBy: {
    killDate: 'desc'
  }
});
```

---

## Schema Naming Convention

### In TypeScript Code (camelCase):
```typescript
animal.tagNumber          // ✅ Correct
animal.breederFarmId      // ✅ Correct
animal.dateOfBirth        // ✅ Correct
calfPurchase.finalPrice   // ✅ Correct
calfPurchase.purchaseDate // ✅ Correct
payment.farmId            // ✅ Correct
killRecord.dateOfKill     // ✅ Correct
```

### NOT Database Columns (snake_case):
```typescript
animal.tag_number         // ❌ Wrong - this will fail
animal.breeder_farm_id    // ❌ Wrong - this will fail
animal.date_of_birth      // ❌ Wrong - this will fail
calfPurchase.final_price  // ❌ Wrong - this will fail
payment.farm_id           // ❌ Wrong - this will fail
```

**Why?** Prisma uses the @map() directives to handle database mapping. You work in TypeScript, not SQL.

---

## Payment System Understanding

### Key Models:

1. **CalfPurchase** - Individual calf purchase records
   - `finalPrice` - What Vitulo paid the dairy farm
   - `purchaseDate` - When the calf was purchased
   - Links to `Animal` via `animalId`

2. **Payment** - Farm-level payments (monthly batches)
   - `farmId` - Which dairy farm receives this payment
   - `amount` - Total payment amount
   - `status` - PAID | PENDING | OVERDUE
   - `paidOn` - When payment was made
   - `periodStart`, `periodEnd` - Payment period

3. **AnimalPayment** - Per-animal allocations within payments
   - Links `Payment` to individual `Animal`
   - Shows which calves are included in each payment
   - `amount` - Per-animal payment amount

### Payment Flow:

```
Dairy Farm sells calf → CalfPurchase (finalPrice)
                           ↓
Monthly period ends → Payment created (sum of calves)
                           ↓
Individual calves → AnimalPayment (allocation)
```

### Query Pattern:

```typescript
// Get payment with breakdown by calf
const payment = await prisma.payment.findUnique({
  where: { id: paymentId },
  include: {
    animalPayments: {
      include: {
        animal: {
          select: {
            tagNumber: true,
            breed: true
          }
        }
      }
    }
  }
});

// Payment shows:
// - Total: £5,234.00
// - Status: PAID
// - Paid on: 2025-11-10
// - Breakdown:
//   - Calf #123: £450
//   - Calf #124: £475
//   - etc.
```

---

## Escalation Guidelines

### When to Ask Orchestrator:

1. **Schema Questions**
   - "What's the difference between CalfPurchase.finalPrice and transferValue?"
   - "How do I find which payments include a specific calf?"
   - "Why is breederFarmId different from sourceFarmId?"

2. **Data Model Confusion**
   - "Should I use Payment or AnimalPayment for payment history?"
   - "How do kill records relate to dairy farms?"

3. **Real Data Needs**
   - "Can I get a real dairy farm ID for testing?"
   - "How do I create test payment data?"

4. **Architectural Decisions**
   - "Should I create a new model for farmer notes?"
   - "Can I add a field to track collection dates?"

### How to Escalate:

1. **Stop work** on the blocked task
2. **Document the question** clearly
3. **User relays to orchestrator** session
4. **Wait for authoritative answer**
5. **Implement the provided solution**

---

## Real Production Data

### Available Dairy Farms:

1. **A R Milne & Son**
   - ID: `09857f32-2030-4976-baee-8b0f3fc72d3c`
   - Has supplied 365 calves
   - Recommended for testing

2. **Oakwood**
   - ID: `bcd9f262-0990-4d23-93b4-dabed4fbc3b9`
   - Has supplied 20 calves

### Demo User Setup:

```typescript
// For testing with real data
{
  email: 'dairy@test.com',
  passwordHash: await bcrypt.hash('test123', 10),
  name: 'Demo Dairy Supplier',
  role: 'DAIRY_SUPPLIER',
  farmId: '09857f32-2030-4976-baee-8b0f3fc72d3c'  // A R Milne & Son
}
```

---

## Workflow When Schema Updates

### Orchestrator updates schema:

1. ✅ Orchestrator modifies `vitulo/prisma/schema.prisma`
2. ✅ Orchestrator runs `npx prisma db push` in management app
3. ✅ Orchestrator copies schema to `vitulo-dairy/prisma/`
4. ✅ User tells you: "Schema updated, run `npx prisma generate`"

### You respond:

```bash
npx prisma generate
npm run build  # Verify types are correct
```

5. ✅ Continue building with new schema

**NEVER** skip step 4 and try to modify schema yourself!

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Using snake_case in queries

```typescript
// WRONG
const calves = await prisma.calfPurchase.findMany({
  where: {
    animal: {
      breeder_farm_id: farmId  // ❌ Will fail!
    }
  }
});
```

```typescript
// CORRECT
const calves = await prisma.calfPurchase.findMany({
  where: {
    animal: {
      breederFarmId: farmId  // ✅ Works!
    }
  }
});
```

### ❌ Mistake 2: Accessing raw column names

```typescript
// WRONG
const price = purchase.final_price;  // ❌ Undefined!
```

```typescript
// CORRECT
const price = purchase.finalPrice;  // ✅ Works!
```

### ❌ Mistake 3: Modifying schema

```typescript
// WRONG - Adding field to User model
model User {
  id       String @id
  email    String @unique
  newField String  // ❌ NEVER DO THIS!
}
```

```typescript
// CORRECT - Ask orchestrator
// "I need to track user preferences.
// Should we add a preferences field to User model?
// Waiting for orchestrator guidance."
```

---

## Development Checklist

Before deploying:

- [ ] All queries use camelCase (not snake_case)
- [ ] All queries include farm-scoping via `breederFarmId`
- [ ] No schema modifications
- [ ] Authentication checks on all routes
- [ ] Error handling in place
- [ ] TypeScript types correct
- [ ] Local build passes (`npm run build`)
- [ ] Tested with real farm ID if available
- [ ] No `prisma db push` in commit history

---

## Related Documentation

- **Architecture:** `docs/VITULO_PLATFORM_ARCHITECTURE.md`
- **Orchestration Guide:** `docs/ORCHESTRATION_GUIDE.md` (in management repo)
- **MVP Spec:** `docs/DAIRY_PORTAL_MVP_PROMPT.md`

---

## Remember

You are a **BUILDER**, not an **ARCHITECT**.

- The orchestrator has the full picture
- The orchestrator owns the schema
- The orchestrator makes architectural decisions
- You focus on building an excellent user experience

When in doubt: **Ask the orchestrator.**

---

**Last Updated:** November 17, 2025
