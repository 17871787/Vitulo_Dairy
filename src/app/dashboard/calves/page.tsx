'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Search, 
  Filter, 
  Download, 
  Loader2,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { 
  formatCurrency, 
  formatDate, 
  formatWeight,
  formatBreed,
  formatSex,
  getPaymentStatusColor,
  getAnimalStatusColor 
} from '@/lib/utils';

type SortField = 'tagNumber' | 'breed' | 'dateOfBirth' | 'purchaseDate' | 'purchasePrice' | 'paymentStatus';
type SortOrder = 'asc' | 'desc';

interface CalfData {
  id: string;
  tagNumber: string;
  breed: string;
  sex: string;
  dateOfBirth: string;
  status: string;
  calfPurchase: {
    purchasePrice: string;
    purchaseDate: string;
    purchaseWeight: string | null;
    paymentStatus: string | null;
    paymentDate: string | null;
    invoiceNumber: string | null;
  } | null;
  killRecord: {
    dateOfKill: string;
    deadweight: string;
    conformationClass: string;
    fatClass: string;
    carcassValue: string;
  } | null;
}

export default function CalvesPage() {
  const [calves, setCalves] = useState<CalfData[]>([]);
  const [filteredCalves, setFilteredCalves] = useState<CalfData[]>([]);
  const [stats, setStats] = useState({
    totalCalves: 0,
    totalValue: 0,
    pendingValue: 0,
    paidValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [breedFilter, setBreedFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('purchaseDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchCalves();
  }, []);

  useEffect(() => {
    filterAndSortCalves();
  }, [calves, searchTerm, paymentFilter, breedFilter, sortField, sortOrder]);

  const fetchCalves = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dairy/calves');
      if (!response.ok) throw new Error('Failed to fetch calves');
      const data = await response.json();
      setCalves(data.calves);
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching calves:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortCalves = () => {
    let filtered = [...calves];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(calf =>
        calf.tagNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply payment status filter
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(calf =>
        calf.calfPurchase?.paymentStatus === paymentFilter
      );
    }

    // Apply breed filter
    if (breedFilter !== 'all') {
      filtered = filtered.filter(calf => calf.breed === breedFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'tagNumber':
          aValue = a.tagNumber;
          bValue = b.tagNumber;
          break;
        case 'breed':
          aValue = a.breed;
          bValue = b.breed;
          break;
        case 'dateOfBirth':
          aValue = new Date(a.dateOfBirth).getTime();
          bValue = new Date(b.dateOfBirth).getTime();
          break;
        case 'purchaseDate':
          aValue = a.calfPurchase ? new Date(a.calfPurchase.purchaseDate).getTime() : 0;
          bValue = b.calfPurchase ? new Date(b.calfPurchase.purchaseDate).getTime() : 0;
          break;
        case 'purchasePrice':
          aValue = a.calfPurchase ? parseFloat(a.calfPurchase.purchasePrice) : 0;
          bValue = b.calfPurchase ? parseFloat(b.calfPurchase.purchasePrice) : 0;
          break;
        case 'paymentStatus':
          aValue = a.calfPurchase?.paymentStatus || '';
          bValue = b.calfPurchase?.paymentStatus || '';
          break;
        default:
          aValue = '';
          bValue = '';
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredCalves(filtered);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? 
      <ChevronUp className="h-4 w-4 inline ml-1" /> : 
      <ChevronDown className="h-4 w-4 inline ml-1" />;
  };

  // Get unique breeds for filter
  const breeds = Array.from(new Set(calves.map(c => c.breed)));

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
          <h1 className="text-3xl font-bold text-gray-900">Calves Sold</h1>
          <p className="text-gray-600 mt-1">
            View all calves sold to Vitulo
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-gray-600">Total Calves</div>
            <div className="text-2xl font-bold mt-1">{stats.totalCalves}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-gray-600">Total Value</div>
            <div className="text-2xl font-bold mt-1">{formatCurrency(stats.totalValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-gray-600">Paid</div>
            <div className="text-2xl font-bold text-green-600 mt-1">
              {formatCurrency(stats.paidValue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-gray-600">Pending</div>
            <div className="text-2xl font-bold text-yellow-600 mt-1">
              {formatCurrency(stats.pendingValue)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filter & Search</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <Label htmlFor="search">Search by Tag</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Enter tag number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="payment-status">Payment Status</Label>
                <select
                  id="payment-status"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="PAID">Paid</option>
                  <option value="PENDING">Pending</option>
                  <option value="OVERDUE">Overdue</option>
                </select>
              </div>
              <div>
                <Label htmlFor="breed">Breed</Label>
                <select
                  id="breed"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={breedFilter}
                  onChange={(e) => setBreedFilter(e.target.value)}
                >
                  <option value="all">All Breeds</option>
                  {breeds.map(breed => (
                    <option key={breed} value={breed}>
                      {formatBreed(breed)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setPaymentFilter('all');
                    setBreedFilter('all');
                  }}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Calves Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('tagNumber')}
                  >
                    Tag Number <SortIcon field="tagNumber" />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('breed')}
                  >
                    Breed <SortIcon field="breed" />
                  </TableHead>
                  <TableHead>Sex</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('dateOfBirth')}
                  >
                    DOB <SortIcon field="dateOfBirth" />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('purchaseDate')}
                  >
                    Sold Date <SortIcon field="purchaseDate" />
                  </TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('purchasePrice')}
                  >
                    Price <SortIcon field="purchasePrice" />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('paymentStatus')}
                  >
                    Payment <SortIcon field="paymentStatus" />
                  </TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCalves.length > 0 ? (
                  filteredCalves.map((calf) => (
                    <TableRow key={calf.id}>
                      <TableCell className="font-medium">
                        {calf.tagNumber}
                      </TableCell>
                      <TableCell>{formatBreed(calf.breed)}</TableCell>
                      <TableCell>{formatSex(calf.sex)}</TableCell>
                      <TableCell>{formatDate(calf.dateOfBirth)}</TableCell>
                      <TableCell>
                        {calf.calfPurchase ? formatDate(calf.calfPurchase.purchaseDate) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {calf.calfPurchase ? formatWeight(calf.calfPurchase.purchaseWeight) : 'N/A'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {calf.calfPurchase ? formatCurrency(calf.calfPurchase.purchasePrice) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge className={getPaymentStatusColor(calf.calfPurchase?.paymentStatus)}>
                          {calf.calfPurchase?.paymentStatus || 'PENDING'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getAnimalStatusColor(calf.status)}>
                          {calf.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No calves found matching your filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}