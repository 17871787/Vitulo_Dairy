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

    // Get payments for this dairy farm
    const payments = await prisma.payments.findMany({
      where: {
        farm_id: session.user.farmId,
      },
      include: {
        animal_payments: {
          include: {
            animals: {
              select: {
                tagNumber: true,
                breed: true,
              },
            },
          },
        },
      },
      orderBy: {
        period_end: 'desc',
      },
    });

    // Group payments by month
    const paymentGroups: Record<string, any> = {};

    payments.forEach((payment) => {
      const monthKey = payment.period_end.toISOString().slice(0, 7);

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

      paymentGroups[monthKey].payments.push(payment);
      paymentGroups[monthKey].totalAmount += Number(payment.amount);
      paymentGroups[monthKey].calfCount += payment.animal_payments.length;

      if (payment.status === 'PAID') {
        paymentGroups[monthKey].paidAmount += Number(payment.amount);
      } else {
        paymentGroups[monthKey].pendingAmount += Number(payment.amount);
      }
    });

    // Convert to array and sort by month
    const monthlyPayments = Object.values(paymentGroups).sort(
      (a, b) => b.month.localeCompare(a.month)
    );

    // Calculate summary statistics
    const summary = {
      totalEarned: payments.reduce((sum, p) => sum + Number(p.amount), 0),
      totalPaid: payments
        .filter(p => p.status === 'PAID')
        .reduce((sum, p) => sum + Number(p.amount), 0),
      totalPending: payments
        .filter(p => p.status === 'PENDING')
        .reduce((sum, p) => sum + Number(p.amount), 0),
      totalOverdue: payments
        .filter(p => p.status === 'OVERDUE')
        .reduce((sum, p) => sum + Number(p.amount), 0),
      averagePerCalf: payments.length > 0
        ? payments.reduce((sum, p) => sum + Number(p.amount), 0) /
          payments.reduce((sum, p) => sum + p.animal_payments.length, 0)
        : 0,
      totalCalves: payments.reduce((sum, p) => sum + p.animal_payments.length, 0),
    };

    return NextResponse.json({
      payments: monthlyPayments,
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
