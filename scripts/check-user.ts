import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const prisma = new PrismaClient();

async function checkUser() {
  console.log('🔍 Checking user: dairy@test.com\n');

  const user = await prisma.user.findUnique({
    where: { email: 'dairy@test.com' },
    include: {
      farm: true,
    },
  });

  if (!user) {
    console.log('❌ User not found in database');
    return;
  }

  console.log('✅ User found:');
  console.log('   ID:', user.id);
  console.log('   Email:', user.email);
  console.log('   Name:', user.name);
  console.log('   Role:', user.role);
  console.log('   Farm ID:', user.farmId);
  console.log('   Password Hash:', user.passwordHash ? '✅ Set' : '❌ Not set');

  if (user.farm) {
    console.log('\n✅ Farm found:');
    console.log('   ID:', user.farm.id);
    console.log('   Name:', user.farm.name);
    console.log('   Type:', user.farm.farmType);
  } else {
    console.log('\n❌ Farm not found or not linked');
  }

  // Test password hash
  if (user.passwordHash) {
    const testPassword = 'test123';
    const isValid = await bcrypt.compare(testPassword, user.passwordHash);
    console.log('\n🔐 Password test:');
    console.log('   Testing password: test123');
    console.log('   Result:', isValid ? '✅ Valid' : '❌ Invalid');

    // Also test the hash from the SQL script
    const sqlScriptHash = '$2a$10$K7L1OJ0TfPi8dZ6hXH3d2OQkPqN4Nic9XmB6QoNXkqXkLxR3bqWEa';
    const isSqlHashValid = await bcrypt.compare(testPassword, sqlScriptHash);
    console.log('   SQL script hash valid:', isSqlHashValid ? '✅ Yes' : '❌ No');
  }

  // Check if there are any animals for this farm
  const animalCount = await prisma.animal.count({
    where: { breederFarmId: user.farmId || '' },
  });
  console.log('\n📊 Animals for this farm:', animalCount);
}

checkUser()
  .catch((e) => {
    console.error('❌ Error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
