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

    // Build where clause
    const where: any = {
      sourceFarmId: session.user.farmId,
    };

    // Apply filters
    if (search) {
      where.tagNumber = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (breed && breed !== 'all') {
      where.breed = breed;
    }

    if (startDate || endDate) {
      where.calfPurchase = {
        purchaseDate: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      };
    }

    if (paymentStatus && paymentStatus !== 'all') {
      if (!where.calfPurchase) where.calfPurchase = {};
      where.calfPurchase.paymentStatus = paymentStatus;
    }

    const calves = await prisma.animal.findMany({
      where,
      include: {
        calfPurchase: {
          select: {
            final_price: true,
            purchaseDate: true,
            weight_at_purchase: true,
            source_name: true,
            notes: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Map the results to match expected format
    const mappedCalves = calves.map(calf => ({
      ...calf,
      calfPurchase: calf.calfPurchase ? {
        purchasePrice: calf.calfPurchase.final_price,
        purchaseDate: calf.calfPurchase.purchaseDate,
        purchaseWeight: calf.calfPurchase.weight_at_purchase,
        paymentStatus: 'PENDING', // Default - update based on your payment tracking logic
        paymentDate: null,
        invoiceNumber: calf.calfPurchase.source_name,
      } : null
    }));

    // Calculate summary statistics
    const stats = {
      totalCalves: mappedCalves.length,
      totalValue: mappedCalves.reduce((sum, calf) =>
        sum + (calf.calfPurchase ? Number(calf.calfPurchase.purchasePrice) : 0), 0
      ),
      pendingValue: mappedCalves.reduce((sum, calf) =>
        sum + (calf.calfPurchase ? Number(calf.calfPurchase.purchasePrice) : 0), 0
      ),
      paidValue: 0, // Update based on your payment tracking logic
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
