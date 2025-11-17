import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.farmId || session.user.role !== 'DAIRY_SUPPLIER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const paymentStatus = searchParams.get('paymentStatus');
    const breed = searchParams.get('breed');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    // Query CalfPurchases where the animal's breederFarmId matches the dairy farm
    const calfPurchases = await prisma.calfPurchase.findMany({
      where: {
        animal: {
          breeder_farm_id: session.user.farmId,
          ...(search && {
            tagNumber: {
              contains: search,
              mode: 'insensitive',
            },
          }),
          ...(breed && breed !== 'all' && { breed }),
        },
        ...(startDate || endDate ? {
          purchaseDate: {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate && { lte: new Date(endDate) }),
          },
        } : {}),
      },
      include: {
        animal: true,
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
        purchasePrice: purchase.final_price,
        purchaseDate: purchase.purchaseDate,
        purchaseWeight: purchase.weight_at_purchase,
        paymentStatus: 'PENDING', // Will be updated from payments table
        paymentDate: null,
        invoiceNumber: purchase.source_name,
      },
    }));

    // Calculate summary statistics
    const stats = {
      totalCalves: mappedCalves.length,
      totalValue: mappedCalves.reduce((sum, calf) =>
        sum + Number(calf.calfPurchase.purchasePrice), 0
      ),
      pendingValue: mappedCalves.reduce((sum, calf) =>
        sum + Number(calf.calfPurchase.purchasePrice), 0
      ),
      paidValue: 0, // Will be calculated from payments table
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
