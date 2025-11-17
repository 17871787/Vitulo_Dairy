import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding demo data for Dairy Portal...');

  // 1. Create demo dairy farm
  console.log('Creating demo dairy farm...');
  const demoFarm = await prisma.farm.upsert({
    where: { managerEmail: 'dairy-demo@vitulo.com' },
    update: {},
    create: {
      name: 'Demo Dairy Farm',
      managerName: 'Test Manager',
      managerEmail: 'dairy-demo@vitulo.com',
      managerPhone: '01234567890',
      address: 'Demo Farm Address, Cumbria',
      farmType: 'DAIRY_SUPPLIER',
      status: 'ACTIVE',
    },
  });
  console.log(`✅ Created farm: ${demoFarm.name} (${demoFarm.id})`);

  // 2. Create demo user
  console.log('Creating demo user...');
  const passwordHash = await bcrypt.hash('test123', 10);
  const demoUser = await prisma.user.upsert({
    where: { email: 'dairy@test.com' },
    update: {
      passwordHash,
      name: 'Demo Dairy Supplier',
      role: 'DAIRY_SUPPLIER',
      farmId: demoFarm.id,
    },
    create: {
      email: 'dairy@test.com',
      passwordHash,
      name: 'Demo Dairy Supplier',
      role: 'DAIRY_SUPPLIER',
      farmId: demoFarm.id,
    },
  });
  console.log(`✅ Created user: ${demoUser.email}`);
  console.log(`   Login credentials: dairy@test.com / test123`);

  // 3. Create Vitulo site farm (where calves are transferred)
  console.log('Creating Vitulo site farm...');
  const vituloFarm = await prisma.farm.upsert({
    where: { managerEmail: 'vitulo-site@vitulo.com' },
    update: {},
    create: {
      name: 'Vitulo Main Site',
      managerName: 'Vitulo Manager',
      managerEmail: 'vitulo-site@vitulo.com',
      farmType: 'VITULO_SITE',
      status: 'ACTIVE',
    },
  });
  console.log(`✅ Created Vitulo site: ${vituloFarm.name} (${vituloFarm.id})`);

  // 4. Create demo animals with CalfPurchase records
  console.log('Creating demo animals with purchase records...');
  const breeds = ['HOLSTEIN', 'ANGUS', 'HEREFORD', 'LIMOUSIN'] as const;
  const baseDate = new Date('2024-01-01');

  for (let i = 0; i < 15; i++) {
    const purchaseDate = new Date(baseDate);
    purchaseDate.setDate(baseDate.getDate() + (i * 7)); // One week apart

    const birthDate = new Date(purchaseDate);
    birthDate.setDate(purchaseDate.getDate() - 30); // Born 30 days before purchase

    const breed = breeds[i % breeds.length];
    const weight = 45 + Math.random() * 15; // 45-60 kg
    const basePrice = 180 + Math.random() * 40; // £180-220
    const finalPrice = basePrice + (weight * 2); // Price adjusted for weight

    const animal = await prisma.animal.create({
      data: {
        tagNumber: `UK${String(300000 + i).padStart(6, '0')}`,
        breed,
        sex: 'MALE',
        dateOfBirth: birthDate,
        breederFarmId: demoFarm.id,
        currentFarmId: vituloFarm.id,
        status: 'ACTIVE',
        monthlyCost: 120,
        arrivalDate: purchaseDate,
        transferDate: purchaseDate,
        transferWeight: weight,
        sourceType: 'PURCHASE',
      },
    });

    await prisma.calfPurchase.create({
      data: {
        animalId: animal.id,
        purchaseDate,
        sourceType: 'DAIRY_FARM',
        sourceName: demoFarm.name,
        basePrice,
        weightAtPurchase: weight,
        weightAdjustment: weight * 2,
        finalPrice,
        transferDate: purchaseDate,
        transferWeight: weight,
        finisherFarmId: vituloFarm.id,
        notes: 'Demo data - seeded automatically',
      },
    });

    console.log(`✅ Created animal: ${animal.tagNumber} - ${breed} - £${finalPrice.toFixed(2)}`);
  }

  // 5. Create demo payment records
  console.log('Creating demo payment records...');

  // Get all animals for this farm
  const farmAnimals = await prisma.animal.findMany({
    where: { breederFarmId: demoFarm.id },
    include: { calfPurchase: true },
  });

  // Create 2 payment batches
  const payment1Date = new Date('2024-02-01');
  const payment2Date = new Date('2024-03-01');

  // First payment (first 7 animals)
  const payment1Animals = farmAnimals.slice(0, 7);
  const payment1Total = payment1Animals.reduce(
    (sum, a) => sum + Number(a.calfPurchase?.finalPrice || 0),
    0
  );

  const payment1 = await prisma.payment.create({
    data: {
      farmId: demoFarm.id,
      amount: payment1Total,
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-01-31'),
      status: 'PAID',
      method: 'BANK_TRANSFER',
      paidOn: payment1Date,
      reference: 'DEMO-PAY-001',
      notes: 'Demo payment - first batch',
    },
  });

  for (const animal of payment1Animals) {
    await prisma.animalPayment.create({
      data: {
        animalId: animal.id,
        farmId: demoFarm.id,
        paymentId: payment1.id,
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
        amount: Number(animal.calfPurchase?.finalPrice || 0),
        notes: 'Demo payment allocation',
      },
    });
  }
  console.log(`✅ Created payment 1: £${payment1Total.toFixed(2)} (PAID)`);

  // Second payment (remaining animals - PENDING)
  const payment2Animals = farmAnimals.slice(7);
  const payment2Total = payment2Animals.reduce(
    (sum, a) => sum + Number(a.calfPurchase?.finalPrice || 0),
    0
  );

  const payment2 = await prisma.payment.create({
    data: {
      farmId: demoFarm.id,
      amount: payment2Total,
      periodStart: new Date('2024-02-01'),
      periodEnd: new Date('2024-02-29'),
      status: 'PENDING',
      method: 'BANK_TRANSFER',
      reference: 'DEMO-PAY-002',
      notes: 'Demo payment - second batch (pending)',
    },
  });

  for (const animal of payment2Animals) {
    await prisma.animalPayment.create({
      data: {
        animalId: animal.id,
        farmId: demoFarm.id,
        paymentId: payment2.id,
        periodStart: new Date('2024-02-01'),
        periodEnd: new Date('2024-02-29'),
        amount: Number(animal.calfPurchase?.finalPrice || 0),
        notes: 'Demo payment allocation',
      },
    });
  }
  console.log(`✅ Created payment 2: £${payment2Total.toFixed(2)} (PENDING)`);

  // 6. Create some kill records for performance data (first 5 animals)
  console.log('Creating demo kill records...');
  const conformations = ['R', 'U', 'O', 'P'];
  const fatClasses = ['2', '3', '4L', '4H'];

  for (let i = 0; i < 5; i++) {
    const animal = farmAnimals[i];
    const killDate = new Date('2024-06-01');
    killDate.setDate(killDate.getDate() + (i * 7));

    const deadweight = 280 + Math.random() * 60; // 280-340kg
    const pricePerKg = 4.2 + Math.random() * 0.8; // £4.20-5.00/kg
    const value = deadweight * pricePerKg;

    await prisma.killRecord.create({
      data: {
        animalId: animal.id,
        killDate,
        killNumber: 1000 + i,
        site: 'Demo Abattoir',
        lot: `LOT-${i + 1}`,
        conformation: conformations[i % conformations.length],
        fatClass: fatClasses[i % fatClasses.length],
        totalWeight: deadweight,
        value,
        pricePerKg,
      },
    });

    console.log(`✅ Created kill record: ${animal.tagNumber} - ${deadweight.toFixed(1)}kg - £${value.toFixed(2)}`);
  }

  console.log('\n✅ Demo data seeding complete!');
  console.log('\n📊 Summary:');
  console.log(`   Farm: ${demoFarm.name}`);
  console.log(`   User: dairy@test.com / test123`);
  console.log(`   Animals: ${farmAnimals.length}`);
  console.log(`   Payments: 2 (1 paid, 1 pending)`);
  console.log(`   Kill Records: 5`);
  console.log(`\n🌐 Login at: https://vitulo-dairy-gl2pdn979-joe-towers-projects.vercel.app/login`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
