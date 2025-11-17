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
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    // Build where clause
    const where: any = {
      sourceFarmId: session.user.farmId,
    };

    // Apply date filters if provided
    if (year || month) {
      const startDate = new Date(
        parseInt(year || new Date().getFullYear().toString()),
        month ? parseInt(month) - 1 : 0,
        1
      );
      const endDate = new Date(
        parseInt(year || new Date().getFullYear().toString()),
        month ? parseInt(month) : 12,
        0
      );

      where.purchaseDate = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Get all purchases for this dairy farm
    const purchases = await prisma.calfPurchase.findMany({
      where,
      include: {
        animal: {
          select: {
            tagNumber: true,
            breed: true,
            sex: true,
            dateOfBirth: true,
            status: true,
          },
        },
      },
      orderBy: {
        purchaseDate: 'desc',
      },
    });

    // Group payments by month and payment status
    const paymentGroups: Record<string, any> = {};
    
    purchases.forEach((purchase) => {
      const monthKey = purchase.paymentDate 
        ? purchase.paymentDate.toISOString().slice(0, 7)
        : purchase.purchaseDate.toISOString().slice(0, 7);
      
      if (!paymentGroups[monthKey]) {
        paymentGroups[monthKey] = {
          month: monthKey,
          payments: [],
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          calfCount: 0,
        };
      }
      
      paymentGroups[monthKey].payments.push(purchase);
      paymentGroups[monthKey].totalAmount += Number(purchase.purchasePrice);
      paymentGroups[monthKey].calfCount += 1;
      
      if (purchase.paymentStatus === 'PAID') {
        paymentGroups[monthKey].paidAmount += Number(purchase.purchasePrice);
      } else {
        paymentGroups[monthKey].pendingAmount += Number(purchase.purchasePrice);
      }
    });

    // Convert to array and sort by month
    const monthlyPayments = Object.values(paymentGroups).sort(
      (a, b) => b.month.localeCompare(a.month)
    );

    // Calculate summary statistics
    const summary = {
      totalEarned: purchases.reduce((sum, p) => sum + Number(p.purchasePrice), 0),
      totalPaid: purchases
        .filter(p => p.paymentStatus === 'PAID')
        .reduce((sum, p) => sum + Number(p.purchasePrice), 0),
      totalPending: purchases
        .filter(p => p.paymentStatus === 'PENDING')
        .reduce((sum, p) => sum + Number(p.purchasePrice), 0),
      totalOverdue: purchases
        .filter(p => {
          if (p.paymentStatus !== 'PENDING') return false;
          const daysSincePurchase = Math.floor(
            (new Date().getTime() - p.purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          return daysSincePurchase > 30;
        })
        .reduce((sum, p) => sum + Number(p.purchasePrice), 0),
      averagePerCalf: purchases.length > 0 
        ? purchases.reduce((sum, p) => sum + Number(p.purchasePrice), 0) / purchases.length
        : 0,
      totalCalves: purchases.length,
    };

    return NextResponse.json({
      payments: monthlyPayments,
      purchases,
      summary,
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}
