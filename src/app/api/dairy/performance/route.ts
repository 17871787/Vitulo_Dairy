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

    // Get all animals with kill records from this farm
    const slaughteredAnimals = await prisma.animal.findMany({
      where: {
        sourceFarmId: session.user.farmId,
        status: 'SLAUGHTERED',
        killRecord: {
          isNot: null,
        },
      },
      include: {
        killRecord: true,
        calfPurchase: {
          select: {
            purchaseDate: true,
            purchaseWeight: true,
            purchasePrice: true,
          },
        },
      },
    });

    // Calculate performance metrics
    const metrics = {
      totalSlaughtered: slaughteredAnimals.length,
      averageDeadweight: 0,
      averageCarcassValue: 0,
      gradeDistribution: {} as Record<string, number>,
      conformationDistribution: {} as Record<string, number>,
      fatClassDistribution: {} as Record<string, number>,
      breedPerformance: {} as Record<string, any>,
      monthlyTrends: [] as any[],
    };

    if (slaughteredAnimals.length > 0) {
      // Calculate averages
      const totalDeadweight = slaughteredAnimals.reduce(
        (sum, animal) => sum + Number(animal.killRecord!.deadweight),
        0
      );
      const totalCarcassValue = slaughteredAnimals.reduce(
        (sum, animal) => sum + Number(animal.killRecord!.carcassValue),
        0
      );

      metrics.averageDeadweight = totalDeadweight / slaughteredAnimals.length;
      metrics.averageCarcassValue = totalCarcassValue / slaughteredAnimals.length;

      // Calculate distributions
      slaughteredAnimals.forEach((animal) => {
        const killRecord = animal.killRecord!;
        const grade = `${killRecord.conformationClass}${killRecord.fatClass}`;
        
        // Grade distribution (e.g., R3, U4)
        metrics.gradeDistribution[grade] = (metrics.gradeDistribution[grade] || 0) + 1;
        
        // Conformation distribution
        metrics.conformationDistribution[killRecord.conformationClass] = 
          (metrics.conformationDistribution[killRecord.conformationClass] || 0) + 1;
        
        // Fat class distribution
        metrics.fatClassDistribution[killRecord.fatClass] = 
          (metrics.fatClassDistribution[killRecord.fatClass] || 0) + 1;
        
        // Breed performance
        if (!metrics.breedPerformance[animal.breed]) {
          metrics.breedPerformance[animal.breed] = {
            count: 0,
            totalDeadweight: 0,
            totalCarcassValue: 0,
            grades: {},
          };
        }
        
        const breedData = metrics.breedPerformance[animal.breed];
        breedData.count += 1;
        breedData.totalDeadweight += Number(killRecord.deadweight);
        breedData.totalCarcassValue += Number(killRecord.carcassValue);
        breedData.grades[grade] = (breedData.grades[grade] || 0) + 1;
      });

      // Calculate breed averages
      Object.keys(metrics.breedPerformance).forEach((breed) => {
        const data = metrics.breedPerformance[breed];
        data.averageDeadweight = data.totalDeadweight / data.count;
        data.averageCarcassValue = data.totalCarcassValue / data.count;
      });

      // Group by month for trends
      const monthlyData: Record<string, any> = {};
      slaughteredAnimals.forEach((animal) => {
        const month = animal.killRecord!.dateOfKill.toISOString().slice(0, 7);
        if (!monthlyData[month]) {
          monthlyData[month] = {
            month,
            count: 0,
            totalDeadweight: 0,
            totalCarcassValue: 0,
          };
        }
        monthlyData[month].count += 1;
        monthlyData[month].totalDeadweight += Number(animal.killRecord!.deadweight);
        monthlyData[month].totalCarcassValue += Number(animal.killRecord!.carcassValue);
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
      animals: slaughteredAnimals,
    });
  } catch (error) {
    console.error('Error fetching performance data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance data' },
      { status: 500 }
    );
  }
}
