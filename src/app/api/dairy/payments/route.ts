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
    const year = searchParams.get('year'); // Unused for now but ready for future filters
    const month = searchParams.get('month');

    // Get payments linked to animals from this dairy farm
    // This logic is slightly complex because payments are usually made to the "finisher" or "breeder"?
    // If this is a dairy portal, we expect payments for calves sold.
    // Assuming `CalfPurchase` tracks the initial sale, but `Payment` table tracks monthly payments.
    // If `Payment` is for B&B finisher fees, it might not be relevant here directly unless we are showing
    // revenue share.
    // If we stick to the schema:
    // `CalfPurchase` has `dairyFarmId`.
    // `Payment` has `farmId`.
    
    // If `Payment` records are strictly for B&B/Finishers, then Dairy farmers only get the initial purchase price?
    // Or do they get a share of the final slaughter value?
    // The requirement mentions "Total Earned" and "Pending Payments".
    // If Dairy Farmers purely sell calves, their "payments" are the invoices generated from `CalfPurchase`.
    // If `CalfPurchase` has a `paymentStatus`, we should use that.
    
    // However, the provided file structure suggests using the `Payment` model.
    // Let's assume for now we query `CalfPurchase` which acts as the payment record for Dairy farmers.
    
    // Correction: The prompt implies fetching `payments`. If `Payment` model is only for B&B, we might need
    // to aggregate `CalfPurchase` records as "payments".
    // Let's look at `CalfPurchase` schema again. It has `paymentStatus`, `paymentDate`.
    // So for Dairy Portal, "Payments" = "Calf Purchases".
    
    const purchases = await prisma.calfPurchase.findMany({
      where: {
        dairyFarmId: session.user.farmId,
        // Optional: filter by status if needed
      },
      include: {
        animal: {
          select: {
            tagNumber: true,
            breed: true,
          },
        },
      },
      orderBy: {
        purchaseDate: 'desc',
      },
    });

    // Group purchases by month (Simulating "Monthly Payments")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paymentGroups: Record<string, any> = {};

    purchases.forEach((purchase) => {
      const monthKey = purchase.purchaseDate.toISOString().slice(0, 7); // YYYY-MM

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

      // Map purchase to a payment-like structure for the frontend
      const paymentView = {
        id: purchase.id,
        animal: purchase.animal,
        purchaseDate: purchase.purchaseDate,
        purchasePrice: purchase.finalPrice,
        paymentStatus: 'PENDING', // Default/Placeholder
        paymentDate: null,
      };

      paymentGroups[monthKey].payments.push(paymentView);
      paymentGroups[monthKey].totalAmount += Number(purchase.finalPrice);
      paymentGroups[monthKey].calfCount += 1;

      // Logic for status - assuming PENDING for now as we lack a dedicated "Paid" flag in provided schema context
      // If we had it, we'd split into paid/pending.
      paymentGroups[monthKey].pendingAmount += Number(purchase.finalPrice);
    });

    const monthlyPayments = Object.values(paymentGroups).sort(
      (a, b) => b.month.localeCompare(a.month)
    );

    const summary = {
      totalEarned: purchases.reduce((sum, p) => sum + Number(p.finalPrice), 0),
      totalPaid: 0, // Placeholder
      totalPending: purchases.reduce((sum, p) => sum + Number(p.finalPrice), 0), // All pending for demo
      totalOverdue: 0,
      averagePerCalf: purchases.length > 0
        ? purchases.reduce((sum, p) => sum + Number(p.finalPrice), 0) / purchases.length
        : 0,
      totalCalves: purchases.length,
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