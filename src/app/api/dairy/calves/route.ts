import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.farmId || session.user.role !== 'DAIRY_SUPPLIER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const paymentStatus = searchParams.get('paymentStatus'); // Note: Currently not filtering by this in DB query as payment status is derived or needs relation
    const breed = searchParams.get('breed');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    // Build filter object
    const whereClause: Prisma.CalfPurchaseWhereInput = {
      dairyFarmId: session.user.farmId, // Filter by current user's farm
    };

    // Animal filters
    const animalFilter: Prisma.AnimalWhereInput = {};
    if (search) {
      animalFilter.tagNumber = {
        contains: search,
        mode: 'insensitive',
      };
    }
    if (breed && breed !== 'all') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      animalFilter.breed = breed as any;
    }
    if (Object.keys(animalFilter).length > 0) {
      whereClause.animal = animalFilter;
    }

    // Date filter
    if (startDate || endDate) {
      whereClause.purchaseDate = {};
      if (startDate) whereClause.purchaseDate.gte = new Date(startDate);
      if (endDate) whereClause.purchaseDate.lte = new Date(endDate);
    }

    // Query CalfPurchases
    const calfPurchases = await prisma.calfPurchase.findMany({
      where: whereClause,
      include: {
        animal: true,
        // Ideally join with payments if relation existed
      },
      orderBy: {
        purchaseDate: 'desc',
      },
    });

    // Map the results to match expected frontend format
    const mappedCalves = calfPurchases.map(purchase => ({
      id: purchase.animal.id,
      tagNumber: purchase.animal.tagNumber,
      breed: purchase.animal.breed,
      sex: purchase.animal.sex,
      dateOfBirth: purchase.animal.dateOfBirth,
      status: purchase.animal.status,
      createdAt: purchase.animal.createdAt,
      updatedAt: purchase.animal.updatedAt,
      calfPurchase: {
        purchasePrice: purchase.finalPrice,
        purchaseDate: purchase.purchaseDate,
        purchaseWeight: purchase.weightAtPurchase,
        paymentStatus: 'PENDING', // Placeholder until payment linking logic is complete
        paymentDate: null,
        invoiceNumber: purchase.sourceName, 
      },
      // Placeholder for kill record until fully linked
      killRecord: null 
    }));

    // Calculate summary statistics
    const stats = {
      totalCalves: mappedCalves.length,
      totalValue: mappedCalves.reduce((sum, calf) =>
        sum + Number(calf.calfPurchase.purchasePrice || 0), 0
      ),
      pendingValue: mappedCalves.reduce((sum, calf) =>
        sum + Number(calf.calfPurchase.purchasePrice || 0), 0
      ),
      paidValue: 0, 
    };

    return NextResponse.json({ calves: mappedCalves, stats });
  } catch (error) {
    console.error('Error fetching calves:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calves' },
      { status: 500 }
    );
  }
}