import { GET } from '../route';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    calfPurchase: {
      findMany: jest.fn(),
    },
  },
}));

describe('GET /api/dairy/payments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return grouped payments', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ 
      user: { role: 'DAIRY_SUPPLIER', farmId: 'farm-1' } 
    });

    const mockPurchases = [
      {
        id: 'p1',
        purchaseDate: new Date('2023-01-15'),
        finalPrice: 100,
        animal: { tagNumber: 'UK1' }
      },
      {
        id: 'p2',
        purchaseDate: new Date('2023-01-20'),
        finalPrice: 200,
        animal: { tagNumber: 'UK2' }
      }
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.calfPurchase.findMany as jest.Mock).mockResolvedValue(mockPurchases as any);

    const req = new NextRequest('http://localhost/api/dairy/payments');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    // Should group into 1 month
    expect(json.payments).toHaveLength(1);
    expect(json.payments[0].month).toBe('2023-01');
    expect(json.payments[0].totalAmount).toBe(300);
    
    expect(json.summary.totalEarned).toBe(300);
    expect(json.summary.totalCalves).toBe(2);
  });
});