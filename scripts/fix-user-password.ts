import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const prisma = new PrismaClient();

async function fixPassword() {
  console.log('🔧 Fixing password for dairy@test.com\n');

  const password = 'test123';
  const passwordHash = await bcrypt.hash(password, 10);

  console.log('Generated new password hash for: test123');
  console.log('Hash:', passwordHash);

  const user = await prisma.user.update({
    where: { email: 'dairy@test.com' },
    data: {
      passwordHash,
    },
  });

  console.log('\n✅ Password updated successfully!');
  console.log('   User:', user.email);
  console.log('   Role:', user.role);

  // Verify it works
  const isValid = await bcrypt.compare(password, passwordHash);
  console.log('\n🔐 Verification:');
  console.log('   Password test:', isValid ? '✅ Valid' : '❌ Invalid');

  console.log('\n📝 Login credentials:');
  console.log('   Email: dairy@test.com');
  console.log('   Password: test123');
}

fixPassword()
  .catch((e) => {
    console.error('❌ Error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
