import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const prisma = new PrismaClient();

async function addTestAnimals() {
  console.log('🐄 Adding test animals to Test Dairy Farm...\n');

  // Get the test farm
  const testFarm = await prisma.farm.findUnique({
    where: { managerEmail: 'dairy@test.com' },
  });

  if (!testFarm) {
    console.log('❌ Test Dairy Farm not found');
    return;
  }

  console.log(`✅ Found farm: ${testFarm.name} (${testFarm.id})\n`);

  // Get or create Vitulo site farm
  let vituloFarm = await prisma.farm.findFirst({
    where: { farmType: 'VITULO_SITE' },
  });

  if (!vituloFarm) {
    vituloFarm = await prisma.farm.create({
      data: {
        name: 'Vitulo Main Site',
        managerName: 'Vitulo Manager',
        managerEmail: 'vitulo-site@vitulo.com',
        farmType: 'VITULO_SITE',
        status: 'ACTIVE',
      },
    });
    console.log(`✅ Created Vitulo site: ${vituloFarm.name}\n`);
  }

  // Create demo animals
  const breeds = ['HOLSTEIN', 'ANGUS', 'HEREFORD', 'LIMOUSIN'] as const;
  const baseDate = new Date('2024-01-01');

  console.log('Creating animals and purchase records...\n');

  for (let i = 0; i < 12; i++) {
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
        tagNumber: `UK${String(400000 + i).padStart(6, '0')}`,
        breed,
        sex: 'MALE',
        dateOfBirth: birthDate,
        breederFarmId: testFarm.id,
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
        sourceName: testFarm.name,
        basePrice,
        weightAtPurchase: weight,
        weightAdjustment: weight * 2,
        finalPrice,
        transferDate: purchaseDate,
        transferWeight: weight,
        finisherFarmId: vituloFarm.id,
        notes: 'Test data for dairy portal',
      },
    });

    console.log(`✅ ${animal.tagNumber} - ${breed} - £${finalPrice.toFixed(2)}`);
  }

  // Create payment records
  console.log('\nCreating payment records...\n');

  const farmAnimals = await prisma.animal.findMany({
    where: { breederFarmId: testFarm.id },
    include: { calfPurchase: true },
  });

  // First payment (first 6 animals) - PAID
  const payment1Animals = farmAnimals.slice(0, 6);
  const payment1Total = payment1Animals.reduce(
    (sum, a) => sum + Number(a.calfPurchase?.finalPrice || 0),
    0
  );

  const payment1 = await prisma.payment.create({
    data: {
      farmId: testFarm.id,
      amount: payment1Total,
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-01-31'),
      status: 'PAID',
      method: 'BANK_TRANSFER',
      paidOn: new Date('2024-02-01'),
      reference: 'PAY-JAN-2024',
      notes: 'January 2024 payment',
    },
  });

  for (const animal of payment1Animals) {
    await prisma.animalPayment.create({
      data: {
        animalId: animal.id,
        farmId: testFarm.id,
        paymentId: payment1.id,
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
        amount: Number(animal.calfPurchase?.finalPrice || 0),
      },
    });
  }
  console.log(`✅ Payment 1: £${payment1Total.toFixed(2)} (PAID)`);

  // Second payment (remaining animals) - PENDING
  const payment2Animals = farmAnimals.slice(6);
  const payment2Total = payment2Animals.reduce(
    (sum, a) => sum + Number(a.calfPurchase?.finalPrice || 0),
    0
  );

  const payment2 = await prisma.payment.create({
    data: {
      farmId: testFarm.id,
      amount: payment2Total,
      periodStart: new Date('2024-02-01'),
      periodEnd: new Date('2024-02-29'),
      status: 'PENDING',
      method: 'BANK_TRANSFER',
      reference: 'PAY-FEB-2024',
      notes: 'February 2024 payment - pending',
    },
  });

  for (const animal of payment2Animals) {
    await prisma.animalPayment.create({
      data: {
        animalId: animal.id,
        farmId: testFarm.id,
        paymentId: payment2.id,
        periodStart: new Date('2024-02-01'),
        periodEnd: new Date('2024-02-29'),
        amount: Number(animal.calfPurchase?.finalPrice || 0),
      },
    });
  }
  console.log(`✅ Payment 2: £${payment2Total.toFixed(2)} (PENDING)`);

  // Create some kill records
  console.log('\nCreating kill records...\n');

  const conformations = ['R', 'U', 'O', 'P'];
  const fatClasses = ['2', '3', '4L', '4H'];

  for (let i = 0; i < 4; i++) {
    const animal = farmAnimals[i];
    const killDate = new Date('2024-06-01');
    killDate.setDate(killDate.getDate() + (i * 7));

    const deadweight = 280 + Math.random() * 60;
    const pricePerKg = 4.2 + Math.random() * 0.8;
    const value = deadweight * pricePerKg;

    await prisma.killRecord.create({
      data: {
        animalId: animal.id,
        killDate,
        killNumber: 2000 + i,
        site: 'Test Abattoir',
        lot: `TEST-${i + 1}`,
        conformation: conformations[i % conformations.length],
        fatClass: fatClasses[i % fatClasses.length],
        totalWeight: deadweight,
        value,
        pricePerKg,
      },
    });

    console.log(`✅ ${animal.tagNumber} - ${deadweight.toFixed(1)}kg - £${value.toFixed(2)}`);
  }

  console.log('\n✅ Test data added successfully!');
  console.log('\n📊 Summary:');
  console.log(`   Farm: ${testFarm.name}`);
  console.log(`   Animals: ${farmAnimals.length}`);
  console.log(`   Payments: 2 (1 paid, 1 pending)`);
  console.log(`   Kill Records: 4`);
  console.log(`\n🌐 You can now login at the dairy portal!`);
  console.log(`   Email: dairy@test.com`);
  console.log(`   Password: test123`);
}

addTestAnimals()
  .catch((e) => {
    console.error('❌ Error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
