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
    const period = searchParams.get('period') || '12'; // months

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(period));

    // Get kill records for animals from this dairy farm
    // Use correct related filter: `animal: { breederFarmId: ... }`
    const killRecords = await prisma.killRecord.findMany({
      where: {
        killDate: {
          gte: startDate,
        },
        animal: {
          breederFarmId: session.user.farmId,
        },
      },
      include: {
        animal: {
          select: {
            breed: true,
            sex: true,
          }
        }
      }
    });

    const metrics = {
      totalSlaughtered: killRecords.length,
      averageDeadweight: 0,
      averageCarcassValue: 0,
      gradeDistribution: {} as Record<string, number>,
      conformationDistribution: {} as Record<string, number>,
      fatClassDistribution: {} as Record<string, number>,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      breedPerformance: {} as Record<string, any>,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      monthlyTrends: [] as any[],
    };

    if (killRecords.length > 0) {
      // Calculate averages from available records
      const recordsWithWeight = killRecords.filter(kr => kr.totalWeight);
      const recordsWithValue = killRecords.filter(kr => kr.value);

      if (recordsWithWeight.length > 0) {
        metrics.averageDeadweight = recordsWithWeight.reduce(
          (sum, kr) => sum + Number(kr.totalWeight || 0),
          0
        ) / recordsWithWeight.length;
      }

      if (recordsWithValue.length > 0) {
        metrics.averageCarcassValue = recordsWithValue.reduce(
          (sum, kr) => sum + Number(kr.value || 0),
          0
        ) / recordsWithValue.length;
      }

      // Calculate distributions and breed performance
      killRecords.forEach((kr) => {
        // Grade Distribution
        if (kr.conformation && kr.fatClass) {
          const grade = `${kr.conformation}${kr.fatClass}`;
          metrics.gradeDistribution[grade] = (metrics.gradeDistribution[grade] || 0) + 1;
        }

        if (kr.conformation) {
          metrics.conformationDistribution[kr.conformation] =
            (metrics.conformationDistribution[kr.conformation] || 0) + 1;
        }

        if (kr.fatClass) {
          metrics.fatClassDistribution[kr.fatClass] =
          (metrics.fatClassDistribution[kr.fatClass] || 0) + 1;
        }

        // Breed Performance
        const breed = kr.animal?.breed || 'Unknown';
        if (!metrics.breedPerformance[breed]) {
          metrics.breedPerformance[breed] = {
            breed,
            count: 0,
            totalDeadweight: 0,
            totalValue: 0,
          };
        }
        const bp = metrics.breedPerformance[breed];
        bp.count += 1;
        bp.totalDeadweight += Number(kr.totalWeight || 0);
        bp.totalValue += Number(kr.value || 0);
      });

      // Finalize breed performance averages
      Object.values(metrics.breedPerformance).forEach((bp) => {
        bp.averageDeadweight = bp.totalDeadweight / bp.count;
        bp.averageValue = bp.totalValue / bp.count;
      });

      // Group by month for trends
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const monthlyData: Record<string, any> = {};
      killRecords.forEach((kr) => {
        const month = kr.killDate.toISOString().slice(0, 7);
        if (!monthlyData[month]) {
          monthlyData[month] = {
            month,
            count: 0,
            totalDeadweight: 0,
            totalCarcassValue: 0,
          };
        }
        monthlyData[month].count += 1;
        monthlyData[month].totalDeadweight += Number(kr.totalWeight || 0);
        monthlyData[month].totalCarcassValue += Number(kr.value || 0);
      });

      // Convert to array and calculate averages
      metrics.monthlyTrends = Object.values(monthlyData)
        .map((data) => ({
          ...data,
          averageDeadweight: data.totalDeadweight / data.count,
          averageCarcassValue: data.totalCarcassValue / data.count,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));
    }

    // Industry benchmarks (placeholder for demo)
    const benchmarks = {
      deadweight: 320, // kg
      topGradePercentage: 25, // % achieving R3 or better
      averageCarcassValue: 1250, // £
    };

    // Calculate comparison to benchmarks
    const comparison = {
      deadweightDiff: metrics.averageDeadweight - benchmarks.deadweight,
      deadweightPercent: ((metrics.averageDeadweight - benchmarks.deadweight) / benchmarks.deadweight) * 100,
      carcassValueDiff: metrics.averageCarcassValue - benchmarks.averageCarcassValue,
      carcassValuePercent: ((metrics.averageCarcassValue - benchmarks.averageCarcassValue) / benchmarks.averageCarcassValue) * 100,
    };

    return NextResponse.json({
      metrics,
      benchmarks,
      comparison,
      killRecords: killRecords.slice(0, 100), // Limit for performance
    });
  } catch (error) {
    console.error('Error fetching performance data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance data' },
      { status: 500 }
    );
  }
}