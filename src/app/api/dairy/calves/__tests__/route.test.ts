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

describe('GET /api/dairy/calves', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated as dairy supplier', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { role: 'FINISHER' } });
    const req = new NextRequest('http://localhost/api/dairy/calves');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('should return filtered calves', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ 
      user: { role: 'DAIRY_SUPPLIER', farmId: 'farm-1' } 
    });

    const mockCalves = [
      {
        animal: {
          id: 'a1',
          tagNumber: 'UK1',
          breed: 'ANGUS',
          sex: 'MALE',
          dateOfBirth: new Date(),
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        finalPrice: 100,
        purchaseDate: new Date(),
        weightAtPurchase: 50,
        sourceName: 'INV-001'
      }
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.calfPurchase.findMany as jest.Mock).mockResolvedValue(mockCalves as any);

    const req = new NextRequest('http://localhost/api/dairy/calves?search=UK1');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.calves).toHaveLength(1);
    expect(json.calves[0].tagNumber).toBe('UK1');
    // Verify stats calculation
    expect(json.stats.totalCalves).toBe(1);
    expect(json.stats.totalValue).toBe(100);
  });
});