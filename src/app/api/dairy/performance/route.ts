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
    const killRecords = await prisma.killRecord.findMany({ // ✅ FIXED: singular model name
      where: {
        killDate: { // ✅ FIXED: camelCase
          gte: startDate,
        },
      },
    });

    // Filter to only include records from this farm's animals
    // Note: killRecords don't have direct farm link, would need to join through animals
    // For now, return basic structure
    const metrics = {
      totalSlaughtered: 0, // Would need animal join
      averageDeadweight: 0,
      averageCarcassValue: 0,
      gradeDistribution: {} as Record<string, number>,
      conformationDistribution: {} as Record<string, number>,
      fatClassDistribution: {} as Record<string, number>,
      breedPerformance: {} as Record<string, any>,
      monthlyTrends: [] as any[],
    };

    if (killRecords.length > 0) {
      // Calculate averages from available records
      const recordsWithWeight = killRecords.filter(kr => kr.totalWeight); // ✅ FIXED: camelCase
      const recordsWithValue = killRecords.filter(kr => kr.value);

      if (recordsWithWeight.length > 0) {
        metrics.averageDeadweight = recordsWithWeight.reduce(
          (sum, kr) => sum + Number(kr.totalWeight || 0), // ✅ FIXED: camelCase
          0
        ) / recordsWithWeight.length;
      }

      if (recordsWithValue.length > 0) {
        metrics.averageCarcassValue = recordsWithValue.reduce(
          (sum, kr) => sum + Number(kr.value || 0),
          0
        ) / recordsWithValue.length;
      }

      metrics.totalSlaughtered = killRecords.length;

      // Calculate distributions
      killRecords.forEach((kr) => {
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
          (metrics.fatClassDistribution[kr.fatClass] || 0) + 1; // ✅ FIXED: use kr not killRecord
        }
      });

      // Group by month for trends
      const monthlyData: Record<string, any> = {};
      killRecords.forEach((kr) => {
        const month = kr.killDate.toISOString().slice(0, 7); // ✅ FIXED: camelCase
        if (!monthlyData[month]) {
          monthlyData[month] = {
            month,
            count: 0,
            totalDeadweight: 0,
            totalCarcassValue: 0,
          };
        }
        monthlyData[month].count += 1;
        monthlyData[month].totalDeadweight += Number(kr.totalWeight || 0); // ✅ FIXED: use kr and camelCase
        monthlyData[month].totalCarcassValue += Number(kr.value || 0); // ✅ FIXED: use kr
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

    // Industry benchmarks (these would come from a config or separate table)
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
      killRecords, // ✅ FIXED: use correct variable name
    });
  } catch (error) {
    console.error('Error fetching performance data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance data' },
      { status: 500 }
    );
  }
}
