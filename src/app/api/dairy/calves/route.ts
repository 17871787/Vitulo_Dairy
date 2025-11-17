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
            purchasePrice: true,
            purchaseDate: true,
            purchaseWeight: true,
            paymentStatus: true,
            paymentDate: true,
            invoiceNumber: true,
          },
        },
        killRecord: {
          select: {
            dateOfKill: true,
            deadweight: true,
            conformationClass: true,
            fatClass: true,
            carcassValue: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate summary statistics
    const stats = {
      totalCalves: calves.length,
      totalValue: calves.reduce((sum, calf) => 
        sum + (calf.calfPurchase ? Number(calf.calfPurchase.purchasePrice) : 0), 0
      ),
      pendingValue: calves
        .filter(c => c.calfPurchase?.paymentStatus === 'PENDING')
        .reduce((sum, calf) => sum + Number(calf.calfPurchase!.purchasePrice), 0),
      paidValue: calves
        .filter(c => c.calfPurchase?.paymentStatus === 'PAID')
        .reduce((sum, calf) => sum + Number(calf.calfPurchase!.purchasePrice), 0),
    };

    return NextResponse.json({ calves, stats });
  } catch (error) {
    console.error('Error fetching calves:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calves' },
      { status: 500 }
    );
  }
}
