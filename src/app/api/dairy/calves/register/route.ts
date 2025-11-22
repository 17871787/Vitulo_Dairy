import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.farmId || session.user.role !== 'DAIRY_SUPPLIER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tagNumber, breed, sex, dateOfBirth, weight, sireTag } = body;

    if (!tagNumber || !breed || !sex || !dateOfBirth) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Start a transaction to creating animal and calf purchase
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check if animal exists
      let animal = await tx.animal.findUnique({
        where: { tagNumber },
      });

      if (animal) {
        // If animal exists, ensure it's not already "owned" or processed in a way that conflicts
        // For now, we just assume we are updating or linking
        // Ideally, we should check if it is already linked to a purchase
      } else {
        // Create new animal
        animal = await tx.animal.create({
          data: {
            tagNumber,
            breed: breed as any, // Cast to enum
            sex: sex as any,
            dateOfBirth: new Date(dateOfBirth),
            sireTag: sireTag || null,
            monthlyCost: new Prisma.Decimal(0), // Default cost until configured
            currentFarmId: null, // Not on a finisher farm yet
            status: 'ACTIVE',
            sourceType: 'PURCHASE',
            breederFarmId: session.user.farmId, // Link back to this dairy farm
          },
        });
      }

      // 2. Create Calf Purchase record
      // Check if purchase already exists for this animal
      const existingPurchase = await tx.calfPurchase.findUnique({
        where: { animalId: animal.id },
      });

      if (existingPurchase) {
        throw new Error('Calf is already registered as purchased');
      }

      const purchase = await tx.calfPurchase.create({
        data: {
          animalId: animal.id,
          purchaseDate: new Date(), // Today
          sourceType: 'DAIRY_FARM',
          dairyFarmId: session.user.farmId,
          basePrice: new Prisma.Decimal(0), // Price TBD
          finalPrice: new Prisma.Decimal(0),
          weightAtPurchase: weight ? new Prisma.Decimal(weight) : null,
        },
      });

      return { animal, purchase };
    });

    return NextResponse.json({ message: 'Calf registered successfully', data: result });
  } catch (error: any) {
    console.error('Error registering calf:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to register calf' },
      { status: 500 }
    );
  }
}
