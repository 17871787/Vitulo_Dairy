import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import SummaryCard from '@/components/dashboard/SummaryCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Cow, 
  PoundSterling, 
  Clock, 
  TrendingUp,
  Calendar,
  Truck,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { formatCurrency, formatDate, getPaymentStatusColor } from '@/lib/utils';

async function getDashboardData(farmId: string) {
  // Get total calves sold
  const totalCalves = await prisma.animal.count({
    where: {
      sourceFarmId: farmId,
    },
  });

  // Get all purchases for financial calculations
  const purchases = await prisma.calfPurchase.findMany({
    where: {
      sourceFarmId: farmId,
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
    take: 10, // Last 10 for recent activity
  });

  // Calculate financial totals
  const allPurchases = await prisma.calfPurchase.findMany({
    where: { sourceFarmId: farmId },
  });

  const totalEarned = allPurchases.reduce(
    (sum, p) => sum + Number(p.purchasePrice), 
    0
  );
  
  const pendingPayments = allPurchases
    .filter(p => p.paymentStatus === 'PENDING')
    .reduce((sum, p) => sum + Number(p.purchasePrice), 0);

  // Get this month's calves
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const thisMonthCalves = await prisma.animal.count({
    where: {
      sourceFarmId: farmId,
      calfPurchase: {
        purchaseDate: {
          gte: startOfMonth,
        },
      },
    },
  });

  // Calculate month-over-month change
  const startOfLastMonth = new Date(startOfMonth);
  startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
  
  const lastMonthCalves = await prisma.animal.count({
    where: {
      sourceFarmId: farmId,
      calfPurchase: {
        purchaseDate: {
          gte: startOfLastMonth,
          lt: startOfMonth,
        },
      },
    },
  });

  const monthChange = lastMonthCalves > 0 
    ? ((thisMonthCalves - lastMonthCalves) / lastMonthCalves) * 100 
    : 0;

  return {
    totalCalves,
    totalEarned,
    pendingPayments,
    thisMonthCalves,
    monthChange,
    recentPurchases: purchases,
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.farmId) {
    return <div>No farm associated with this account</div>;
  }

  const data = await getDashboardData(session.user.farmId);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {session.user.farmName}
        </h1>
        <p className="text-gray-600 mt-1">
          Here's an overview of your calf sales and payments
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Calves Sold"
          value={data.totalCalves}
          description="All time"
          icon={Cow}
        />
        <SummaryCard
          title="Total Earned"
          value={formatCurrency(data.totalEarned)}
          description="All time revenue"
          icon={PoundSterling}
        />
        <SummaryCard
          title="Pending Payments"
          value={formatCurrency(data.pendingPayments)}
          description="Awaiting payment"
          icon={Clock}
        />
        <SummaryCard
          title="This Month"
          value={data.thisMonthCalves}
          description="Calves sold"
          icon={TrendingUp}
          trend={{
            value: Math.abs(data.monthChange),
            isPositive: data.monthChange >= 0,
          }}
        />
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.recentPurchases.length > 0 ? (
              data.recentPurchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div className="flex items-center space-x-4">
                    <div className="bg-green-100 p-2 rounded-lg">
                      {purchase.paymentStatus === 'PAID' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {purchase.animal.tagNumber}
                      </p>
                      <p className="text-sm text-gray-600">
                        {purchase.animal.breed} • Sold {formatDate(purchase.purchaseDate)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {formatCurrency(purchase.purchasePrice)}
                    </p>
                    <Badge 
                      className={`mt-1 ${getPaymentStatusColor(purchase.paymentStatus)}`}
                    >
                      {purchase.paymentStatus || 'PENDING'}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">
                No recent activity to display
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="flex items-center space-x-4 p-6">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Cow className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-medium">View All Calves</p>
              <p className="text-sm text-gray-600">
                See complete history
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="flex items-center space-x-4 p-6">
            <div className="bg-green-100 p-3 rounded-lg">
              <PoundSterling className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="font-medium">Payment History</p>
              <p className="text-sm text-gray-600">
                Track all payments
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="flex items-center space-x-4 p-6">
            <div className="bg-purple-100 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="font-medium">Performance</p>
              <p className="text-sm text-gray-600">
                See calf outcomes
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
