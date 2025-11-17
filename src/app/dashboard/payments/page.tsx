'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Calendar,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  FileText
} from 'lucide-react';
import { formatCurrency, formatDate, getPaymentStatusColor } from '@/lib/utils';

interface PaymentData {
  month: string;
  payments: any[];
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  calfCount: number;
}

interface PaymentSummary {
  totalEarned: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  averagePerCalf: number;
  totalCalves: number;
}

export default function PaymentsPage() {
  const [monthlyPayments, setMonthlyPayments] = useState<PaymentData[]>([]);
  const [summary, setSummary] = useState<PaymentSummary>({
    totalEarned: 0,
    totalPaid: 0,
    totalPending: 0,
    totalOverdue: 0,
    averagePerCalf: 0,
    totalCalves: 0,
  });
  const [loading, setLoading] = useState(true);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dairy/payments');
      if (!response.ok) throw new Error('Failed to fetch payments');
      const data = await response.json();
      setMonthlyPayments(data.payments);
      setSummary(data.summary);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMonth = (month: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(month)) {
      newExpanded.delete(month);
    } else {
      newExpanded.add(month);
    }
    setExpandedMonths(newExpanded);
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment History</h1>
          <p className="text-gray-600 mt-1">
            Track your payments from Vitulo
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Invoices
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div className="text-sm font-medium text-gray-600">Total Earned</div>
            </div>
            <div className="text-2xl font-bold mt-2">
              {formatCurrency(summary.totalEarned)}
            </div>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="text-sm font-medium text-gray-600">Paid</div>
            </div>
            <div className="text-2xl font-bold text-green-600 mt-2">
              {formatCurrency(summary.totalPaid)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Received</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div className="text-sm font-medium text-gray-600">Pending</div>
            </div>
            <div className="text-2xl font-bold text-yellow-600 mt-2">
              {formatCurrency(summary.totalPending)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <div className="text-sm font-medium text-gray-600">Overdue</div>
            </div>
            <div className="text-2xl font-bold text-red-600 mt-2">
              {formatCurrency(summary.totalOverdue)}
            </div>
            <p className="text-xs text-gray-500 mt-1">&gt; 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <div className="text-sm font-medium text-gray-600">Avg per Calf</div>
            </div>
            <div className="text-2xl font-bold mt-2">
              {formatCurrency(summary.averagePerCalf)}
            </div>
            <p className="text-xs text-gray-500 mt-1">{summary.totalCalves} total</p>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Payments Alert */}
      {summary.totalPending > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <CardTitle className="text-yellow-900">Outstanding Payments</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-800">
              You have {formatCurrency(summary.totalPending)} in pending payments.
              {summary.totalOverdue > 0 && (
                <span className="font-medium">
                  {' '}Including {formatCurrency(summary.totalOverdue)} overdue.
                </span>
              )}
            </p>
            <p className="text-sm text-yellow-700 mt-2">
              Payment terms are typically 30 days from purchase date. 
              Contact Vitulo accounts if you have any queries.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Payment History by Month */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History by Month</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyPayments.length > 0 ? (
            <div className="space-y-4">
              {monthlyPayments.map((monthData) => (
                <div key={monthData.month} className="border rounded-lg">
                  <button
                    onClick={() => toggleMonth(monthData.month)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <Calendar className="h-5 w-5 text-gray-500" />
                      <div className="text-left">
                        <p className="font-medium text-gray-900">
                          {formatMonth(monthData.month)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {monthData.calfCount} calves
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          {formatCurrency(monthData.totalAmount)}
                        </p>
                        <div className="flex space-x-2 mt-1">
                          {monthData.paidAmount > 0 && (
                            <Badge className="bg-green-100 text-green-800">
                              Paid: {formatCurrency(monthData.paidAmount)}
                            </Badge>
                          )}
                          {monthData.pendingAmount > 0 && (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              Pending: {formatCurrency(monthData.pendingAmount)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>

                  {expandedMonths.has(monthData.month) && (
                    <div className="border-t px-4 py-3 bg-gray-50">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tag Number</TableHead>
                            <TableHead>Purchase Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Payment Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {monthData.payments.map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell className="font-medium">
                                {payment.animal.tagNumber}
                              </TableCell>
                              <TableCell>
                                {formatDate(payment.purchaseDate)}
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatCurrency(payment.purchasePrice)}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  className={getPaymentStatusColor(payment.paymentStatus)}
                                >
                                  {payment.paymentStatus || 'PENDING'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {payment.paymentDate 
                                  ? formatDate(payment.paymentDate)
                                  : 'Awaiting payment'
                                }
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No payment history available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
